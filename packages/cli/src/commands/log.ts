import chalk from "chalk";
import { requireProject, getDb } from "../config.js";

export async function logCommand(options: { n: string }) {
  console.log();
  console.log(chalk.cyan("  \ud83d\udca7 spillover log"));
  console.log();

  const { projectId } = requireProject();
  const sql = getDb();
  const limit = parseInt(options.n, 10) || 10;

  const tasks = await sql`
    SELECT * FROM tasks
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  if (tasks.length === 0) {
    console.log(
      chalk.dim(
        '  No tasks yet. Label a GitHub issue with "spillover" to get started.',
      ),
    );
    await sql.end();
    return;
  }

  // Get member info
  const userIds = [
    ...new Set(
      tasks.flatMap((t: any) => [t.submitted_by, t.assigned_to].filter(Boolean)),
    ),
  ];

  const members = await sql`
    SELECT * FROM members WHERE user_id = ANY(${userIds})
  `;

  const memberMap = new Map(members.map((m: any) => [m.user_id, m]));
  const getName = (id: string) => {
    const m = memberMap.get(id);
    return m?.github_handle || m?.email || id.slice(0, 8);
  };

  const statusIcon: Record<string, string> = {
    queued: "\u23f3",
    running: "\ud83d\udd04",
    done: "\u2705",
    failed: "\u274c",
  };

  for (const task of tasks) {
    const icon = statusIcon[task.status] || "?";
    const label = task.github_issue_number
      ? `${task.github_repo_full_name}#${task.github_issue_number}`
      : task.prompt?.length > 40
        ? task.prompt.slice(0, 40) + "..."
        : task.prompt || "(no prompt)";
    const ranBy =
      task.assigned_to && task.assigned_to !== task.submitted_by
        ? chalk.dim(`@${getName(task.assigned_to)}`)
        : chalk.dim("local");
    const ago = timeAgo(task.created_at);

    console.log(
      `  ${icon}  ${label.padEnd(44)} ${ranBy.padEnd(20)} ${ago}`,
    );
  }

  console.log();
  await sql.end();
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}hr ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
