const GITHUB_API = "https://api.github.com";

async function githubFetch(path: string, accessToken: string, options?: RequestInit) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options?.headers,
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function listUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  return githubFetch(
    "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member",
    accessToken,
  );
}

export async function listSpilloverIssues(
  accessToken: string,
  repoFullName: string,
): Promise<GitHubIssue[]> {
  return githubFetch(
    `/repos/${repoFullName}/issues?labels=spillover&state=open&per_page=50`,
    accessToken,
  );
}

export async function addIssueComment(
  accessToken: string,
  repoFullName: string,
  issueNumber: number,
  body: string,
) {
  return githubFetch(
    `/repos/${repoFullName}/issues/${issueNumber}/comments`,
    accessToken,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}

// Types for GitHub API responses (minimal, what we need)
export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string; avatar_url: string };
  private: boolean;
  html_url: string;
  description: string | null;
  pushed_at: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  user: { login: string; avatar_url: string };
  labels: { name: string; color: string }[];
  assignees: { login: string }[];
  created_at: string;
  updated_at: string;
}
