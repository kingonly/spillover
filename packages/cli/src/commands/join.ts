import chalk from "chalk";
import ora from "ora";
import { randomUUID } from "crypto";
import { config, getDb } from "../config.js";

export async function joinCommand(projectId: string) {
  console.log();
  console.log(chalk.cyan("  💧 spillover join"));
  console.log();

  if (!process.env.SPILLOVER_DATABASE_URL && !config.get("database_url")) {
    console.error("No database URL found. Set SPILLOVER_DATABASE_URL and try again.");
    process.exit(1);
  }

  if (process.env.SPILLOVER_DATABASE_URL) {
    config.set("database_url", process.env.SPILLOVER_DATABASE_URL);
  }

  const userId = (config.get("user_id") as string) || randomUUID();
  const spinner = ora("Joining project...").start();

  try {
    const sql = getDb();

    const projects = await sql`
      SELECT * FROM projects WHERE id = ${projectId}
    `;

    if (projects.length === 0) {
      spinner.fail(chalk.red("Project not found"));
      process.exit(1);
    }

    const project = projects[0];

    await sql`
      INSERT INTO members (project_id, user_id)
      VALUES (${projectId}, ${userId})
      ON CONFLICT (project_id, user_id) DO NOTHING
    `;

    config.set("user_id", userId);
    config.set("project_id", projectId);
    config.set("project_name", project.name);

    spinner.succeed(chalk.green(`Joined ${project.name}!`));
    console.log();
    console.log(`  Run ${chalk.cyan("spillover status")} to see your team.`);
    console.log(`  Run ${chalk.cyan("spillover agent")} to start accepting tasks.`);
    console.log();

    await sql.end();
  } catch (err: any) {
    spinner.fail(chalk.red("Failed to join project"));
    console.error(err.message);
    process.exit(1);
  }
}
