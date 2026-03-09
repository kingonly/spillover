import Conf from "conf";
import postgres from "postgres";

// Local config stored in ~/.config/spillover/config.json
export const config = new Conf({
  projectName: "spillover",
  schema: {
    user_id: { type: "string" },
    email: { type: "string" },
    github_handle: { type: "string" },
    github_token: { type: "string" },
    project_id: { type: "string" },
    project_name: { type: "string" },
    database_url: { type: "string" },
  },
});

let _sql: postgres.Sql | null = null;

export function getDb(): postgres.Sql {
  if (!_sql) {
    const url =
      (config.get("database_url") as string) ||
      process.env.SPILLOVER_DATABASE_URL ||
      "";

    if (!url) {
      console.error(
        "No database configured. Run: spillover init\n" +
          "Or set SPILLOVER_DATABASE_URL environment variable."
      );
      process.exit(1);
    }

    _sql = postgres(url, { ssl: "require" });
  }
  return _sql;
}

export function requireProject(): { projectId: string; userId: string } {
  const projectId = config.get("project_id") as string;
  const userId = config.get("user_id") as string;
  if (!projectId || !userId) {
    console.error("Not connected to a project. Run: spillover init");
    process.exit(1);
  }
  return { projectId, userId };
}
