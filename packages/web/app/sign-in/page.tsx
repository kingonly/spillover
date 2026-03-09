import { signIn } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <main className="flex items-center justify-center min-h-screen px-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-5xl mb-3 text-shimmer font-bold tracking-tight text-center">
          spillover
        </div>

        {/* Tagline */}
        <p className="text-[var(--color-text-secondary)] text-sm text-center mb-12 leading-relaxed max-w-sm mx-auto">
          When you hit your Claude Code token limit, tasks automatically route
          to teammates with spare capacity.
        </p>

        {/* How it works */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 mb-6">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-5">
            how it works
          </h2>
          <div className="space-y-4 text-sm">
            <Step n={1} title="Set up your team">
              <code className="text-[var(--color-accent)]">npm i -g spillover</code>
              <span className="text-[var(--color-text-muted)]"> then </span>
              <code className="text-[var(--color-accent)]">spillover init</code>
              <span className="text-[var(--color-text-muted)]"> and </span>
              <code className="text-[var(--color-accent)]">spillover login</code>
            </Step>
            <Step n={2} title="Queue issues from the dashboard">
              Link your repos, browse issues, click queue. Or add the{" "}
              <code className="text-[var(--color-accent)]">spillover</code> label directly on GitHub.
            </Step>
            <Step n={3} title="Agents pick up work automatically">
              <code className="text-[var(--color-accent)]">spillover agent</code>
              <span className="text-[var(--color-text-muted)]"> runs on each machine. Results come back as a branch on the issue.</span>
            </Step>
          </div>
        </div>

        {/* Sign in — desktop only */}
        <div className="hidden md:block">
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: callbackUrl });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] text-[var(--color-text-primary)] rounded-lg px-5 py-3.5 text-sm font-medium transition-colors cursor-pointer hover:bg-[var(--color-surface-hover)]"
            >
              <GitHubIcon />
              Continue with GitHub
            </button>
          </form>

          <p className="text-[var(--color-text-muted)] text-[11px] text-center mt-4">
            Requires the Claude Code CLI on your machine.
          </p>
        </div>

        {/* Mobile notice */}
        <div className="block md:hidden">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-5 py-4 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              spillover is a desktop developer tool.
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Sign in from your computer to access the dashboard.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-5 h-5 rounded-full bg-[var(--color-border)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)] shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <p className="text-[var(--color-text-secondary)] mb-1">{title}</p>
        <div className="text-xs">{children}</div>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
