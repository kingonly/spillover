"use client";

import { useState } from "react";
import { RepoPicker } from "./repo-picker";
import { IssueLog } from "./issue-log";

interface Repo {
  repo_full_name: string;
}

interface Member {
  user_id: string;
  github_handle: string;
  email: string;
}

export function ReposAndIssues({
  projectId,
  initialRepos,
  members,
}: {
  projectId: string;
  initialRepos: Repo[];
  members: Member[];
}) {
  const [repoVersion, setRepoVersion] = useState(0);
  const [repoCount, setRepoCount] = useState(initialRepos.length);

  return (
    <>
      <section className="mb-16">
        <SectionTitle>repositories</SectionTitle>
        <RepoPicker
          projectId={projectId}
          initialRepos={initialRepos}
          onReposChange={(count) => {
            setRepoCount(count);
            setRepoVersion((v) => v + 1);
          }}
        />
      </section>

      <section className="mb-16">
        <SectionTitle>issues</SectionTitle>
        {repoCount > 0 ? (
          <IssueLog projectId={projectId} members={members} refreshKey={repoVersion} />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Add a repository above to see spillover-labeled issues.
          </p>
        )}
      </section>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-6">
      {children}
    </h2>
  );
}
