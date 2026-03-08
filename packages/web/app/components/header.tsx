"use client";

export function Header({ projectName }: { projectName: string }) {
  return (
    <div className="mb-16">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-3xl font-bold tracking-tight text-shimmer">
          spillover
        </div>
        <div className="h-5 w-px bg-[var(--color-border)]" />
        <span className="text-sm text-[var(--color-text-secondary)]">
          {projectName}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        pool your team&apos;s claude code capacity
      </p>
    </div>
  );
}
