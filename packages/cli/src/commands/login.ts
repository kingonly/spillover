import chalk from "chalk";
import { config } from "../config.js";

export async function loginCommand(options: { token: string }) {
  console.log();

  if (!options.token) {
    console.log(chalk.red("  Token required. Run: spillover login --token ghp_..."));
    process.exit(1);
  }

  // Verify the token works
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    console.log(chalk.red("  Invalid token. Make sure it has 'repo' scope."));
    process.exit(1);
  }

  const user = await res.json();
  config.set("github_token", options.token);
  config.set("github_handle", user.login);

  console.log(chalk.green(`  Authenticated as @${user.login}`));
  console.log(chalk.dim(`  Token stored in ${config.path}`));
  console.log();
}
