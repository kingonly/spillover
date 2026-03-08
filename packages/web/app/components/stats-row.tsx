"use client";

interface StatsRowProps {
  totalMembers: number;
  avgUsage: number;
  spilledTasks: number;
  totalTokensSaved: number;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function StatsRow({
  totalMembers,
  avgUsage,
  spilledTasks,
  totalTokensSaved,
}: StatsRowProps) {
  const stats = [
    { label: "members", value: totalMembers, accent: false },
    { label: "avg load", value: `${avgUsage}%`, accent: false },
    { label: "spilled", value: spilledTasks, accent: true },
    { label: "tokens saved", value: formatTokens(totalTokensSaved), accent: true },
  ];

  return (
    <div className="grid grid-cols-4 gap-px mb-16 bg-[var(--color-border)] rounded-lg overflow-hidden">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-[var(--color-surface)] px-5 py-5"
        >
          <div
            className={`text-2xl font-bold tabular-nums ${
              stat.accent ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"
            }`}
          >
            {stat.value}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
