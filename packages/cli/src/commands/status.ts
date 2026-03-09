import chalk from "chalk";
import { requireProjects, getDb } from "../config.js";
import { getUsagePercent } from "../usage.js";

function usageBar(percent: number): string {
  const total = 10;
  const filled = Math.round((percent / 100) * total);
  const empty = total - filled;
  const bar = chalk.cyan("\u2588".repeat(filled)) + chalk.dim("\u2591".repeat(empty));

  let label: string;
  if (percent < 30) label = chalk.green("overflowing");
  else if (percent < 50) label = chalk.green("plenty to give");
  else if (percent < 70) label = chalk.yellow("comfortable");
  else if (percent < 90) label = chalk.hex("#FFA500")("running warm");
  else label = chalk.red("near limit");

  return `${bar}  ${String(Math.round(percent)).padStart(3)}%  ${chalk.dim("\u2014")} ${label}`;
}

export async function statusCommand() {
  console.log();
  console.log(chalk.cyan("  \ud83e\udee7 spillover") + chalk.dim(" \u2014 team hydration check"));
  console.log();

  const { projects, userId } = requireProjects();
  const sql = getDb();
  const today = new Date().toISOString().split("T")[0];
  const localPercent = await getUsagePercent();

  for (const project of projects) {
    if (projects.length > 1) {
      console.log(chalk.bold(`  ${project.name}`));
      console.log();
    }

    const members = await sql`
      SELECT * FROM members WHERE project_id = ${project.id}
    `;

    if (members.length === 0) {
      console.log(chalk.dim("  No team members yet."));
      console.log();
      continue;
    }

    const userIds = members.map((m: any) => m.user_id);

    const usageLogs = await sql`
      SELECT * FROM usage_logs
      WHERE date = ${today} AND user_id = ANY(${userIds})
    `;

    const usageMap = new Map(usageLogs.map((u: any) => [u.user_id, u]));
    let totalAvailable = 0;

    for (const member of members) {
      const isMe = member.user_id === userId;
      const usage = usageMap.get(member.user_id);
      const percent = isMe ? localPercent : Number(usage?.usage_percent || 0);
      const name = member.github_handle || member.email || member.user_id.slice(0, 8);
      const tag = isMe ? chalk.dim(" (you)") : "";
      totalAvailable += 100 - percent;

      console.log(`  @${name}${tag}`);
      console.log(`  ${usageBar(percent)}`);
      console.log();
    }

    const teamPercent = Math.round(totalAvailable / members.length);
    console.log(chalk.dim(`  team capacity: ${teamPercent}% available`));
    console.log();
  }

  await sql.end();
}
