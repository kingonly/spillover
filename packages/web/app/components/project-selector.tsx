"use client";

import { useRouter } from "next/navigation";

interface ProjectSelectorProps {
  projects: { id: string; name: string }[];
  currentProjectId: string;
}

export function ProjectSelector({
  projects,
  currentProjectId,
}: ProjectSelectorProps) {
  const router = useRouter();

  return (
    <select
      value={currentProjectId}
      onChange={(e) => router.push(`/?project=${e.target.value}`)}
      className="bg-transparent text-sm text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded px-2 py-1 cursor-pointer hover:border-[var(--color-border-hover)] transition-colors outline-none"
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id} className="bg-[var(--color-surface)]">
          {p.name}
        </option>
      ))}
    </select>
  );
}
