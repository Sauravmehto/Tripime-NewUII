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
    <div className="space-y-2">
      <p className="truncate px-0.5 text-xs text-ink-muted" aria-live="polite">
        <span className="font-semibold text-ink">{shown}</span>
        {shown !== total && <> of {total}</>} flight{total === 1 ? "" : "s"}
        {label && <span className="text-ink-subtle"> · {label}</span>}
      </p>

      <div
        ref={listRef}
        role="radiogroup"
        aria-label="Sort flights by"
        onKeyDown={onKeyDown}
        className="no-scrollbar flex gap-0.5 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-0.5"
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
                "flex h-8 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                active ? "bg-primary-600 font-semibold text-white" : "font-medium text-ink-muted hover:bg-neutral-50 hover:text-ink",
              )}
            >
              {option.label}
              {insight && (
                <span className={cn("text-[11px] font-normal tabular-nums", active ? "text-white/80" : "text-ink-subtle")}>
                  {insight}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
