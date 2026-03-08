import chalk from "chalk";
import ora from "ora";
import { randomUUID } from "crypto";
import { config, getSupabase } from "../config.js";

export async function initCommand(name?: string) {
  console.log();
  console.log(chalk.cyan("  💧 spillover init"));
  console.log();

  const projectName = name || `project-${Date.now()}`;
  const userId = (config.get("user_id") as string) || randomUUID();
  const projectId = randomUUID();

  const spinner = ora("Creating project...").start();

  try {
    const supabase = getSupabase();

    // Create the project
    const { error: projectError } = await supabase.from("projects").insert({
      id: projectId,
      name: projectName,
      created_by: userId,
    });

    if (projectError) throw projectError;

    // Add creator as first member
    const { error: memberError } = await supabase.from("members").insert({
      project_id: projectId,
      user_id: userId,
      email: "",
      github_handle: "",
    });

    if (memberError) throw memberError;

    // Save locally
    config.set("user_id", userId);
    config.set("project_id", projectId);
    config.set("project_name", projectName);

    spinner.succeed(chalk.green("Project created!"));
    console.log();
    console.log(`  ${chalk.dim("project:")}  ${projectName}`);
    console.log(`  ${chalk.dim("id:")}       ${projectId}`);
    console.log();
    console.log(`  Share this with your team:`);
    console.log(`  ${chalk.cyan(`spillover join ${projectId}`)}`);
    console.log();
  } catch (err: any) {
    spinner.fail(chalk.red("Failed to create project"));
    console.error(err.message);
    process.exit(1);
  }
}
