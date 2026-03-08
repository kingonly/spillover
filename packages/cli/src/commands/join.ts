import chalk from "chalk";
import ora from "ora";
import { randomUUID } from "crypto";
import { config, getSupabase } from "../config.js";

export async function joinCommand(projectId: string) {
  console.log();
  console.log(chalk.cyan("  💧 spillover join"));
  console.log();

  const userId = (config.get("user_id") as string) || randomUUID();
  const spinner = ora("Joining project...").start();

  try {
    const supabase = getSupabase();

    // Check project exists
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (fetchError || !project) {
      spinner.fail(chalk.red("Project not found"));
      process.exit(1);
    }

    // Add as member
    const { error: memberError } = await supabase.from("members").insert({
      project_id: projectId,
      user_id: userId,
      email: "",
      github_handle: "",
    });

    if (memberError) throw memberError;

    config.set("user_id", userId);
    config.set("project_id", projectId);
    config.set("project_name", project.name);

    spinner.succeed(chalk.green(`Joined ${project.name}!`));
    console.log();
    console.log(`  Run ${chalk.cyan("spillover status")} to see your team.`);
    console.log(`  Run ${chalk.cyan("spillover agent")} to start accepting tasks.`);
    console.log();
  } catch (err: any) {
    spinner.fail(chalk.red("Failed to join project"));
    console.error(err.message);
    process.exit(1);
  }
}
