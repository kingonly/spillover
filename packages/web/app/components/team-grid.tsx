"use client";

interface Member {
  user_id: string;
  github_handle: string;
  email: string;
}

interface UsageLog {
  usage_percent: number;
  tokens_used: number;
}

interface TeamGridProps {
  members: Member[];
  usageMap: Record<string, UsageLog>;
}

function getBarColor(percent: number) {
  if (percent < 30) return "var(--color-green)";
  if (percent < 60) return "var(--color-accent)";
  if (percent < 80) return "var(--color-yellow)";
  if (percent < 90) return "var(--color-orange)";
  return "var(--color-red)";
}

function getBarGlow(percent: number) {
  if (percent < 30) return "rgba(52, 211, 153, 0.15)";
  if (percent < 60) return "rgba(34, 211, 238, 0.15)";
  if (percent < 80) return "rgba(251, 191, 36, 0.15)";
  if (percent < 90) return "rgba(249, 115, 22, 0.15)";
  return "rgba(239, 68, 68, 0.15)";
}

function getStatusTag(percent: number) {
  if (percent < 30) return { text: "idle", color: "var(--color-green)" };
  if (percent < 60) return { text: "active", color: "var(--color-accent)" };
  if (percent < 80) return { text: "busy", color: "var(--color-yellow)" };
  if (percent < 90) return { text: "hot", color: "var(--color-orange)" };
  return { text: "limit", color: "var(--color-red)" };
}

export function TeamGrid({ members, usageMap }: TeamGridProps) {
  if (members.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)] text-sm">
        No team members yet.
      </p>
    );
  }

  // Sort: highest usage first
  const sorted = [...members].sort((a, b) => {
    const aP = Number(usageMap[a.user_id]?.usage_percent || 0);
    const bP = Number(usageMap[b.user_id]?.usage_percent || 0);
    return bP - aP;
  });

  return (
    <div className="space-y-2">
      {sorted.map((member) => {
        const usage = usageMap[member.user_id];
        const percent = Number(usage?.usage_percent || 0);
        const name =
          member.github_handle || member.email || member.user_id.slice(0, 8);
        const color = getBarColor(percent);
        const glow = getBarGlow(percent);
        const status = getStatusTag(percent);

        return (
          <div
            key={member.user_id}
            className="group flex items-center gap-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-5 py-4 hover:border-[var(--color-border-hover)] transition-colors"
          >
            {/* Name */}
            <div className="w-28 shrink-0">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {name}
              </span>
            </div>

            {/* Bar */}
            <div className="flex-1 relative">
              <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full animate-fill"
                  style={{
                    width: `${Math.max(percent, 1)}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 12px ${glow}`,
                  }}
                />
              </div>
            </div>

            {/* Percent */}
            <div className="w-12 text-right tabular-nums text-sm" style={{ color }}>
              {percent}%
            </div>

            {/* Status tag */}
            <div
              className="w-14 text-center text-[10px] uppercase tracking-wider font-medium py-0.5 rounded-full"
              style={{
                color: status.color,
                backgroundColor: `color-mix(in srgb, ${status.color} 10%, transparent)`,
              }}
            >
              {status.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
