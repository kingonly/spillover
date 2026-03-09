"use client";

import { useState } from "react";

export function ProjectCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="text-[11px] font-mono tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
      title="Click to copy project code"
    >
      {copied ? "copied!" : code}
    </button>
  );
}
