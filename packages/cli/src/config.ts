import Conf from "conf";
import postgres from "postgres";

export interface ConfigProject {
  id: string;
  name: string;
  code: string;
}

// Local config stored in ~/.config/spillover/config.json
export const config = new Conf({
  projectName: "spillover",
  schema: {
    user_id: { type: "string" },
    email: { type: "string" },
    github_handle: { type: "string" },
    github_token: { type: "string" },
    // Legacy single-project fields (kept for migration)
    project_id: { type: "string" },
    project_name: { type: "string" },
    database_url: { type: "string" },
    projects: {
      type: "array",
      items: { type: "object" },
      default: [],
    },
  },
});

// Migrate legacy single-project config to projects array
(function migrateConfig() {
  const projects = config.get("projects") as ConfigProject[];
  const legacyId = config.get("project_id") as string;
  if (legacyId && (!projects || projects.length === 0)) {
    config.set("projects", [
      {
        id: legacyId,
        name: (config.get("project_name") as string) || "unknown",
        code: "",
      },
    ]);
  }
})();

let _sql: postgres.Sql | null = null;

export function getDb(): postgres.Sql {
  if (!_sql) {
    const url =
      (config.get("database_url") as string) ||
      process.env.SPILLOVER_DATABASE_URL ||
      "";

    if (!url) {
      console.error(
        "No database configured. Run: spillover login\n" +
          "Or set SPILLOVER_DATABASE_URL environment variable."
      );
      process.exit(1);
    }

    _sql = postgres(url, { ssl: "require" });
  }
  return _sql;
}

export function getProjects(): ConfigProject[] {
  return (config.get("projects") as ConfigProject[]) || [];
}

export function requireUser(): { userId: string; githubHandle: string } {
  const userId = config.get("user_id") as string;
  const githubHandle = (config.get("github_handle") as string) || userId;
  if (!userId) {
    console.error("Not logged in. Run: spillover login");
    process.exit(1);
  }
  return { userId, githubHandle };
}

export function requireProjects(): {
  projects: ConfigProject[];
  userId: string;
  githubHandle: string;
} {
  const { userId, githubHandle } = requireUser();
  const projects = getProjects();
  if (projects.length === 0) {
    console.error("No projects. Join or create one at https://spillover-app.vercel.app");
    process.exit(1);
  }
  return { projects, userId, githubHandle };
}

/** @deprecated — use requireProjects() for multi-project support */
export function requireProject(): { projectId: string; userId: string } {
  const { projects, userId } = requireProjects();
  return { projectId: projects[0].id, userId };
}
