import chalk from "chalk";
import { requireProjects, getDb } from "../config.js";

export async function projectsCommand() {
  console.log();
  console.log(chalk.cyan("  \ud83d\udca7 spillover projects"));
  console.log();

  const { projects } = requireProjects();
  const sql = getDb();

  for (const project of projects) {
    const members = await sql`
      SELECT count(*) as count FROM members WHERE project_id = ${project.id}
    `;
    const repos = await sql`
      SELECT count(*) as count FROM project_repos WHERE project_id = ${project.id}
    `;

    console.log(`  ${chalk.bold(project.name)}  ${chalk.dim(project.code || "")}`);
    console.log(chalk.dim(`    ${members[0].count} members, ${repos[0].count} repos`));
    console.log();
  }

  await sql.end();
}
