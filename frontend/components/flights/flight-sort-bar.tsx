"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { SORT_OPTIONS, type SortKey } from "@/lib/flights/flight-filters";

interface FlightSortBarProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
  shown: number;
  total: number;
  /** Extra context on the left, e.g. "departing flights DEL → TBS". */
  label?: string;
  /** Short value under a tab, e.g. the cheapest price or the fastest duration. */
  insights?: Partial<Record<SortKey, string>>;
}

export function FlightSortBar({ value, onChange, shown, total, label, insights = {} }: FlightSortBarProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Roving focus between the sort tabs, like a native radio group.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const index = SORT_OPTIONS.findIndex((o) => o.id === value);
    const last = SORT_OPTIONS.length - 1;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? last : e.key === "ArrowRight" ? Math.min(last, index + 1) : Math.max(0, index - 1);
    onChange(SORT_OPTIONS[next]!.id);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
  }

  return (
    <div className="space-y-2.5">
      <p className="px-1 text-sm text-ink-muted" aria-live="polite">
        <span className="font-bold text-ink">{shown}</span>
        {shown !== total && <> of {total}</>} flight{total === 1 ? "" : "s"}
        {label && <span className="text-ink-subtle"> · {label}</span>}
      </p>

      <div
        ref={listRef}
        role="radiogroup"
        aria-label="Sort flights by"
        onKeyDown={onKeyDown}
        className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white p-1 shadow-soft"
      >
        {SORT_OPTIONS.map((option) => {
          const active = option.id === value;
          const insight = insights[option.id];
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(option.id)}
              className={cn(
                "flex min-w-[7.5rem] flex-1 shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 text-center transition duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
                active ? "bg-primary-600 text-white shadow-medium" : "text-ink-muted hover:bg-neutral-50 hover:text-ink",
              )}
            >
              <span className="whitespace-nowrap text-xs font-bold">{option.label}</span>
              <span className={cn("h-4 whitespace-nowrap text-[11px] tabular-nums", active ? "text-white/85" : "text-ink-subtle")}>
                {insight ?? ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
