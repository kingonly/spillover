"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingPage({
  githubHandle,
  signOutAction,
}: {
  githubHandle: string;
  signOutAction: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"create" | "join">("create");

  return (
    <main className="flex items-center justify-center min-h-screen px-8">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="text-4xl mb-1 text-shimmer font-bold tracking-tight">
              spillover
            </div>
            <p className="text-[var(--color-text-muted)] text-xs">
              signed in as {githubHandle}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
            >
              sign out
            </button>
          </form>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <TabButton
            active={tab === "create"}
            onClick={() => setTab("create")}
          >
            create project
          </TabButton>
          <TabButton active={tab === "join"} onClick={() => setTab("join")}>
            join project
          </TabButton>
        </div>

        {tab === "create" ? <CreateProject /> : <JoinProject />}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-colors ${
        active
          ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
      }`}
    >
      {children}
    </button>
  );
}

function CreateProject() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create project");
        return;
      }

      const project = await res.json();
      router.push(`/?project=${project.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
      <p className="text-sm text-[var(--color-text-secondary)] mb-5">
        Create a new project for your team.
      </p>

      <form onSubmit={handleCreate}>
        <label className="block text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          project name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-team"
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
          autoFocus
        />

        {error && (
          <p className="text-xs text-[var(--color-red)] mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-[var(--color-accent)] text-[var(--color-bg)] rounded-lg px-4 py-2.5 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? "Creating..." : "Create project"}
        </button>
      </form>

      <p className="text-[var(--color-text-muted)] text-xs mt-4">
        You&apos;ll get a project code to share with teammates.
      </p>
    </div>
  );
}

function JoinProject() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          res.status === 404
            ? "No project found with that code"
            : data.error || "Failed to join",
        );
        return;
      }

      const project = await res.json();
      router.push(`/?project=${project.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
      <p className="text-sm text-[var(--color-text-secondary)] mb-5">
        Enter the project code your teammate shared with you.
      </p>

      <form onSubmit={handleJoin}>
        <label className="block text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          project code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SPILL-A7X3"
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4 font-mono tracking-wider"
          autoFocus
        />

        {error && (
          <p className="text-xs text-[var(--color-red)] mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-[var(--color-accent)] text-[var(--color-bg)] rounded-lg px-4 py-2.5 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? "Joining..." : "Join project"}
        </button>
      </form>

      <p className="text-[var(--color-text-muted)] text-xs mt-4">
        You can also join via an invite link from your team.
      </p>
    </div>
  );
}
