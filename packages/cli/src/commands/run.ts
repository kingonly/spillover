import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { SPILLOVER_THRESHOLD } from "@spillover/shared";
import { requireProject, getDb } from "../config.js";
import { getUsagePercent } from "../usage.js";

interface RunOptions {
  repo?: string;
  branch?: string;
  local?: boolean;
}

export async function runCommand(prompt: string, options: RunOptions) {
  console.log();
  console.log(chalk.cyan("  \ud83d\udca7 spillover run"));
  console.log();

  const { projectId, userId } = requireProject();
  const sql = getDb();

  const usagePercent = await getUsagePercent();
  const shouldSpillover = usagePercent > SPILLOVER_THRESHOLD * 100 && !options.local;

  if (shouldSpillover) {
    const spinner = ora("Finding a teammate with spare capacity...").start();

    const members = await sql`
      SELECT * FROM members
      WHERE project_id = ${projectId} AND user_id != ${userId}
    `;

    const today = new Date().toISOString().split("T")[0];
    const memberIds = members.map((m) => m.user_id);

    const usageLogs = await sql`
      SELECT * FROM usage_logs
      WHERE date = ${today} AND user_id = ANY(${memberIds})
    `;

    const usageMap = new Map(usageLogs.map((u) => [u.user_id, u]));

    // Find member with lowest usage
    let bestMember: any = null;
    let lowestUsage = 100;

    for (const member of members) {
      const usage = usageMap.get(member.user_id);
      const percent = Number(usage?.usage_percent || 0);
      if (percent < lowestUsage) {
        lowestUsage = percent;
        bestMember = member;
      }
    }

    if (!bestMember || lowestUsage > SPILLOVER_THRESHOLD * 100) {
      spinner.warn(chalk.yellow("No teammates with spare capacity. Running locally."));
      await sql.end();
      runLocally(prompt, options);
      return;
    }

    const memberName = bestMember.github_handle || bestMember.user_id.slice(0, 8);
    spinner.succeed(
      chalk.green(`Spilling over to @${memberName} (${Math.round(lowestUsage)}% used)`)
    );

    // Create task in queue
    const tasks = await sql`
      INSERT INTO tasks (project_id, repo_url, branch, prompt, submitted_by, assigned_to, status)
      VALUES (${projectId}, ${options.repo || ""}, ${options.branch || "main"}, ${prompt}, ${userId}, ${bestMember.user_id}, 'queued')
      RETURNING *
    `;

    const task = tasks[0];

    console.log();
    console.log(`  ${chalk.dim("task:")}   #${task.id.slice(0, 8)}`);
    console.log(`  ${chalk.dim("status:")} queued \u2014 waiting for @${memberName}'s agent`);
    console.log();
    console.log(chalk.dim("  Polling for completion..."));

    // Poll for task completion
    const pollInterval = setInterval(async () => {
      const updated = await sql`
        SELECT * FROM tasks WHERE id = ${task.id}
      `;
      if (updated.length === 0) return;

      const t = updated[0];
      if (t.status === "done") {
        clearInterval(pollInterval);
        console.log();
        console.log(chalk.green(`  \u2705 done \u2014 branch: ${t.result_branch}`));
        if (t.tokens_used) {
          console.log(chalk.dim(`  \ud83d\udcb0 tokens used: ${Number(t.tokens_used).toLocaleString()}`));
        }
        await sql.end();
        process.exit(0);
      } else if (t.status === "failed") {
        clearInterval(pollInterval);
        console.log();
        console.error(chalk.red("  \u274c task failed"));
        await sql.end();
        process.exit(1);
      }
    }, 5000);

    // Timeout after 10 minutes
    setTimeout(async () => {
      clearInterval(pollInterval);
      console.log();
      console.log(chalk.yellow("  \u23f0 timed out waiting for task completion"));
      await sql.end();
      process.exit(1);
    }, 600_000);
  } else {
    console.log(
      chalk.dim(`  You're at ${Math.round(usagePercent)}% \u2014 running locally`)
    );
    console.log();
    await sql.end();
    runLocally(prompt, options);
  }
}

function runLocally(prompt: string, options: RunOptions) {
  const spinner = ora("Running with Claude Code...").start();

  try {
    const result = execSync(
      `claude -p ${JSON.stringify(prompt)} --output-format json`,
      {
        cwd: process.cwd(),
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    spinner.succeed(chalk.green("Done!"));
    console.log();

    try {
      const parsed = JSON.parse(result);
      console.log(parsed.result || result);
    } catch {
      console.log(result);
    }
  } catch (err: any) {
    spinner.fail(chalk.red("Execution failed"));
    console.error(err.stderr || err.message);
    process.exit(1);
  }
}
