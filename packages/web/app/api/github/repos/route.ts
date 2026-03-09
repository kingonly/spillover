import { auth } from "@/lib/auth";
import { listUserRepos } from "@/lib/github";
import { NextResponse } from "next/server";

// GET /api/github/repos — list the authenticated user's GitHub repos
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = (session as any).accessToken;
  if (!accessToken) {
    return NextResponse.json(
      { error: "No GitHub token. Sign out and back in to grant repo access." },
      { status: 403 },
    );
  }

  try {
    const repos = await listUserRepos(accessToken);
    return NextResponse.json(
      repos.map((r) => ({
        full_name: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: r.private,
        description: r.description,
        pushed_at: r.pushed_at,
      })),
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
