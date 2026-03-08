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

function getStatusColor(percent: number) {
  if (percent < 30) return "bg-emerald-500";
  if (percent < 50) return "bg-emerald-400";
  if (percent < 70) return "bg-yellow-400";
  if (percent < 90) return "bg-orange-400";
  return "bg-red-500";
}

function getStatusLabel(percent: number) {
  if (percent < 30) return "overflowing";
  if (percent < 50) return "plenty to give";
  if (percent < 70) return "comfortable";
  if (percent < 90) return "running warm";
  return "near limit";
}

export function TeamGrid({ members, usageMap }: TeamGridProps) {
  if (members.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No team members yet. Share your project ID with teammates.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((member) => {
        const usage = usageMap[member.user_id];
        const percent = Number(usage?.usage_percent || 0);
        const name =
          member.github_handle || member.email || member.user_id.slice(0, 8);

        return (
          <div
            key={member.user_id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-white">@{name}</span>
              <span className="text-sm text-gray-400">
                {getStatusLabel(percent)}
              </span>
            </div>

            {/* Usage bar */}
            <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full transition-all ${getStatusColor(percent)}`}
                style={{ width: `${Math.max(percent, 2)}%` }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{percent}% used</span>
              <span className="text-gray-500">{100 - percent}% available</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
