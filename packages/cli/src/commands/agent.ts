import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { requireProject, getDb, config } from "../config.js";
import { getUsagePercent, getTodayUsage } from "../usage.js";
import {
  listSpilloverIssues,
  addIssueComment,
  addLabels,
  removeLabel,
} from "../github.js";

export async function agentCommand(_options: { daemon?: boolean }) {
  console.log();
  console.log(
    chalk.cyan("  \ud83d\udca7 spillover agent") + chalk.dim(" \u2014 listening for issues"),
  );
  console.log();

  const { projectId, userId } = requireProject();
  const githubHandle = (config.get("github_handle") as string) || userId;
  const sql = getDb();

  // Verify GitHub token exists
  const ghToken = config.get("github_token") as string;
  if (!ghToken) {
    console.error(
      chalk.red("  No GitHub token. Run: spillover login"),
    );
    process.exit(1);
  }

  // Report initial usage
  await reportUsage(sql, userId);

  // Track known repos to log new additions
  let knownRepos = new Set<string>();

  console.log(
    chalk.dim(
      '  Label a GitHub issue with "spillover" to queue it. (Ctrl+C to stop)',
    ),
  );
  console.log();

  // Run first poll immediately, then on interval
  const poll = async () => {
    try {
      // Re-sync config from dashboard periodically
      await syncConfigFromApi(ghToken);

      // Re-read config each cycle (picks up synced values)
      const currentProjectId = config.get("project_id") as string || projectId;
      const currentUserId = config.get("user_id") as string || userId;
      const currentHandle = config.get("github_handle") as string || githubHandle;

      // Re-fetch repos from DB each cycle (picks up newly linked repos)
      const repos = await sql`
        SELECT repo_full_name FROM project_repos WHERE project_id = ${currentProjectId}
      `;

      if (repos.length === 0) {
        return; // no repos yet, wait for next cycle
      }

      // Log newly discovered repos
      for (const r of repos) {
        if (!knownRepos.has(r.repo_full_name)) {
          console.log(chalk.dim(`  watching: ${r.repo_full_name}`));
          knownRepos.add(r.repo_full_name);
        }
      }

      // 1. Check legacy tasks (backward compat)
      await checkLegacyTasks(sql, currentUserId);

      // 2. Check GitHub issues labeled "spillover"
      await checkGitHubIssues(sql, currentProjectId, currentUserId, currentHandle, repos);

      // 3. Report usage
      await reportUsage(sql, currentUserId);
    } catch (err: any) {
      console.error(chalk.dim(`  poll error: ${err.message}`));
    }
  };

  await poll();
  const pollTimer = setInterval(poll, 15_000);

  process.on("SIGINT", async () => {
    console.log();
    console.log(chalk.dim("  Shutting down agent..."));
    clearInterval(pollTimer);
    await sql.end();
    process.exit(0);
  });
}

const API_BASE = "https://spillover-app.vercel.app";
let lastConfigSync = 0;
const CONFIG_SYNC_INTERVAL = 30_000; // 30 seconds

async function syncConfigFromApi(token: string) {
  const now = Date.now();
  if (now - lastConfigSync < CONFIG_SYNC_INTERVAL) return;
  lastConfigSync = now;

  try {
    const res = await fetch(`${API_BASE}/api/cli/config`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return;

    const data = await res.json();
    if (data.database_url) config.set("database_url", data.database_url);
    if (data.projects?.length > 0) {
      const project = data.projects[0];
      config.set("project_id", project.id);
      config.set("project_name", project.name);
      config.set("user_id", data.github_handle);
    }
  } catch {
    // non-critical
  }
}

async function checkLegacyTasks(sql: any, userId: string) {
  const tasks = await sql`
    UPDATE tasks
    SET status = 'running', started_at = now()
    WHERE id = (
      SELECT id FROM tasks
      WHERE assigned_to = ${userId} AND status = 'queued'
        AND github_issue_number IS NULL
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;

  if (tasks.length > 0) {
    const task = tasks[0];
    console.log(chalk.cyan(`  \ud83d\udca7 legacy task #${task.id.slice(0, 8)}`));
    await executeTask(sql, task);
  }
}

