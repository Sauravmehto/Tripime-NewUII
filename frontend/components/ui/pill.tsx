"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  scroll?: boolean;
}

/** Toggle-style pill button shared by filter/category tab rows. */
export function Chip({ active = false, scroll = false, className, children, role, ...props }: ChipProps) {
  const selectionProp = role === "tab" ? { "aria-selected": active } : { "aria-pressed": active };
  return (
    <button
      type="button"
      role={role}
      {...selectionProp}
      className={cn(
        "inline-flex items-center rounded-full px-3 text-xs font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        scroll ? "min-h-11 shrink-0" : "py-1.5",
        active
          ? "bg-primary-700 text-white shadow-xs"
          : "border border-neutral-200 bg-white text-ink-muted hover:border-primary-200 hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
