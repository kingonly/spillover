"use client";

import { useTransition } from "react";

interface UserMenuProps {
  name: string;
  image?: string | null;
  signOutAction: () => Promise<void>;
}

export function UserMenu({ name, image, signOutAction }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      {image ? (
        <img
          src={image}
          alt={name}
          width={28}
          height={28}
          className="rounded-full border border-[var(--color-border)]"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-secondary)]">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-xs text-[var(--color-text-secondary)]">{name}</span>
      <form
        action={() => {
          startTransition(async () => {
            await signOutAction();
          });
        }}
      >
        <button
          type="submit"
          disabled={isPending}
          className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer ml-1"
        >
          {isPending ? "..." : "sign out"}
        </button>
      </form>
    </div>
  );
}
