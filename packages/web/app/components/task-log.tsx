"use client";

interface Task {
  id: string;
  prompt: string;
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

const statusConfig: Record<string, { icon: string; color: string; label: string }> = {
  queued: { icon: "⏳", color: "text-gray-400", label: "queued" },
  running: { icon: "🔄", color: "text-cyan-400", label: "running" },
  done: { icon: "✅", color: "text-emerald-400", label: "done" },
  failed: { icon: "❌", color: "text-red-400", label: "failed" },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function TaskLog({ tasks, members }: TaskLogProps) {
  const memberMap = new Map(members.map((m) => [m.user_id, m]));
  const getName = (id: string) => {
    const m = memberMap.get(id);
    return m?.github_handle || m?.email || id.slice(0, 8);
  };

  if (tasks.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No tasks yet. Run <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">spillover run &quot;your prompt&quot;</code>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const status = statusConfig[task.status] || statusConfig.queued;
        const wasSpilled =
          task.assigned_to && task.assigned_to !== task.submitted_by;

        return (
          <div
            key={task.id}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-4"
          >
            {/* Status icon */}
            <span className="text-lg flex-shrink-0">{status.icon}</span>

            {/* Prompt */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {task.prompt}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">
                  by @{getName(task.submitted_by)}
                </span>
                {wasSpilled && (
                  <span className="text-xs text-cyan-400">
                    💧 spilled to @{getName(task.assigned_to!)}
                  </span>
                )}
                {task.result_branch && (
                  <span className="text-xs text-gray-600">
                    → {task.result_branch}
                  </span>
                )}
              </div>
            </div>

            {/* Tokens */}
            {task.tokens_used && (
              <span className="text-xs text-gray-500 flex-shrink-0">
                {Number(task.tokens_used).toLocaleString()} tokens
              </span>
            )}

            {/* Time */}
            <span className="text-xs text-gray-600 flex-shrink-0 w-16 text-right">
              {timeAgo(task.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
