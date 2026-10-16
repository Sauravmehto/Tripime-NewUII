"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  label: string;
  icon?: ReactNode;
  active?: boolean;
  error?: string;
  /** Form field this tile represents; the form uses it to shake/open the tile on errors. */
  field?: string;
  /** Main line, e.g. "DEL" or "Tue, 20 Oct". */
  value: ReactNode;
  /** Secondary line under the value. */
  hint?: ReactNode;
  placeholder?: boolean;
}

/** Tappable search-form field that opens a popover. */
export const FieldTile = forwardRef<HTMLButtonElement, FieldTileProps>(function FieldTile(
  { label, icon, active, error, field, value, hint, placeholder, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-field={field}
      data-invalid={error ? "true" : undefined}
      className={cn(
        "group relative flex h-full min-h-[64px] w-full min-w-0 items-center gap-3 rounded-2xl border bg-white px-3.5 py-2.5 text-left transition duration-200",
        "hover:border-primary-300 hover:shadow-[0_6px_18px_-10px_rgb(37_99_235/0.45)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
        active
          ? "border-primary-500 shadow-[0_0_0_4px_rgb(59_130_246/0.12)]"
          : error
            ? "border-danger-500 bg-danger-50/40 shadow-[0_0_0_3px_rgb(239_68_68/0.12)]"
            : "border-neutral-200",
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl transition",
            active
              ? "bg-primary-600 text-white"
              : "bg-primary-50 text-primary-600 group-hover:bg-primary-100",
          )}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-primary-600">
          {label}
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[15px] font-bold leading-tight",
            placeholder ? "text-ink-subtle" : "text-ink",
          )}
        >
          {value}
        </span>
        {hint && <span className="mt-0.5 block truncate text-[11px] text-ink-muted">{hint}</span>}
        {error && <span className="sr-only">Error: {error}</span>}
      </span>
    </button>
  );
});

