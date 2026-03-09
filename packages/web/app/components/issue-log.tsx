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

interface BrowseIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  user: string;
  labels: { name: string; color: string }[];
  created_at: string;
  repo: string;
  hasSpilloverLabel: boolean;
}

interface Member {
  user_id: string;
  github_handle: string;
  email: string;
}

export function IssueLog({
  projectId,
  members,
  refreshKey,
}: {
  projectId: string;
  members: Member[];
  refreshKey?: number;
}) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrowser, setShowBrowser] = useState(false);

  const loadIssues = () => {
    setLoading(true);
    fetch(`/api/github/issues?project=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setIssues(data);
      })
      .finally(() => setLoading(false));
  };

  const addIssueOptimistically = (browsed: { number: number; title: string; html_url: string; user: string; labels: { name: string; color: string }[]; created_at: string; repo: string; id: number }) => {
    setIssues((prev) => [
      ...prev,
      {
        id: browsed.id,
        number: browsed.number,
        title: browsed.title,
        html_url: browsed.html_url,
        user: browsed.user,
        labels: [...browsed.labels, { name: "spillover", color: "1f6feb" }],
        created_at: browsed.created_at,
        repo: browsed.repo,
        spillover: null,
      },
    ]);
  };

  useEffect(() => {
    loadIssues();
  }, [projectId, refreshKey]);

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

  return (
    <div>
      {/* Queued/active issues */}
      {issues.length > 0 ? (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden mb-4">
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
                <div className="text-[11px] text-[var(--color-text-secondary)] truncate">
                  {issue.repo.split("/").pop()}
                </div>
                <div className="text-[11px]">
                  {s?.assigned_to ? (
                    <span className="text-[var(--color-accent)]">
                      {getName(s.assigned_to)}
                    </span>
                  ) : (
                    <span className="text-[var(--color-text-muted)]">
                      waiting
                    </span>
                  )}
                </div>
                <div className="text-right text-[11px] tabular-nums text-[var(--color-text-secondary)]">
                  {s?.tokens_used ? formatTokens(Number(s.tokens_used)) : "—"}
                </div>
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
      ) : (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 text-center mb-4">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">
            No spillover issues queued yet.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Select an issue below to queue it for your team.
          </p>
        </div>
      )}

      {/* Browse & queue button */}
      {!showBrowser ? (
        <button
          onClick={() => setShowBrowser(true)}
          className="text-xs text-[var(--color-accent)] hover:underline cursor-pointer"
        >
          + queue an issue
        </button>
      ) : (
        <IssueBrowser
          projectId={projectId}
          queuedIssueKeys={new Set(
            issues.map((i) => `${i.repo}#${i.number}`),
          )}
          onQueued={(issue) => {
            addIssueOptimistically(issue);
          }}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  );
}

function IssueBrowser({
  projectId,
  queuedIssueKeys,
  onQueued,
  onClose,
}: {
  projectId: string;
  queuedIssueKeys: Set<string>;
  onQueued: (issue: BrowseIssue) => void;
  onClose: () => void;
}) {
  const [issues, setIssues] = useState<BrowseIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [queuingId, setQueuingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/github/issues/browse?project=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setIssues(data);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const queueIssue = async (issue: BrowseIssue) => {
    setQueuingId(issue.id);
    try {
      const res = await fetch("/api/github/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: issue.repo,
          issueNumber: issue.number,
        }),
      });
      if (res.ok) {
        // Mark it as queued locally and notify parent
        setIssues((prev) =>
          prev.map((i) =>
            i.id === issue.id ? { ...i, hasSpilloverLabel: true } : i,
          ),
        );
        onQueued(issue);
      }
    } finally {
      setQueuingId(null);
    }
  };

  const filtered = issues.filter(
    (i) =>
      !i.hasSpilloverLabel &&
      !queuedIssueKeys.has(`${i.repo}#${i.number}`) &&
      (search === "" ||
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        `#${i.number}`.includes(search)),
  );

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          select an issue to queue
        </span>
        <button
          onClick={onClose}
          className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
        >
          close
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="search issues..."
        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-3"
        autoFocus
      />

      {loading ? (
        <p className="text-xs text-[var(--color-text-muted)] py-2">
          Loading issues...
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)] py-2">
          {search
            ? "No matching issues"
            : "All open issues are already queued"}
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.slice(0, 20).map((issue) => (
            <div
              key={issue.id}
              className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <div className="min-w-0 mr-3">
                <p className="text-sm text-[var(--color-text-primary)] truncate">
                  {issue.title}
                </p>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {issue.repo.split("/").pop()}#{issue.number} · {issue.user}
                </span>
              </div>
              <button
                onClick={() => queueIssue(issue)}
                disabled={queuingId === issue.id}
                className="shrink-0 text-xs text-[var(--color-accent)] border border-[var(--color-accent)] rounded px-3 py-1 hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] cursor-pointer transition-colors disabled:opacity-50"
              >
                {queuingId === issue.id ? "..." : "queue"}
              </button>
            </div>
          ))}
        </div>
      )}
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
