import chalk from "chalk";
import { config } from "../config.js";

const CLIENT_ID = "Ov23liESD9lIq3sUWa0U";
const API_BASE = "https://spillover-app.vercel.app";

export async function loginCommand(options: { token?: string }) {
  console.log();

  if (options.token) {
    await loginWithToken(options.token);
  } else {
    await loginWithDevice();
  }
}

async function loginWithDevice() {
  // Step 1: Request device code
  const codeRes = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      scope: "repo",
    }),
  });

  if (!codeRes.ok) {
    console.log(
      chalk.red(
        "  Failed to start device flow. You can use: spillover login --token ghp_...",
      ),
    );
    process.exit(1);
  }

  const { device_code, user_code, verification_uri, interval } =
    await codeRes.json();

  // Step 2: Show the code to the user
  console.log(
    `  Open ${chalk.cyan(verification_uri)} and enter code: ${chalk.bold(user_code)}`,
  );
  console.log();
  console.log(chalk.dim("  Waiting for authorization..."));

  // Step 3: Poll for the token
  const pollInterval = (interval || 5) * 1000;
  const token = await pollForToken(device_code, pollInterval);

  if (!token) {
    console.log(chalk.red("  Authorization timed out or was denied."));
    process.exit(1);
  }

  // Step 4: Verify and save
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!userRes.ok) {
    console.log(chalk.red("  Failed to verify token."));
    process.exit(1);
  }

  const user = await userRes.json();
  config.set("github_token", token);
  config.set("github_handle", user.login);

  console.log();
  console.log(chalk.green(`  Authenticated as @${user.login}`));
  console.log(chalk.dim(`  Token stored in ${config.path}`));

  await syncProjectConfig(token);
  console.log();
}

async function pollForToken(
  deviceCode: string,
  interval: number,
): Promise<string | null> {
  const maxAttempts = 60; // 5 minutes at 5s intervals

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const data = await res.json();

    if (data.access_token) {
      return data.access_token;
    }

    if (data.error === "authorization_pending") {
      continue;
    }

    if (data.error === "slow_down") {
      interval += 5000;
      continue;
    }

    // expired_token, access_denied, etc.
    return null;
  }

  return null;
}

async function loginWithToken(token: string) {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    console.log(
      chalk.red("  Invalid token. Make sure it has 'repo' scope."),
    );
    process.exit(1);
  }

  const user = await res.json();
  config.set("github_token", token);
  config.set("github_handle", user.login);

  console.log(chalk.green(`  Authenticated as @${user.login}`));
  console.log(chalk.dim(`  Token stored in ${config.path}`));

  await syncProjectConfig(token);
  console.log();
}

async function syncProjectConfig(token: string) {
  try {
    const res = await fetch(`${API_BASE}/api/cli/config`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.log(chalk.dim("  Could not sync project config from dashboard."));
      return;
    }

    const data = await res.json();

    if (data.database_url) {
      config.set("database_url", data.database_url);
    }

    if (data.projects && data.projects.length > 0) {
      const project = data.projects[0]; // use first (most recent) project
      config.set("project_id", project.id);
      config.set("project_name", project.name);
      config.set("user_id", data.github_handle);
      console.log(chalk.green(`  Synced project: ${project.name} (${project.code})`));
    } else {
      console.log(chalk.yellow("  No projects found. Create one at https://spillover-app.vercel.app"));
    }
  } catch {
    console.log(chalk.dim("  Could not reach dashboard to sync config."));
  }
}
