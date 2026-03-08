import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { requireProject, getSupabase } from "../config.js";
import { getUsagePercent, getTodayUsage } from "../usage.js";
import { SPILLOVER_THRESHOLD } from "@spillover/shared";

export async function agentCommand(options: { daemon?: boolean }) {
  console.log();
  console.log(chalk.cyan("  💧 spillover agent") + chalk.dim(" — listening for tasks"));
  console.log();

  const { projectId, userId } = requireProject();
  const supabase = getSupabase();

  // Report initial usage
  await reportUsage(supabase, userId);

  // Listen for assigned tasks
  const channel = supabase
    .channel("agent-tasks")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "tasks",
        filter: `assigned_to=eq.${userId}`,
      },
      async (payload) => {
        const task = payload.new as any;
        console.log();
        console.log(
          chalk.cyan(`  💧 incoming task #${task.id.slice(0, 8)}`)
        );
        console.log(chalk.dim(`  "${task.prompt.slice(0, 80)}${task.prompt.length > 80 ? "..." : ""}"`));
        console.log();

        await executeTask(supabase, task);
      }
    )
    .subscribe();

  // Periodically report usage
  const usageInterval = setInterval(
    () => reportUsage(supabase, userId),
    60_000 // every minute
  );

  console.log(chalk.dim("  Waiting for tasks... (Ctrl+C to stop)"));

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log();
    console.log(chalk.dim("  Shutting down agent..."));
    channel.unsubscribe();
    clearInterval(usageInterval);
    process.exit(0);
  });
}

async function reportUsage(supabase: any, userId: string) {
  const usage = await getTodayUsage();
  const percent = await getUsagePercent();

  await supabase.from("usage_logs").upsert(
    {
      user_id: userId,
      date: usage.date,
      tokens_used: usage.total_tokens,
      usage_percent: Math.round(percent),
    },
    { onConflict: "user_id,date" }
  );
}

async function executeTask(supabase: any, task: any) {
  const spinner = ora("Setting up workspace...").start();

  // Mark as running
  await supabase
    .from("tasks")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", task.id);

  try {
    // Prepare workspace
    const workDir = join(tmpdir(), "spillover", task.id.slice(0, 8));
    mkdirSync(workDir, { recursive: true });

    if (task.repo_url) {
      spinner.text = "Cloning repository...";
      execSync(`git clone --depth 1 --branch ${task.branch || "main"} ${task.repo_url} .`, {
        cwd: workDir,
        stdio: "pipe",
      });
    }

    // Create result branch
    const resultBranch = `spillover/task-${task.id.slice(0, 8)}`;
    if (task.repo_url) {
      execSync(`git checkout -b ${resultBranch}`, { cwd: workDir, stdio: "pipe" });
    }

    // Run the prompt with Claude Code
    spinner.text = "Running prompt with Claude Code...";
    const result = execSync(
      `claude -p "${task.prompt.replace(/"/g, '\\"')}" --output-format json`,
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

    // Parse token usage from result
    let tokensUsed = 0;
    try {
      const parsed = JSON.parse(result);
      tokensUsed =
        (parsed.usage?.input_tokens || 0) + (parsed.usage?.output_tokens || 0);
    } catch {
      // couldn't parse
    }

    // Mark as done
    await supabase
      .from("tasks")
      .update({
        status: "done",
        result_branch: resultBranch,
        tokens_used: tokensUsed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    spinner.succeed(
      chalk.green(`Task #${task.id.slice(0, 8)} complete → ${resultBranch}`)
    );
  } catch (err: any) {
    spinner.fail(chalk.red(`Task #${task.id.slice(0, 8)} failed`));
    console.error(chalk.dim(err.message));

    await supabase
      .from("tasks")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", task.id);
  }
}
