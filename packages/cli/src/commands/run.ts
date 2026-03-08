import chalk from "chalk";
import ora from "ora";
import { execSync, spawn } from "child_process";
import { SPILLOVER_THRESHOLD } from "@spillover/shared";
import { requireProject, getSupabase } from "../config.js";
import { getUsagePercent } from "../usage.js";

interface RunOptions {
  repo?: string;
  branch?: string;
  local?: boolean;
}

export async function runCommand(prompt: string, options: RunOptions) {
  console.log();
  console.log(chalk.cyan("  💧 spillover run"));
  console.log();

  const { projectId, userId } = requireProject();
  const supabase = getSupabase();

  const usagePercent = await getUsagePercent();
  const shouldSpillover = usagePercent > SPILLOVER_THRESHOLD * 100 && !options.local;

  if (shouldSpillover) {
    // Find best teammate to handle this
    const spinner = ora("Finding a teammate with spare capacity...").start();

    const { data: members } = await supabase
      .from("members")
      .select("*")
      .eq("project_id", projectId)
      .neq("user_id", userId);

    const today = new Date().toISOString().split("T")[0];
    const { data: usageLogs } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("date", today)
      .in("user_id", members?.map((m) => m.user_id) || []);

    const usageMap = new Map(usageLogs?.map((u) => [u.user_id, u]) || []);

    // Find member with lowest usage
    let bestMember: any = null;
    let lowestUsage = 100;

    for (const member of members || []) {
      const usage = usageMap.get(member.user_id);
      const percent = usage?.usage_percent || 0;
      if (percent < lowestUsage) {
        lowestUsage = percent;
        bestMember = member;
      }
    }

    if (!bestMember || lowestUsage > SPILLOVER_THRESHOLD * 100) {
      spinner.warn(chalk.yellow("No teammates with spare capacity. Running locally."));
      runLocally(prompt, options);
      return;
    }

    const memberName = bestMember.github_handle || bestMember.user_id.slice(0, 8);
    spinner.succeed(
      chalk.green(`Spilling over to @${memberName} (${Math.round(lowestUsage)}% used)`)
    );

    // Create task in queue
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        repo_url: options.repo || "",
        branch: options.branch || "main",
        prompt,
        submitted_by: userId,
        assigned_to: bestMember.user_id,
        status: "queued",
      })
      .select()
      .single();

    if (error) {
      console.error(chalk.red("Failed to create task:"), error.message);
      process.exit(1);
    }

    console.log();
    console.log(`  ${chalk.dim("task:")}   #${task.id.slice(0, 8)}`);
    console.log(`  ${chalk.dim("status:")} queued — waiting for @${memberName} to pick it up`);
    console.log();
    console.log(chalk.dim("  Listening for completion..."));

    // Subscribe to task updates
    const channel = supabase
      .channel(`task-${task.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks", filter: `id=eq.${task.id}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status === "done") {
            console.log();
            console.log(chalk.green(`  ✅ done — branch: ${updated.result_branch}`));
            if (updated.tokens_used) {
              console.log(chalk.dim(`  💰 tokens used: ${updated.tokens_used.toLocaleString()}`));
            }
            channel.unsubscribe();
            process.exit(0);
          } else if (updated.status === "failed") {
            console.log();
            console.error(chalk.red("  ❌ task failed"));
            channel.unsubscribe();
            process.exit(1);
          }
        }
      )
      .subscribe();
  } else {
    console.log(
      chalk.dim(`  You're at ${Math.round(usagePercent)}% — running locally`)
    );
    console.log();
    runLocally(prompt, options);
  }
}

function runLocally(prompt: string, options: RunOptions) {
  const spinner = ora("Running with Claude Code...").start();

  try {
    const args = ["-p", prompt, "--output-format", "json"];

    const result = execSync(`claude ${args.map((a) => `"${a}"`).join(" ")}`, {
      cwd: process.cwd(),
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });

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
