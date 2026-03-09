"use client";

import { useEffect, useState } from "react";

interface Repo {
  repo_full_name: string;
}

interface GitHubRepo {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  description: string | null;
}

export function RepoPicker({
  projectId,
  initialRepos,
}: {
  projectId: string;
  initialRepos: Repo[];
}) {
  const [linkedRepos, setLinkedRepos] = useState(initialRepos);
  const [allRepos, setAllRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!showPicker || allRepos.length > 0) return;
    setLoading(true);
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((repos) => {
        if (Array.isArray(repos)) setAllRepos(repos);
      })
      .finally(() => setLoading(false));
  }, [showPicker, allRepos.length]);

  const linkedSet = new Set(linkedRepos.map((r) => r.repo_full_name));

  const addRepo = async (fullName: string) => {
    await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, repoFullName: fullName }),
    });
    setLinkedRepos((prev) => [...prev, { repo_full_name: fullName }]);
  };

  const removeRepo = async (fullName: string) => {
    await fetch("/api/repos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, repoFullName: fullName }),
    });
    setLinkedRepos((prev) =>
      prev.filter((r) => r.repo_full_name !== fullName),
    );
  };

  const filteredRepos = allRepos.filter(
    (r) =>
      !linkedSet.has(r.full_name) &&
      r.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Linked repos */}
      {linkedRepos.length > 0 ? (
        <div className="space-y-2 mb-4">
          {linkedRepos.map((r) => (
            <div
              key={r.repo_full_name}
              className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <RepoIcon />
                <span className="text-sm text-[var(--color-text-primary)]">
                  {r.repo_full_name}
                </span>
              </div>
              <button
                onClick={() => removeRepo(r.repo_full_name)}
                className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors cursor-pointer"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          No repos linked yet. Add a repo to see spillover-labeled issues.
        </p>
      )}

      {/* Add repo */}
      {!showPicker ? (
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-[var(--color-accent)] hover:underline cursor-pointer"
        >
          + add repository
        </button>
      ) : (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search repos..."
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-3"
            autoFocus
          />
          {loading ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Loading repos...
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredRepos.slice(0, 20).map((r) => (
                <button
                  key={r.full_name}
                  onClick={() => addRepo(r.full_name)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
                >
                  <RepoIcon />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {r.full_name}
                  </span>
                  {r.private && (
                    <span className="text-[10px] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1">
                      private
                    </span>
                  )}
                </button>
              ))}
              {filteredRepos.length === 0 && !loading && (
                <p className="text-xs text-[var(--color-text-muted)] px-3 py-2">
                  {search ? "No matching repos" : "No repos available"}
                </p>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setShowPicker(false);
              setSearch("");
            }}
            className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mt-3 cursor-pointer"
          >
            cancel
          </button>
        </div>
      )}
    </div>
  );
}

function RepoIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="text-[var(--color-text-muted)]"
    >
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
    </svg>
  );
}
