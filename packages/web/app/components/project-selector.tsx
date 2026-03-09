"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProjectSelectorProps {
  projects: { id: string; name: string }[];
  currentProjectId: string;
}

export function ProjectSelector({
  projects,
  currentProjectId,
}: ProjectSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<null | "create" | "join">(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const current = projects.find((p) => p.id === currentProjectId);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMode(null);
        setError("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
      setOpen(false);
      setMode(null);
      setName("");
      router.push(`/?project=${project.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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
      setOpen(false);
      setMode(null);
      setCode("");
      router.push(`/?project=${project.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          setMode(null);
          setError("");
        }}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded px-2 py-1 cursor-pointer hover:border-[var(--color-border-hover)] transition-colors outline-none"
      >
        {current?.name || "Select project"}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[220px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 overflow-hidden">
          {!mode && (
            <>
              {/* Project list */}
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setOpen(false);
                    if (p.id !== currentProjectId) {
                      router.push(`/?project=${p.id}`);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors ${
                    p.id === currentProjectId
                      ? "text-[var(--color-accent)] bg-[var(--color-accent)]/5"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                  }`}
                >
                  {p.name}
                </button>
              ))}

              {/* Divider + actions */}
              <div className="border-t border-[var(--color-border)]" />
              <button
                onClick={() => setMode("create")}
                className="w-full text-left px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] cursor-pointer transition-colors"
              >
                + new project
              </button>
              <button
                onClick={() => setMode("join")}
                className="w-full text-left px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] cursor-pointer transition-colors"
              >
                + join project
              </button>
            </>
          )}

          {mode === "create" && (
            <form onSubmit={handleCreate} className="p-3">
              <label className="block text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                project name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-team"
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-2"
                autoFocus
              />
              {error && (
                <p className="text-[10px] text-[var(--color-red)] mb-2">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode(null); setError(""); setName(""); }}
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
                >
                  back
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="ml-auto bg-[var(--color-accent)] text-[var(--color-bg)] rounded px-3 py-1 text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {loading ? "..." : "create"}
                </button>
              </div>
            </form>
          )}

          {mode === "join" && (
            <form onSubmit={handleJoin} className="p-3">
              <label className="block text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                project code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SPILL-A7X3"
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-2 font-mono tracking-wider"
                autoFocus
              />
              {error && (
                <p className="text-[10px] text-[var(--color-red)] mb-2">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode(null); setError(""); setCode(""); }}
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
                >
                  back
                </button>
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="ml-auto bg-[var(--color-accent)] text-[var(--color-bg)] rounded px-3 py-1 text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {loading ? "..." : "join"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
