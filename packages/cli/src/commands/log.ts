import chalk from "chalk";
import { requireProject, getSupabase } from "../config.js";

export async function logCommand(options: { n: string }) {
  console.log();
  console.log(chalk.cyan("  💧 spillover log"));
  console.log();

  const { projectId, userId } = requireProject();
  const supabase = getSupabase();
  const limit = parseInt(options.n, 10) || 10;

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(chalk.red("Failed to fetch tasks:"), error.message);
    process.exit(1);
  }

  if (!tasks || tasks.length === 0) {
    console.log(chalk.dim("  No tasks yet. Run: spillover run \"your prompt\""));
    return;
  }

  // Get member info for display
  const userIds = [...new Set(tasks.flatMap((t) => [t.submitted_by, t.assigned_to].filter(Boolean)))];
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .in("user_id", userIds);

  const memberMap = new Map(members?.map((m) => [m.user_id, m]) || []);
  const getName = (id: string) => {
    const m = memberMap.get(id);
    return m?.github_handle || m?.email || id.slice(0, 8);
  };

  const statusIcon: Record<string, string> = {
    queued: "⏳",
    running: "🔄",
    done: "✅",
    failed: "❌",
  };

  for (const task of tasks) {
    const icon = statusIcon[task.status] || "?";
    const prompt =
      task.prompt.length > 40
        ? task.prompt.slice(0, 40) + "..."
        : task.prompt;
    const ranBy =
      task.assigned_to && task.assigned_to !== task.submitted_by
        ? chalk.dim(`@${getName(task.assigned_to)} ran it`)
        : chalk.dim("ran locally");
    const ago = timeAgo(task.created_at);

    console.log(
      `  ${chalk.dim("#" + task.id.slice(0, 8))}  ${prompt.padEnd(44)} ${ranBy.padEnd(30)} ${ago.padEnd(14)} ${icon}`
    );
  }

  console.log();
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}hr ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
