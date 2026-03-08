import { sql } from "@/lib/db";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatsRow } from "./components/stats-row";
import { TeamGrid } from "./components/team-grid";
import { TaskLog } from "./components/task-log";
import { UserMenu } from "./components/user-menu";

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
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { project, members, tasks, usageLogs } = await getData();

  const user = session.user as any;

  if (!project) {
    return (
      <main className="flex items-center justify-center min-h-screen px-8">
        <div className="max-w-lg w-full">
          <div className="text-4xl mb-3 text-shimmer font-bold tracking-tight">spillover</div>
          <p className="text-[var(--color-text-secondary)] text-sm mb-10">
            Pool your team&apos;s Claude Code capacity. No tokens left behind.
          </p>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 mb-6">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-4">get started</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[var(--color-text-secondary)] mb-2">1. Install the CLI</p>
                <code className="block bg-[var(--color-bg)] px-4 py-2.5 rounded border border-[var(--color-border)] text-[var(--color-accent)]">
                  npm i -g spillover
                </code>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)] mb-2">2. Create a project</p>
                <code className="block bg-[var(--color-bg)] px-4 py-2.5 rounded border border-[var(--color-border)] text-[var(--color-accent)]">
                  spillover init my-team
                </code>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)] mb-2">3. Share with your team and start the agent</p>
                <div className="bg-[var(--color-bg)] px-4 py-2.5 rounded border border-[var(--color-border)] space-y-1">
                  <code className="block text-[var(--color-accent)]">spillover join &lt;project-id&gt;</code>
                  <code className="block text-[var(--color-accent)]">spillover agent</code>
                </div>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)] mb-2">4. Submit tasks — they auto-route to whoever has spare capacity</p>
                <code className="block bg-[var(--color-bg)] px-4 py-2.5 rounded border border-[var(--color-border)] text-[var(--color-accent)]">
                  spillover run &quot;fix the auth bug&quot; --repo github.com/team/app
                </code>
              </div>
            </div>
          </div>

          <p className="text-[var(--color-text-muted)] text-xs">
            This dashboard will show your team&apos;s usage and tasks once a project is created.
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

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <main className="max-w-6xl mx-auto px-8 py-16">
      <div className="flex items-start justify-between mb-16">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl font-bold tracking-tight text-shimmer">
              spillover
            </div>
            <div className="h-5 w-px bg-[var(--color-border)]" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              {project.name}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            pool your team&apos;s claude code capacity
          </p>
        </div>
        <UserMenu
          name={user.githubHandle || user.name || user.email || ""}
          image={user.image}
          signOutAction={handleSignOut}
        />
      </div>

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
