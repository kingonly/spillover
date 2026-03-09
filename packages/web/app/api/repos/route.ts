import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/repos?project=<id> — list repos for a project
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("project");
  if (!projectId) return NextResponse.json({ error: "project required" }, { status: 400 });

  const githubHandle = (session.user as any).githubHandle || "";
  const membership = await sql`
    SELECT 1 FROM members
    WHERE project_id = ${projectId}
      AND (user_id = ${githubHandle} OR github_handle = ${githubHandle})
    LIMIT 1
  `;
  if (membership.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const repos = await sql`
    SELECT * FROM project_repos WHERE project_id = ${projectId} ORDER BY added_at DESC
  `;
  return NextResponse.json(repos);
}

// POST /api/repos — link a repo to a project
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, repoFullName } = await req.json();
  if (!projectId || !repoFullName) {
    return NextResponse.json({ error: "projectId and repoFullName required" }, { status: 400 });
  }

  const githubHandle = (session.user as any).githubHandle || "";
  const membership = await sql`
    SELECT 1 FROM members
    WHERE project_id = ${projectId}
      AND (user_id = ${githubHandle} OR github_handle = ${githubHandle})
    LIMIT 1
  `;
  if (membership.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await sql`
    INSERT INTO project_repos (project_id, repo_full_name, added_by)
    VALUES (${projectId}, ${repoFullName}, ${githubHandle})
    ON CONFLICT (project_id, repo_full_name) DO NOTHING
    RETURNING *
  `;

  return NextResponse.json(result[0] || { already_exists: true });
}

// DELETE /api/repos — unlink a repo
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, repoFullName } = await req.json();
  if (!projectId || !repoFullName) {
    return NextResponse.json({ error: "projectId and repoFullName required" }, { status: 400 });
  }

  const githubHandle = (session.user as any).githubHandle || "";
  const membership = await sql`
    SELECT 1 FROM members
    WHERE project_id = ${projectId}
      AND (user_id = ${githubHandle} OR github_handle = ${githubHandle})
    LIMIT 1
  `;
  if (membership.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await sql`
    DELETE FROM project_repos
    WHERE project_id = ${projectId} AND repo_full_name = ${repoFullName}
  `;

  return NextResponse.json({ ok: true });
}
