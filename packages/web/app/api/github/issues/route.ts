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

// POST /api/github/issues — add "spillover" label to an issue
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = (session as any).accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No GitHub token" }, { status: 403 });
  }

  const { repo, issueNumber } = await req.json();
  if (!repo || !issueNumber) {
    return NextResponse.json({ error: "repo and issueNumber required" }, { status: 400 });
  }

  const githubHandle = (session.user as any).githubHandle || "";
  const membership = await sql`
    SELECT 1 FROM project_repos pr
    JOIN members m ON m.project_id = pr.project_id
    WHERE pr.repo_full_name = ${repo}
      AND (m.user_id = ${githubHandle} OR m.github_handle = ${githubHandle})
    LIMIT 1
  `;
  if (membership.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Add the "spillover" label
  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}/labels`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ labels: ["spillover"] }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: body }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
