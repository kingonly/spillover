"use client";

interface StatsBarProps {
  totalMembers: number;
  avgUsage: number;
  spilledTasks: number;
  totalTokensSaved: number;
}

export function StatsBar({
  totalMembers,
  avgUsage,
  spilledTasks,
  totalTokensSaved,
}: StatsBarProps) {
  const stats = [
    {
      label: "Team members",
      value: totalMembers,
      icon: "👥",
    },
    {
      label: "Avg usage",
      value: `${avgUsage}%`,
      icon: "📊",
    },
    {
      label: "Tasks spilled",
      value: spilledTasks,
      icon: "💧",
    },
    {
      label: "Tokens saved",
      value:
        totalTokensSaved > 1_000_000
          ? `${(totalTokensSaved / 1_000_000).toFixed(1)}M`
          : totalTokensSaved > 1_000
          ? `${(totalTokensSaved / 1_000).toFixed(0)}K`
          : totalTokensSaved,
      icon: "💰",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4"
        >
          <div className="text-2xl mb-1">{stat.icon}</div>
          <div className="text-2xl font-bold text-white">{stat.value}</div>
          <div className="text-sm text-gray-500">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
