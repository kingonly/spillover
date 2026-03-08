import { sql } from "@/lib/db";
import { TeamGrid } from "./components/team-grid";
import { TaskLog } from "./components/task-log";
import { StatsBar } from "./components/stats-bar";

export const dynamic = "force-dynamic";

async function getData() {
  const projects = await sql`
    SELECT * FROM projects ORDER BY created_at DESC LIMIT 1
  `;

  if (projects.length === 0) {
    return { project: null, members: [], tasks: [], usageLogs: [] };
  }

  const project = projects[0];

  const [members, tasks, usageLogs] = await Promise.all([
    sql`SELECT * FROM members WHERE project_id = ${project.id}` as any as Promise<any[]>,
    sql`SELECT * FROM tasks WHERE project_id = ${project.id} ORDER BY created_at DESC LIMIT 20` as any as Promise<any[]>,
    sql`SELECT * FROM usage_logs WHERE date = current_date AND user_id = ANY(
      SELECT user_id FROM members WHERE project_id = ${project.id}
    )` as any as Promise<any[]>,
  ]);

  return { project, members, tasks, usageLogs };
}

export default async function Home() {
  const { project, members, tasks, usageLogs } = await getData();

  if (!project) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl mb-4">💧 spillover</h1>
          <p className="text-gray-400">
            No projects yet. Run{" "}
            <code className="bg-gray-800 px-2 py-1 rounded">spillover init</code>{" "}
            to get started.
          </p>
        </div>
      </main>
    );
  }

  const usageMap = Object.fromEntries(usageLogs.map((u) => [u.user_id, u]));

  const spilledTasks = tasks.filter(
    (t) => t.assigned_to && t.assigned_to !== t.submitted_by
  ).length;
  const totalTokensSaved = tasks
    .filter(
      (t) => t.assigned_to && t.assigned_to !== t.submitted_by && t.tokens_used
    )
    .reduce((sum, t) => sum + Number(t.tokens_used || 0), 0);
  const avgUsage =
    usageLogs.length > 0
      ? Math.round(
          usageLogs.reduce((sum, u) => sum + Number(u.usage_percent), 0) /
            usageLogs.length
        )
      : 0;

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-1">
          <span className="text-cyan-400">💧</span> spillover
        </h1>
        <p className="text-gray-500">{project.name} — team capacity dashboard</p>
      </div>

      <StatsBar
        totalMembers={members.length}
        avgUsage={avgUsage}
        spilledTasks={spilledTasks}
        totalTokensSaved={totalTokensSaved}
      />

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 text-gray-300">
          Team hydration
        </h2>
        <TeamGrid members={members} usageMap={usageMap} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-300">
          Recent tasks
        </h2>
        <TaskLog tasks={tasks} members={members} />
      </section>
    </main>
  );
}
