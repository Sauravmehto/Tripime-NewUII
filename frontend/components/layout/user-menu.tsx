"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, KeyRound, LogOut, Ticket } from "lucide-react";
import { cn } from "@/lib/cn";

/** "sauravmehto.98@gmail.com" → "Sauravmehto"; used when we have no real name. */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const word = local.split(/[._\-+0-9]+/).find(Boolean) ?? local;
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : "Traveller";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? "?").slice(0, 1);
  return letters.toUpperCase();
}

function Avatar({ initials, size }: { initials: string; size: "sm" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full bg-linear-to-br from-primary-600 to-primary-800 font-bold tracking-wide text-white ring-2 ring-white",
        size === "sm" ? "size-8 text-[11px] shadow-sm" : "size-10 text-sm shadow-md",
      )}
    >
      {initials}
    </span>
  );
}

/**
 * Signed-in customer menu: an avatar button that opens a small dropdown with the account's
 * name, email, a link to bookings and log out. Closes on outside click, Escape and Tab;
 * arrow keys / Home / End move between items.
 */
export function UserMenu({
  email,
  name,
  onLogout,
}: {
  email: string;
  /** Real name when known; otherwise derived from the email. */
  name?: string | null;
  onLogout: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const displayName = name?.trim() || nameFromEmail(email);
  const initials = initialsOf(displayName);

  const items = useCallback(
    () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    [],
  );

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  const openAndFocus = useCallback(
    (which: "first" | "last") => {
      setOpen(true);
      // Wait a frame so the menu is interactive before moving focus into it.
      requestAnimationFrame(() => {
        const list = items();
        (which === "first" ? list[0] : list[list.length - 1])?.focus();
      });
    },
    [items],
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onButtonKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAndFocus("first");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openAndFocus("last");
    }
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      list[(index + step + list.length) % list.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      (e.key === "Home" ? list[0] : list[list.length - 1])?.focus();
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await onLogout();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${displayName}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
        className={cn(
          "group flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition duration-200",
          "hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          open && "bg-neutral-100",
        )}
      >
        <span className="transition duration-200 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          <Avatar initials={initials} size="sm" />
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-ink-subtle transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="Account"
        inert={!open}
        onKeyDown={onMenuKeyDown}
        className={cn(
          "absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xl shadow-ink/10",
          "transition duration-150 ease-out motion-reduce:transition-none",
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-95 opacity-0",
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Avatar initials={initials} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
            <p className="truncate text-xs text-ink-muted" title={email}>
              {email}
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-100 p-1.5">
          <Link
            href="/my-booking"
            role="menuitem"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink outline-none transition hover:bg-neutral-50 focus-visible:bg-primary-50 focus-visible:text-primary-800"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Ticket className="size-3.5" aria-hidden />
            </span>
            My Bookings
          </Link>
          <Link
            href="/account/password"
            role="menuitem"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink outline-none transition hover:bg-neutral-50 focus-visible:bg-primary-50 focus-visible:text-primary-800"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 text-ink-muted">
              <KeyRound className="size-3.5" aria-hidden />
            </span>
            Change password
          </Link>
        </div>

        <div className="border-t border-neutral-100 p-1.5">
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={busy}
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-danger-700 outline-none transition hover:bg-danger-50 focus-visible:bg-danger-50 disabled:opacity-60"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-danger-50">
              <LogOut className="size-3.5" aria-hidden />
            </span>
            {busy ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
