"use client";

interface Task {
  id: string;
  prompt: string;
  repo_url: string;
  submitted_by: string;
  assigned_to: string | null;
  status: string;
  result_branch: string | null;
  tokens_used: number | null;
  created_at: string;
}

interface Member {
  user_id: string;
  github_handle: string;
  email: string;
}

interface TaskLogProps {
  tasks: Task[];
  members: Member[];
}

const statusConfig: Record<string, { dot: string; color: string }> = {
  queued: { dot: "bg-[var(--color-text-muted)]", color: "var(--color-text-muted)" },
  running: { dot: "bg-[var(--color-accent)] pulse", color: "var(--color-accent)" },
  done: { dot: "bg-[var(--color-green)]", color: "var(--color-green)" },
  failed: { dot: "bg-[var(--color-red)]", color: "var(--color-red)" },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
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

export function TaskLog({ tasks, members }: TaskLogProps) {
  const memberMap = new Map(members.map((m) => [m.user_id, m]));
  const getName = (id: string) => {
    const m = memberMap.get(id);
    return m?.github_handle || m?.email || id.slice(0, 8);
  };

  if (tasks.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)] text-sm">
        No tasks yet.
      </p>
    );
  }

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_80px_60px_50px] gap-4 px-5 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
        <div>task</div>
        <div>route</div>
        <div className="text-right">tokens</div>
        <div className="text-right">time</div>
        <div className="text-center">status</div>
      </div>

      {/* Rows */}
      {tasks.map((task, i) => {
        const status = statusConfig[task.status] || statusConfig.queued;
        const wasSpilled =
          task.assigned_to && task.assigned_to !== task.submitted_by;

        return (
          <div
            key={task.id}
            className={`grid grid-cols-[1fr_100px_80px_60px_50px] gap-4 px-5 py-3 items-center hover:bg-[var(--color-surface-hover)] transition-colors ${
              i < tasks.length - 1 ? "border-b border-[var(--color-border)]" : ""
            }`}
          >
            {/* Task prompt */}
            <div className="min-w-0">
              <p className="text-sm text-[var(--color-text-primary)] truncate">
                {task.prompt}
              </p>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {getName(task.submitted_by)}
                {task.repo_url && (
                  <span className="ml-2 text-[var(--color-text-muted)]">
                    {task.repo_url.replace(/^https?:\/\/(github\.com\/)?/, "")}
                  </span>
                )}
              </span>
            </div>

            {/* Route */}
            <div className="text-[11px]">
              {wasSpilled ? (
                <span className="text-[var(--color-accent)]">
                  → {getName(task.assigned_to!)}
                </span>
              ) : (
                <span className="text-[var(--color-text-muted)]">local</span>
              )}
            </div>

            {/* Tokens */}
            <div className="text-right text-[11px] tabular-nums text-[var(--color-text-secondary)]">
              {task.tokens_used ? formatTokens(Number(task.tokens_used)) : "—"}
            </div>

            {/* Time */}
            <div className="text-right text-[11px] tabular-nums text-[var(--color-text-muted)]">
              {timeAgo(task.created_at)}
            </div>

            {/* Status dot */}
            <div className="flex justify-center">
              <div
                className={`w-2 h-2 rounded-full ${status.dot}`}
                title={task.status}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
