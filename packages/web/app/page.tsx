import { sql } from "@/lib/db";
import { Header } from "./components/header";
import { StatsRow } from "./components/stats-row";
import { TeamGrid } from "./components/team-grid";
import { TaskLog } from "./components/task-log";

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
          <div className="text-5xl mb-6 text-shimmer font-bold tracking-tight">spillover</div>
          <p className="text-[var(--color-text-secondary)] text-sm">
            No projects yet. Run{" "}
            <code className="bg-[var(--color-surface)] px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-accent)]">
              spillover init
            </code>
          </p>
        </div>
      </main>
    );
  }

  const usageMap = Object.fromEntries(usageLogs.map((u: any) => [u.user_id, u]));

  const spilledTasks = tasks.filter(
    (t: any) => t.assigned_to && t.assigned_to !== t.submitted_by
  ).length;
  const totalTokensSaved = tasks
    .filter(
      (t: any) => t.assigned_to && t.assigned_to !== t.submitted_by && t.tokens_used
    )
    .reduce((sum: number, t: any) => sum + Number(t.tokens_used || 0), 0);
  const avgUsage =
    usageLogs.length > 0
      ? Math.round(
          usageLogs.reduce((sum: number, u: any) => sum + Number(u.usage_percent), 0) /
            usageLogs.length
        )
      : 0;

  return (
    <main className="max-w-6xl mx-auto px-8 py-16">
      <Header projectName={project.name} />

      <StatsRow
        totalMembers={members.length}
        avgUsage={avgUsage}
        spilledTasks={spilledTasks}
        totalTokensSaved={totalTokensSaved}
      />

      <section className="mb-16">
        <SectionTitle>team hydration</SectionTitle>
        <TeamGrid members={members} usageMap={usageMap} />
      </section>

      <section>
        <SectionTitle>activity</SectionTitle>
        <TaskLog tasks={tasks} members={members} />
      </section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-6">
      {children}
    </h2>
  );
}
