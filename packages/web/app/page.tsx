import { sql } from "@/lib/db";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatsRow } from "./components/stats-row";
import { TeamGrid } from "./components/team-grid";
import { TaskLog } from "./components/task-log";
import { IssueLog } from "./components/issue-log";
import { RepoPicker } from "./components/repo-picker";
import { UserMenu } from "./components/user-menu";
import { ProjectSelector } from "./components/project-selector";
import { InviteButton } from "./components/invite-button";

export const dynamic = "force-dynamic";

async function getUserProjects(githubHandle: string) {
  return sql`
    SELECT DISTINCT p.* FROM projects p
    JOIN members m ON m.project_id = p.id
    WHERE m.github_handle = ${githubHandle}
       OR m.user_id = ${githubHandle}
    ORDER BY p.created_at DESC
  ` as any as Promise<any[]>;
}

async function getProjectData(projectId: string) {
  const [members, repos, tasks, usageLogs] = await Promise.all([
    sql`SELECT * FROM members WHERE project_id = ${projectId}` as any as Promise<any[]>,
    sql`SELECT * FROM project_repos WHERE project_id = ${projectId} ORDER BY added_at DESC` as any as Promise<any[]>,
    sql`SELECT * FROM tasks WHERE project_id = ${projectId} ORDER BY created_at DESC LIMIT 20` as any as Promise<any[]>,
    sql`SELECT * FROM usage_logs WHERE date = current_date AND user_id = ANY(
      SELECT user_id FROM members WHERE project_id = ${projectId}
    )` as any as Promise<any[]>,
  ]);
  return { members, repos, tasks, usageLogs };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const user = session.user as any;
  const githubHandle = user.githubHandle || user.email || "";

  const projects = await getUserProjects(githubHandle);

  if (projects.length === 0) {
    return <OnboardingPage user={user} signOutFn={async () => {
      "use server";
      await signOut({ redirectTo: "/sign-in" });
    }} />;
  }

  const params = await searchParams;
  const selectedId = params.project || projects[0].id;
  const project = projects.find((p: any) => p.id === selectedId) || projects[0];
  const { members, repos, tasks, usageLogs } = await getProjectData(project.id);

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

  const hasRepos = repos.length > 0;

  return (
    <main className="max-w-6xl mx-auto px-8 py-16">
      <div className="flex items-start justify-between mb-16">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl font-bold tracking-tight text-shimmer">
              spillover
            </div>
            <div className="h-5 w-px bg-[var(--color-border)]" />
            {projects.length > 1 ? (
              <ProjectSelector
                projects={projects.map((p: any) => ({ id: p.id, name: p.name }))}
                currentProjectId={project.id}
              />
            ) : (
              <span className="text-sm text-[var(--color-text-secondary)]">
                {project.name}
              </span>
            )}
            <InviteButton projectId={project.id} />
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

      <section className="mb-16">
        <SectionTitle>repositories</SectionTitle>
        <RepoPicker
          projectId={project.id}
          initialRepos={repos.map((r: any) => ({ repo_full_name: r.repo_full_name }))}
        />
      </section>

      <section className="mb-16">
        <SectionTitle>issues</SectionTitle>
        {hasRepos ? (
          <IssueLog projectId={project.id} members={members} />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Add a repository above to see spillover-labeled issues.
          </p>
        )}
      </section>

      {tasks.length > 0 && (
        <section>
          <SectionTitle>task history</SectionTitle>
          <TaskLog tasks={tasks} members={members} />
        </section>
      )}
    </main>
  );
}

function OnboardingPage({
  user,
  signOutFn,
}: {
  user: any;
  signOutFn: () => Promise<void>;
}) {
  return (
    <main className="flex items-center justify-center min-h-screen px-8">
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="text-4xl mb-1 text-shimmer font-bold tracking-tight">
              spillover
            </div>
            <p className="text-[var(--color-text-muted)] text-xs">
              signed in as {user.githubHandle || user.email}
            </p>
          </div>
          <form action={signOutFn}>
            <button
              type="submit"
              className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
            >
              sign out
            </button>
          </form>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 mb-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-4">
            join a project
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Ask your team lead for an invite link, or create a new project from
            the CLI:
          </p>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-[var(--color-text-secondary)] mb-2">
                Install the CLI
              </p>
              <code className="block bg-[var(--color-bg)] px-4 py-2.5 rounded border border-[var(--color-border)] text-[var(--color-accent)]">
                npm i -g spillover
              </code>
            </div>
            <div>
              <p className="text-[var(--color-text-secondary)] mb-2">
                Create a project
              </p>
              <code className="block bg-[var(--color-bg)] px-4 py-2.5 rounded border border-[var(--color-border)] text-[var(--color-accent)]">
                spillover init my-team
              </code>
            </div>
            <div>
              <p className="text-[var(--color-text-secondary)] mb-2">
                Or join an existing one
              </p>
              <code className="block bg-[var(--color-bg)] px-4 py-2.5 rounded border border-[var(--color-border)] text-[var(--color-accent)]">
                spillover join &lt;project-id&gt;
              </code>
            </div>
          </div>
        </div>

        <p className="text-[var(--color-text-muted)] text-xs">
          Your dashboard will appear here once you&apos;re part of a project.
        </p>
      </div>
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
