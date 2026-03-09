import { sql } from "@/lib/db";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatsRow } from "./components/stats-row";
import { TeamGrid } from "./components/team-grid";
import { TaskLog } from "./components/task-log";
import { ReposAndIssues } from "./components/repos-and-issues";
import { UserMenu } from "./components/user-menu";
import { ProjectSelector } from "./components/project-selector";
import { InviteButton } from "./components/invite-button";
import { OnboardingPage } from "./components/onboarding";
import { ProjectCode } from "./components/project-code";
import { DeleteProjectButton } from "./components/delete-project-button";

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
    async function handleSignOutOnboarding() {
      "use server";
      await signOut({ redirectTo: "/sign-in" });
    }
    return (
      <OnboardingPage
        githubHandle={user.githubHandle || user.email || ""}
        signOutAction={handleSignOutOnboarding}
      />
    );
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

  return (
    <main className="max-w-6xl mx-auto px-8 py-16">
      <div className="flex items-start justify-between mb-16">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl font-bold tracking-tight text-shimmer">
              spillover
            </div>
            <div className="h-5 w-px bg-[var(--color-border)]" />
            <ProjectSelector
              projects={projects.map((p: any) => ({ id: p.id, name: p.name }))}
              currentProjectId={project.id}
            />
            <ProjectCode code={project.code} />
            <InviteButton projectId={project.id} />
            {project.created_by === githubHandle && (
              <DeleteProjectButton projectId={project.id} projectName={project.name} />
            )}
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

      <ReposAndIssues
        projectId={project.id}
        initialRepos={repos.map((r: any) => ({ repo_full_name: r.repo_full_name }))}
        members={members}
      />

      {tasks.length > 0 && (
        <section>
          <SectionTitle>task history</SectionTitle>
          <TaskLog tasks={tasks} members={members} />
        </section>
      )}
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
