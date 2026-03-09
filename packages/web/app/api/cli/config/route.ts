import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/cli/config?github_handle=<handle> — returns project config for CLI
// Authenticated via GitHub token (Bearer header), not session
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  // Verify token with GitHub to get the user's handle
  const ghRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!ghRes.ok) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const ghUser = await ghRes.json();
  const githubHandle = ghUser.login;

  // Get user's projects
  const projects = await sql`
    SELECT DISTINCT p.* FROM projects p
    JOIN members m ON m.project_id = p.id
    WHERE m.github_handle = ${githubHandle}
       OR m.user_id = ${githubHandle}
    ORDER BY p.created_at DESC
  `;

  return NextResponse.json({
    github_handle: githubHandle,
    database_url: process.env.DATABASE_URL,
    projects: projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      code: p.code,
    })),
  });
}
