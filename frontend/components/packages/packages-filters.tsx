"use client";

import { ArrowDownUp, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import type { PackageCategory } from "@/types";

export type CatalogFilter = "all" | PackageCategory;
export type SortOption = "recommended" | "price-asc" | "price-desc";

export const PACKAGE_FILTERS: { id: CatalogFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "domestic", label: "India" },
  { id: "international", label: "International" },
  { id: "offer", label: "Offers" },
  { id: "upcoming_event", label: "Events" },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "price-asc", label: "Price ↑" },
  { id: "price-desc", label: "Price ↓" },
];

interface PackagesFiltersProps {
  filter: CatalogFilter;
  sort: SortOption;
  query: string;
  count: number;
  onFilterChange: (filter: CatalogFilter) => void;
  onSortChange: (sort: SortOption) => void;
  onQueryChange: (query: string) => void;
}

export function PackagesFilters({
  filter,
  sort,
  query,
  count,
  onFilterChange,
  onSortChange,
  onQueryChange,
}: PackagesFiltersProps) {
  const trimmed = query.trim();

  return (
    <div className="sticky top-14 z-30 border-b border-neutral-200/80 bg-canvas/90 py-2.5 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">
        {PACKAGE_FILTERS.map(({ id, label }) => {
          const active = filter === id;
          return (
            <motion.button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange(id)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-primary-700 text-white shadow-xs"
                  : "border border-neutral-200 bg-white text-ink-muted hover:border-primary-200 hover:text-ink",
              )}
            >
              {label}
            </motion.button>
          );
        })}

        {trimmed && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"
          >
            {trimmed}
            <X className="size-3" aria-hidden />
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-medium text-ink-subtle" aria-live="polite">
            {count} {count === 1 ? "package" : "packages"}
          </span>
          <label className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white pl-2 text-xs font-semibold text-ink-muted">
            <ArrowDownUp className="size-3 text-ink-subtle" aria-hidden />
            <span className="sr-only">Sort packages</span>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="rounded-full bg-transparent py-1.5 pr-2 text-xs font-semibold outline-none"
            >
              {SORT_OPTIONS.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
