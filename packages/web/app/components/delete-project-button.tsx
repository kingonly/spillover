"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5 text-xs">
        <span className="text-[var(--color-red)]">delete {projectName}?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-[var(--color-red)] hover:underline cursor-pointer disabled:opacity-50"
        >
          {deleting ? "..." : "yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[var(--color-text-muted)] hover:underline cursor-pointer"
        >
          no
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors cursor-pointer"
      title="Delete project"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
  );
}
