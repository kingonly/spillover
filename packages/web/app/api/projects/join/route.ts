import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/projects/join — join a project by code
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  const githubHandle = (session.user as any).githubHandle || "";
  const email = session.user.email || "";

  // Find project by code (case-insensitive)
  const projects = await sql`
    SELECT * FROM projects WHERE upper(code) = upper(${code.trim()})
  `;

  if (projects.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = projects[0];

  // Add member
  await sql`
    INSERT INTO members (project_id, user_id, email, github_handle)
    VALUES (${project.id}, ${githubHandle}, ${email}, ${githubHandle})
    ON CONFLICT (project_id, user_id) DO UPDATE SET
      email = EXCLUDED.email,
      github_handle = EXCLUDED.github_handle
  `;

  return NextResponse.json(project);
}
