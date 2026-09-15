"use client";

import Link from "next/link";
import { useEffect, useRef, type ComponentType } from "react";
import { Phone, X, type LucideProps } from "lucide-react";
import { cn } from "@/lib/cn";
import { telLink } from "@/lib/contact";

type NavIcon = ComponentType<LucideProps>;

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  items: { href: string; label: string; icon: NavIcon }[];
  isActive: (href: string) => boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileNavDrawer({ open, onClose, items, isActive }: MobileNavDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" aria-label="Mobile navigation">
      <button
        type="button"
        className="absolute inset-0 animate-overlay-in bg-ink/50"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-y-0 right-0 flex w-[84vw] max-w-xs animate-nav-slide-in flex-col bg-white shadow-elevated"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5">
          <span className="text-sm font-bold text-ink">Menu</span>
          <button
            ref={closeButtonRef}
            type="button"
            className="flex size-9 items-center justify-center rounded-lg border border-neutral-200"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Primary">
          <ul className="flex flex-col gap-1 text-sm font-semibold">
            {items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 transition",
                      active
                        ? "bg-primary-50 text-primary-700"
                        : "text-ink-muted hover:bg-neutral-50 hover:text-ink",
                    )}
                  >
                    <Icon className={cn("size-4", active && "text-primary-600")} aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className="border-t border-neutral-100 p-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <a
            href={telLink()}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 text-sm font-semibold text-white"
          >
            <Phone className="size-4" />
            Call an expert
          </a>
        </div>
      </div>
    </div>
  );
}
