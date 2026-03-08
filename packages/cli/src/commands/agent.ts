import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { requireProject, getDb } from "../config.js";
import { getUsagePercent, getTodayUsage } from "../usage.js";

export async function agentCommand(options: { daemon?: boolean }) {
  console.log();
  console.log(chalk.cyan("  \ud83d\udca7 spillover agent") + chalk.dim(" \u2014 listening for tasks"));
  console.log();

  const { projectId, userId } = requireProject();
  const sql = getDb();

  // Report initial usage
  await reportUsage(sql, userId);

  console.log(chalk.dim("  Waiting for tasks... (Ctrl+C to stop)"));
  console.log();

  // Poll for new tasks every 5 seconds
  const pollInterval = setInterval(async () => {
    try {
      // Claim an unclaimed task assigned to us
      const tasks = await sql`
        UPDATE tasks
        SET status = 'running', started_at = now()
        WHERE id = (
          SELECT id FROM tasks
          WHERE assigned_to = ${userId} AND status = 'queued'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `;

      if (tasks.length > 0) {
        const task = tasks[0];
        console.log(
          chalk.cyan(`  \ud83d\udca7 incoming task #${task.id.slice(0, 8)}`)
        );
        console.log(
          chalk.dim(
            `  "${task.prompt.slice(0, 80)}${task.prompt.length > 80 ? "..." : ""}"`
          )
        );
        console.log();

        await executeTask(sql, task);
      }

      // Report usage periodically
      await reportUsage(sql, userId);
    } catch (err: any) {
      // Swallow polling errors, keep running
      console.error(chalk.dim(`  poll error: ${err.message}`));
    }
  }, 5000);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log();
    console.log(chalk.dim("  Shutting down agent..."));
    clearInterval(pollInterval);
    await sql.end();
    process.exit(0);
  });
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

async function executeTask(sql: any, task: any) {
  const spinner = ora("Setting up workspace...").start();

  try {
    const workDir = join(tmpdir(), "spillover", task.id.slice(0, 8));
    mkdirSync(workDir, { recursive: true });

    if (task.repo_url) {
      spinner.text = "Cloning repository...";
      execSync(
        `git clone --depth 1 --branch ${task.branch || "main"} ${task.repo_url} .`,
        { cwd: workDir, stdio: "pipe" }
      );
    }

    // Create result branch
    const resultBranch = `spillover/task-${task.id.slice(0, 8)}`;
    if (task.repo_url) {
      execSync(`git checkout -b ${resultBranch}`, {
        cwd: workDir,
        stdio: "pipe",
      });
    }

    // Run the prompt with Claude Code
    spinner.text = "Running prompt with Claude Code...";
    const result = execSync(
      `claude -p ${JSON.stringify(task.prompt)} --output-format json`,
      {
        cwd: workDir,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    // Commit and push results
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
        // no changes to commit
      }
    }

    // Parse token usage
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
      chalk.green(`Task #${task.id.slice(0, 8)} complete \u2192 ${resultBranch}`)
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
