import chalk from "chalk";
import ora from "ora";
import { randomUUID } from "crypto";
import { config, getDb, getProjects } from "../config.js";

export async function initCommand(name?: string) {
  console.log();
  console.log(chalk.cyan("  \ud83d\udca7 spillover init"));
  console.log();

  // Prompt for database URL if not set
  const existingUrl =
    (config.get("database_url") as string) || process.env.SPILLOVER_DATABASE_URL;

  if (!existingUrl) {
    console.log(
      chalk.dim("  Set your Neon database URL:") +
        "\n  export SPILLOVER_DATABASE_URL=postgresql://...\n" +
        chalk.dim("  Or pass it once and we'll save it locally.\n")
    );
    console.error("No database URL found. Set SPILLOVER_DATABASE_URL and try again.");
    process.exit(1);
  }

  // Save the URL locally
  if (process.env.SPILLOVER_DATABASE_URL) {
    config.set("database_url", process.env.SPILLOVER_DATABASE_URL);
  }

  const projectName = name || `project-${Date.now()}`;
  const userId = (config.get("user_id") as string) || randomUUID();
  const projectId = randomUUID();

  const spinner = ora("Creating project...").start();

  try {
    const sql = getDb();

    await sql`
      INSERT INTO projects (id, name, created_by)
      VALUES (${projectId}, ${projectName}, ${userId})
    `;

    await sql`
      INSERT INTO members (project_id, user_id)
      VALUES (${projectId}, ${userId})
    `;

    config.set("user_id", userId);

    // Add to projects array
    const existing = getProjects();
    config.set("projects", [
      ...existing,
      { id: projectId, name: projectName, code: "" },
    ]);

    // Keep legacy fields in sync
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

    await sql.end();
  } catch (err: any) {
    spinner.fail(chalk.red("Failed to create project"));
    console.error(err.message);
    process.exit(1);
  }
}