async function checkGitHubIssues(
  sql: any,
  projectId: string,
  userId: string,
  githubHandle: string,
  repos: any[],
) {
  for (const r of repos) {
    const repoName = r.repo_full_name;
    let issues: any[];
    try {
      issues = await listSpilloverIssues(repoName);
    } catch {
      continue; // skip repos we can't access
    }

    for (const issue of issues) {
      // Skip if already claimed
      const existing = await sql`
        SELECT id FROM tasks
        WHERE github_repo_full_name = ${repoName}
          AND github_issue_number = ${issue.number}
      `;
      if (existing.length > 0) continue;

      // Skip if issue has "spillover:running" or "spillover:done" label
      const labelNames = issue.labels.map((l: any) => l.name);
      if (
        labelNames.includes("spillover:running") ||
        labelNames.includes("spillover:done")
      ) {
        continue;
      }

      // Check capacity
      const usagePercent = await getUsagePercent();
      if (usagePercent > 70) {
        continue; // too busy
      }

      // Claim it
      console.log(
        chalk.cyan(
          `  \ud83d\udca7 claiming issue #${issue.number} from ${repoName}`,
        ),
      );
      console.log(chalk.dim(`  "${issue.title}"`));
      console.log();

      await sql`
        INSERT INTO tasks (project_id, github_repo_full_name, github_issue_number, prompt, submitted_by, assigned_to, status, started_at)
        VALUES (${projectId}, ${repoName}, ${issue.number}, ${issue.title}, ${issue.user.login}, ${userId}, 'running', now())
        ON CONFLICT (github_repo_full_name, github_issue_number) WHERE github_issue_number IS NOT NULL
        DO NOTHING
      `;

      // Comment on the issue
      try {
        await addIssueComment(
          repoName,
          issue.number,
          `Picked up by spillover agent @${githubHandle}`,
        );
        await addLabels(repoName, issue.number, ["spillover:running"]);
      } catch {
        // non-critical
      }

      // Execute
      await executeIssueTask(sql, {
        repoName,
        issueNumber: issue.number,
        title: issue.title,
        body: issue.body || issue.title,
        branch: "main",
      });

      break; // one issue at a time
    }
  }
}

