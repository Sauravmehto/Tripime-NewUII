"use client";

import { ArrowUpDown, ChevronDown } from "lucide-react";
import { SORT_OPTIONS, type SortKey } from "@/lib/flights/flight-filters";

interface FlightSortBarProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
  shown: number;
  total: number;
  /** Extra context on the left, e.g. "departing flights DEL → TBS". */
  label?: string;
}

export function FlightSortBar({ value, onChange, shown, total, label }: FlightSortBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      <p className="text-sm text-ink-muted" aria-live="polite">
        <span className="font-semibold text-ink">{shown}</span> of {total} flights
        {label && <span className="text-ink-subtle"> · {label}</span>}
      </p>
      <label className="relative inline-flex items-center">
        <span className="sr-only">Sort flights by</span>
        <ArrowUpDown className="pointer-events-none absolute left-3 size-3.5 text-ink-subtle" aria-hidden />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as SortKey)}
          className="h-9 cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white pl-8 pr-9 text-xs font-semibold text-ink shadow-xs transition hover:border-primary-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-ink-subtle" aria-hidden />
      </label>
    </div>
  );
}
