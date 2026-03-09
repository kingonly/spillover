import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { SPILLOVER_THRESHOLD } from "@spillover/shared";
import { requireProject, getDb, config } from "../config.js";
import { getUsagePercent } from "../usage.js";
import { createIssue } from "../github.js";

interface RunOptions {
  repo?: string;
  branch?: string;
  local?: boolean;
}

export async function runCommand(prompt: string, options: RunOptions) {
  console.log();
  console.log(chalk.cyan("  \ud83d\udca7 spillover run"));
  console.log();

  const usagePercent = await getUsagePercent();
  const shouldSpillover =
    usagePercent > SPILLOVER_THRESHOLD * 100 && !options.local;

  if (shouldSpillover && options.repo) {
    // Create a GitHub issue with the "spillover" label
    const githubToken = config.get("github_token") as string;
    if (!githubToken) {
      console.log(
        chalk.yellow(
          "  No GitHub token. Run: spillover login --token ghp_...",
        ),
      );
      console.log(chalk.dim("  Falling back to local execution."));
      console.log();
      runLocally(prompt, options);
      return;
    }

    const repoFullName = normalizeRepo(options.repo);
    const spinner = ora("Creating GitHub issue...").start();

    try {
      const issue = await createIssue(repoFullName, prompt, prompt, [
        "spillover",
      ]);

      spinner.succeed(
        chalk.green(`Created issue #${issue.number} on ${repoFullName}`),
      );
      console.log();
      console.log(`  ${chalk.dim("issue:")}  ${issue.html_url}`);
      console.log(
        chalk.dim(
          "  An agent will pick this up when it has spare capacity.",
        ),
      );
      console.log();
    } catch (err: any) {
      spinner.fail(chalk.red("Failed to create issue"));
      console.error(chalk.dim(err.message));
      console.log(chalk.dim("  Falling back to local execution."));
      console.log();
      runLocally(prompt, options);
    }
    return;
  }

  if (shouldSpillover && !options.repo) {
    console.log(
      chalk.yellow(
        `  You're at ${Math.round(usagePercent)}% but no --repo specified.`,
      ),
    );
    console.log(
      chalk.dim(
        "  To spill over, use: spillover run \"prompt\" --repo owner/repo",
      ),
    );
    console.log(chalk.dim("  Running locally instead."));
    console.log();
  } else {
    console.log(
      chalk.dim(`  You're at ${Math.round(usagePercent)}% \u2014 running locally`),
    );
    console.log();
  }

  runLocally(prompt, options);
}

function normalizeRepo(repo: string): string {
  // Accept "owner/repo", "github.com/owner/repo", "https://github.com/owner/repo"
  return repo
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "");
}

function runLocally(prompt: string, _options: RunOptions) {
  const spinner = ora("Running with Claude Code...").start();

  try {
    const result = execSync(
      `claude -p ${JSON.stringify(prompt)} --output-format json`,
      {
        cwd: process.cwd(),
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

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