async function executeIssueTask(
  sql: any,
  task: {
    repoName: string;
    issueNumber: number;
    title: string;
    body: string;
    branch: string;
  },
) {
  const spinner = ora("Setting up workspace...").start();
  const shortId = `${task.repoName.split("/").pop()}#${task.issueNumber}`;

  try {
    const workDir = join(
      tmpdir(),
      "spillover",
      `issue-${task.repoName.replace("/", "-")}-${task.issueNumber}`,
    );
    mkdirSync(workDir, { recursive: true });

    spinner.text = "Cloning repository...";
    execSync(
      `git clone --depth 1 --branch ${task.branch} https://github.com/${task.repoName}.git .`,
      { cwd: workDir, stdio: "pipe" },
    );

    const resultBranch = `spillover/issue-${task.issueNumber}`;
    execSync(`git checkout -b ${resultBranch}`, {
      cwd: workDir,
      stdio: "pipe",
    });

    // Build prompt from issue
    const prompt = `GitHub Issue #${task.issueNumber}: ${task.title}\n\n${task.body}`;

    spinner.text = `Running Claude Code on issue #${task.issueNumber}...`;
    const result = execSync(
      `claude -p ${JSON.stringify(prompt)} --output-format json`,
      {
        cwd: workDir,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    // Commit and push
    spinner.text = "Pushing results...";
    try {
      execSync(
        `git add -A && git commit -m "spillover: resolve issue #${task.issueNumber}"`,
        { cwd: workDir, stdio: "pipe" },
      );
      execSync(`git push origin ${resultBranch}`, {
        cwd: workDir,
        stdio: "pipe",
      });
    } catch {
      // no changes to commit
    }

    // Parse tokens
    let tokensUsed = 0;
    try {
      const parsed = JSON.parse(result);
      tokensUsed =
        (parsed.usage?.input_tokens || 0) + (parsed.usage?.output_tokens || 0);
    } catch {
      // couldn't parse
    }

    // Update DB
    await sql`
      UPDATE tasks
      SET status = 'done', result_branch = ${resultBranch}, tokens_used = ${tokensUsed}, completed_at = now()
      WHERE github_repo_full_name = ${task.repoName} AND github_issue_number = ${task.issueNumber}
    `;

    // Comment on issue with result
    try {
      await addIssueComment(
        task.repoName,
        task.issueNumber,
        `Done! Results pushed to branch \`${resultBranch}\`.\n\nTokens used: ${tokensUsed.toLocaleString()}`,
      );
      await removeLabel(task.repoName, task.issueNumber, "spillover:running");
      await addLabels(task.repoName, task.issueNumber, ["spillover:done"]);
    } catch {
      // non-critical
    }

    spinner.succeed(chalk.green(`${shortId} complete \u2192 ${resultBranch}`));
  } catch (err: any) {
    spinner.fail(chalk.red(`${shortId} failed`));
    console.error(chalk.dim(err.message));

    await sql`
      UPDATE tasks
      SET status = 'failed', completed_at = now()
      WHERE github_repo_full_name = ${task.repoName} AND github_issue_number = ${task.issueNumber}
    `;

    try {
      await addIssueComment(
        task.repoName,
        task.issueNumber,
        `Task failed: ${err.message?.slice(0, 200)}`,
      );
      await removeLabel(task.repoName, task.issueNumber, "spillover:running");
    } catch {
      // non-critical
    }
  }
}

async function executeTask(sql: any, task: any) {
  const spinner = ora("Setting up workspace...").start();

  try {
    const workDir = join(tmpdir(), "spillover", task.id.slice(0, 8));
    mkdirSync(workDir, { recursive: true });

    if (task.repo_url) {
      spinner.text = "Cloning repository...";
      execSync(
        `git clone --depth 1 --branch ${task.branch || "main"} ${task.repo_url} .`,
        { cwd: workDir, stdio: "pipe" },
      );
    }

    const resultBranch = `spillover/task-${task.id.slice(0, 8)}`;
    if (task.repo_url) {
      execSync(`git checkout -b ${resultBranch}`, {
        cwd: workDir,
        stdio: "pipe",
      });
    }

    spinner.text = "Running prompt with Claude Code...";
    const result = execSync(
      `claude -p ${JSON.stringify(task.prompt)} --output-format json`,
      {
        cwd: workDir,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    if (task.repo_url) {
      spinner.text = "Pushing results...";
      try {
        execSync('git add -A && git commit -m "spillover: task result"', {
          cwd: workDir,
          stdio: "pipe",
        });
        execSync(`git push origin ${resultBranch}`, {
          cwd: workDir,
          stdio: "pipe",
        });
      } catch {
        // no changes
      }
    }

    let tokensUsed = 0;
    try {
      const parsed = JSON.parse(result);
      tokensUsed =
        (parsed.usage?.input_tokens || 0) + (parsed.usage?.output_tokens || 0);
    } catch {
      // couldn't parse
    }

    await sql`
      UPDATE tasks
      SET status = 'done', result_branch = ${resultBranch}, tokens_used = ${tokensUsed}, completed_at = now()
      WHERE id = ${task.id}
    `;

    spinner.succeed(
      chalk.green(`Task #${task.id.slice(0, 8)} complete \u2192 ${resultBranch}`),
    );
  } catch (err: any) {
    spinner.fail(chalk.red(`Task #${task.id.slice(0, 8)} failed`));
    console.error(chalk.dim(err.message));

    await sql`
      UPDATE tasks
      SET status = 'failed', completed_at = now()
      WHERE id = ${task.id}
    `;
  }
}

async function reportUsage(sql: any, userId: string) {
  const usage = await getTodayUsage();
  const percent = await getUsagePercent();

  await sql`
    INSERT INTO usage_logs (user_id, date, tokens_used, usage_percent, updated_at)
    VALUES (${userId}, ${usage.date}, ${usage.total_tokens}, ${Math.round(percent)}, now())
    ON CONFLICT (user_id, date)
    DO UPDATE SET tokens_used = ${usage.total_tokens}, usage_percent = ${Math.round(percent)}, updated_at = now()
  `;
}
