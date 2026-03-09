import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { projectId } = await params;
  const user = session.user as any;
  const githubHandle = user.githubHandle || "";
  const email = user.email || "";

  if (!githubHandle) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 max-w-sm text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Could not determine your GitHub handle. Try signing out and back in.
          </p>
        </div>
      </main>
    );
  }

  // Check project exists
  const projects = await sql`SELECT * FROM projects WHERE id = ${projectId}`;
  if (projects.length === 0) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 max-w-sm text-center">
          <p className="text-sm text-[var(--color-red)]">Project not found.</p>
          <a
            href="/"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mt-3 inline-block"
          >
            Go to dashboard
          </a>
        </div>
      </main>
    );
  }

  // Add member (idempotent)
  await sql`
    INSERT INTO members (project_id, user_id, email, github_handle)
    VALUES (${projectId}, ${githubHandle}, ${email}, ${githubHandle})
    ON CONFLICT (project_id, user_id) DO UPDATE SET
      email = EXCLUDED.email,
      github_handle = EXCLUDED.github_handle
  `;

  redirect(`/?project=${projectId}`);
}
