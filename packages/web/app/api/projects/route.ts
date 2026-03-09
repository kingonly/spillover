import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SPILL-${code}`;
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const githubHandle = (session.user as any).githubHandle || "";
  const email = session.user.email || "";
  const code = generateCode();

  const projects = await sql`
    INSERT INTO projects (name, created_by, code)
    VALUES (${name.trim()}, ${githubHandle}, ${code})
    RETURNING *
  `;

  const project = projects[0];

  // Add creator as member
  await sql`
    INSERT INTO members (project_id, user_id, email, github_handle)
    VALUES (${project.id}, ${githubHandle}, ${email}, ${githubHandle})
    ON CONFLICT (project_id, user_id) DO NOTHING
  `;

  return NextResponse.json(project);
}
