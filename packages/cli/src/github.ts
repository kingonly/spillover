import { config } from "./config.js";

const GITHUB_API = "https://api.github.com";

function getToken(): string {
  const token = config.get("github_token") as string;
  if (!token) {
    console.error("No GitHub token. Run: spillover login --token ghp_...");
    process.exit(1);
  }
  return token;
}

async function githubFetch(path: string, options?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function listSpilloverIssues(repoFullName: string) {
  return githubFetch(
    `/repos/${repoFullName}/issues?labels=spillover&state=open&per_page=50`,
  );
}

export async function addIssueComment(
  repoFullName: string,
  issueNumber: number,
  body: string,
) {
  return githubFetch(
    `/repos/${repoFullName}/issues/${issueNumber}/comments`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}

export async function addLabels(
  repoFullName: string,
  issueNumber: number,
  labels: string[],
) {
  return githubFetch(
    `/repos/${repoFullName}/issues/${issueNumber}/labels`,
    { method: "POST", body: JSON.stringify({ labels }) },
  );
}

export async function removeLabel(
  repoFullName: string,
  issueNumber: number,
  label: string,
) {
  const token = getToken();
  // DELETE doesn't return JSON on success, handle 404 silently
  await fetch(
    `${GITHUB_API}/repos/${repoFullName}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
}

export async function createIssue(
  repoFullName: string,
  title: string,
  body: string,
  labels: string[],
) {
  return githubFetch(`/repos/${repoFullName}/issues`, {
    method: "POST",
    body: JSON.stringify({ title, body, labels }),
  });
}

export async function createPullRequest(
  repoFullName: string,
  head: string,
  base: string,
  title: string,
  body: string,
) {
  return githubFetch(`/repos/${repoFullName}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, head, base, body }),
  });
}
