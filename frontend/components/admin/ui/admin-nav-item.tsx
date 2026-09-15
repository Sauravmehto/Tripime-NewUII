"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function AdminNavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  nested,
  expandable,
  expanded,
  onToggle,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed?: boolean;
  nested?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center rounded-md text-[13px] font-medium transition",
        collapsed ? "justify-center" : "gap-0.5",
        active
          ? "bg-white/80 text-admin-accent shadow-xs"
          : "text-admin-ink-muted hover:bg-white/45 hover:text-admin-ink",
      )}
    >
      <Link
        href={href}
        title={label}
        className={cn(
          "flex min-w-0 flex-1 items-center py-1.5",
          collapsed ? "justify-center px-0" : "gap-2 px-2",
          nested && !collapsed && "pl-8",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {!collapsed ? <span className="truncate">{label}</span> : null}
        {collapsed ? <span className="sr-only">{label}</span> : null}
      </Link>
      {expandable && !collapsed ? (
        <button
          type="button"
          aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          aria-expanded={expanded}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle?.();
          }}
          className="mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-admin-ink-subtle hover:bg-white/70 hover:text-admin-ink"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
