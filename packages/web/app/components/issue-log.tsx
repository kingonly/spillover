"use client";

import { useEffect, useState } from "react";

interface SpilloverMeta {
  assigned_to: string | null;
  status: string;
  tokens_used: number | null;
  result_branch: string | null;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  user: string;
  labels: { name: string; color: string }[];
  created_at: string;
  repo: string;
  spillover: SpilloverMeta | null;
}

interface Member {
  user_id: string;
  github_handle: string;
  email: string;
}

export function IssueLog({
  projectId,
  members,
}: {
  projectId: string;
  members: Member[];
}) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/github/issues?project=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setIssues(data);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const getName = (id: string) => {
    const m = members.find(
      (m) => m.user_id === id || m.github_handle === id,
    );
    return m?.github_handle || id;
  };

  if (loading) {
    return (
      <p className="text-[var(--color-text-muted)] text-sm">
        Loading issues...
      </p>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 text-center">
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
          No spillover-labeled issues found.
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Add the <code className="text-[var(--color-accent)]">spillover</code>{" "}
          label to a GitHub issue to queue it for your team.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_140px_100px_80px_50px] gap-4 px-5 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
        <div>issue</div>
        <div>repo</div>
        <div>assignee</div>
        <div className="text-right">tokens</div>
        <div className="text-center">status</div>
      </div>

      {issues.map((issue, i) => {
        const s = issue.spillover;
        const statusDot = s
          ? statusConfig[s.status] || statusConfig.queued
          : { dot: "bg-[var(--color-text-muted)]", title: "open" };

        return (
          <div
            key={`${issue.repo}#${issue.number}`}
            className={`grid grid-cols-[1fr_140px_100px_80px_50px] gap-4 px-5 py-3 items-center hover:bg-[var(--color-surface-hover)] transition-colors ${
              i < issues.length - 1
                ? "border-b border-[var(--color-border)]"
                : ""
            }`}
          >
            {/* Issue title */}
            <div className="min-w-0">
              <a
                href={issue.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-text-primary)] hover:text-[var(--color-accent)] truncate block transition-colors"
              >
                {issue.title}
              </a>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                #{issue.number} by {issue.user} · {timeAgo(issue.created_at)}
              </span>
            </div>

            {/* Repo */}
            <div className="text-[11px] text-[var(--color-text-secondary)] truncate">
              {issue.repo.split("/").pop()}
            </div>

            {/* Assignee */}
            <div className="text-[11px]">
              {s?.assigned_to ? (
                <span className="text-[var(--color-accent)]">
                  {getName(s.assigned_to)}
                </span>
              ) : (
                <span className="text-[var(--color-text-muted)]">—</span>
              )}
            </div>

            {/* Tokens */}
            <div className="text-right text-[11px] tabular-nums text-[var(--color-text-secondary)]">
              {s?.tokens_used ? formatTokens(Number(s.tokens_used)) : "—"}
            </div>

            {/* Status */}
            <div className="flex justify-center">
              <div
                className={`w-2 h-2 rounded-full ${statusDot.dot}`}
                title={statusDot.title}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const statusConfig: Record<string, { dot: string; title: string }> = {
  queued: { dot: "bg-[var(--color-text-muted)]", title: "queued" },
  running: { dot: "bg-[var(--color-accent)] pulse", title: "running" },
  done: { dot: "bg-[var(--color-green)]", title: "done" },
  failed: { dot: "bg-[var(--color-red)]", title: "failed" },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
