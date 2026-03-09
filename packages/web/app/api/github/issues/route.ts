import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listSpilloverIssues } from "@/lib/github";
import { NextRequest, NextResponse } from "next/server";

// GET /api/github/issues?project=<id> — fetch spillover-labeled issues from all linked repos
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("project");
  if (!projectId) return NextResponse.json({ error: "project required" }, { status: 400 });

  const accessToken = (session as any).accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No GitHub token" }, { status: 403 });
  }

  // Get linked repos
  const repos = await sql`
    SELECT repo_full_name FROM project_repos WHERE project_id = ${projectId}
  `;

  // Fetch issues from all repos in parallel
  const issueResults = await Promise.allSettled(
    repos.map(async (r: any) => {
      const issues = await listSpilloverIssues(accessToken, r.repo_full_name);
      return issues.map((i) => ({ ...i, _repo: r.repo_full_name }));
    }),
  );

  const allIssues = issueResults
    .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Get local task tracking data for these issues
  const repoNames = repos.map((r: any) => r.repo_full_name);
  const localTasks =
    repoNames.length > 0
      ? await sql`
          SELECT * FROM tasks
          WHERE github_repo_full_name = ANY(${repoNames})
            AND github_issue_number IS NOT NULL
        `
      : [];

  const taskMap = new Map(
    localTasks.map((t: any) => [
      `${t.github_repo_full_name}#${t.github_issue_number}`,
      t,
    ]),
  );

  const enriched = allIssues.map((issue: any) => ({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    html_url: issue.html_url,
    user: issue.user.login,
    labels: issue.labels.map((l: any) => ({ name: l.name, color: l.color })),
    created_at: issue.created_at,
    repo: issue._repo,
    spillover: taskMap.get(`${issue._repo}#${issue.number}`) || null,
  }));

  return NextResponse.json(enriched);
}
