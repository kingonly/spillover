#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { runCommand } from "./commands/run.js";
import { joinCommand } from "./commands/join.js";
import { logCommand } from "./commands/log.js";
import { agentCommand } from "./commands/agent.js";
import { loginCommand } from "./commands/login.js";

const program = new Command();

const banner = `
${chalk.cyan("  💧 spillover")} ${chalk.dim("— pool your team's Claude Code capacity")}
`;

program
  .name("spillover")
  .description(banner)
  .version("0.2.0");

program
  .command("init")
  .description("Create a new project and set up Spillover")
  .argument("[name]", "Project name")
  .action(initCommand);

program
  .command("join")
  .description("Join an existing project")
  .argument("<project-id>", "Project ID to join")
  .action(joinCommand);

program
  .command("status")
  .description("See team capacity and hydration levels")
  .action(statusCommand);

program
  .command("run")
  .description("Submit a task to your team")
  .argument("<prompt>", "The prompt to run")
  .option("--repo <url>", "GitHub repo URL")
  .option("--branch <name>", "Base branch", "main")
  .option("--local", "Force local execution")
  .action(runCommand);

program
  .command("log")
  .description("View task history")
  .option("-n <count>", "Number of tasks to show", "10")
  .action(logCommand);

program
  .command("login")
  .description("Authenticate with GitHub for issue-based tasks")
  .option("--token <token>", "GitHub personal access token with repo scope")
  .action(loginCommand);

program
  .command("agent")
  .description("Start the agent to pick up spillover-labeled GitHub issues")
  .option("--daemon", "Run as a background daemon")
  .action(agentCommand);

program.parse();
