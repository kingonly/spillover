import chalk from "chalk";
import { requireProject, getSupabase } from "../config.js";
import { getUsagePercent } from "../usage.js";

function usageBar(percent: number): string {
  const total = 10;
  const filled = Math.round((percent / 100) * total);
  const empty = total - filled;
  const bar = chalk.cyan("█".repeat(filled)) + chalk.dim("░".repeat(empty));

  let label: string;
  if (percent < 30) label = chalk.green("overflowing");
  else if (percent < 50) label = chalk.green("plenty to give");
  else if (percent < 70) label = chalk.yellow("comfortable");
  else if (percent < 90) label = chalk.hex("#FFA500")("running warm");
  else label = chalk.red("near limit");

  return `${bar}  ${String(Math.round(percent)).padStart(3)}%  ${chalk.dim("—")} ${label}`;
}

export async function statusCommand() {
  console.log();
  console.log(chalk.cyan("  🫧 spillover") + chalk.dim(" — team hydration check"));
  console.log();

  const { projectId, userId } = requireProject();
  const supabase = getSupabase();

  // Get team members
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("project_id", projectId);

  if (!members || members.length === 0) {
    console.log(chalk.dim("  No team members yet."));
    return;
  }

  // Get latest usage for each member
  const { data: usageLogs } = await supabase
    .from("usage_logs")
    .select("*")
    .eq("date", new Date().toISOString().split("T")[0])
    .in(
      "user_id",
      members.map((m) => m.user_id)
    );

  const usageMap = new Map(usageLogs?.map((u) => [u.user_id, u]) || []);

  // Show local usage for current user
  const localPercent = await getUsagePercent();
  let totalAvailable = 0;

  for (const member of members) {
    const isMe = member.user_id === userId;
    const usage = usageMap.get(member.user_id);
    const percent = isMe ? localPercent : usage?.usage_percent || 0;
    const name = member.github_handle || member.email || member.user_id.slice(0, 8);
    const tag = isMe ? chalk.dim(" (you)") : "";
    const available = 100 - percent;
    totalAvailable += available;

    console.log(`  @${name}${tag}`);
    console.log(`  ${usageBar(percent)}`);
    console.log();
  }

  const teamPercent = Math.round(totalAvailable / members.length);
  console.log(chalk.dim(`  team capacity: ${teamPercent}% available`));
  console.log();
}
