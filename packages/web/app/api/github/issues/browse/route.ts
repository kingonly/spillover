import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/github/issues/browse?project=<id> — list all open issues from linked repos
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("project");
  if (!projectId) return NextResponse.json({ error: "project required" }, { status: 400 });

  const accessToken = (session as any).accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No GitHub token" }, { status: 403 });
  }

  const repos = await sql`
    SELECT repo_full_name FROM project_repos WHERE project_id = ${projectId}
  `;

  const results = await Promise.allSettled(
    repos.map(async (r: any) => {
      const res = await fetch(
        `https://api.github.com/repos/${r.repo_full_name}/issues?state=open&per_page=30&sort=updated`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      if (!res.ok) return [];
      const issues = await res.json();
      return issues
        .filter((i: any) => !i.pull_request) // exclude PRs
        .map((i: any) => ({
          id: i.id,
          number: i.number,
          title: i.title,
          html_url: i.html_url,
          user: i.user.login,
          labels: i.labels.map((l: any) => ({ name: l.name, color: l.color })),
          created_at: i.created_at,
          repo: r.repo_full_name,
          hasSpilloverLabel: i.labels.some((l: any) => l.name === "spillover"),
        }));
    }),
  );

  const allIssues = results
    .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  return NextResponse.json(allIssues);
}
