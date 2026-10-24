"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, SlidersHorizontal, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/bottom-sheet";
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const sortLabel = SORT_OPTIONS.find((option) => option.id === sort)?.label ?? "Recommended";

  useEffect(() => {
    if (!sheetOpen) return;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  return (
    <div className="border-b border-neutral-200/80 bg-canvas py-1.5 sm:sticky sm:top-14 sm:z-30">
      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        <FilterChips filter={filter} onFilterChange={onFilterChange} />
        {trimmed && <QueryChip query={trimmed} onClear={() => onQueryChange("")} />}
        <SortControl
          sort={sort}
          count={count}
          onSortChange={onSortChange}
          className="ml-auto"
        />
      </div>

      <div className="flex items-center gap-2 lg:hidden">
        <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
          <FilterChips filter={filter} onFilterChange={onFilterChange} scroll />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 text-xs font-semibold text-ink"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Filters
        </button>
      </div>
      {trimmed && (
        <div className="mt-2 lg:hidden">
          <QueryChip query={trimmed} onClear={() => onQueryChange("")} />
        </div>
      )}

      {sheetOpen && (
        <BottomSheet title="Filters" onClose={() => setSheetOpen(false)}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Category</p>
          <div className="mt-2 flex flex-col gap-1">
            {PACKAGE_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => onFilterChange(id)}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 text-left text-sm font-semibold",
                  filter === id ? "bg-primary-50 text-primary-800" : "text-ink hover:bg-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Sort</p>
          <div className="mt-2 flex flex-col gap-1">
            {SORT_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={sort === id}
                onClick={() => onSortChange(id)}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 text-left text-sm font-semibold",
                  sort === id ? "bg-primary-50 text-primary-800" : "text-ink hover:bg-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            {count} {count === 1 ? "package" : "packages"} · {sortLabel}
          </p>
        </BottomSheet>
      )}
    </div>
  );
}

function FilterChips({
  filter,
  onFilterChange,
  scroll = false,
}: {
  filter: CatalogFilter;
  onFilterChange: (filter: CatalogFilter) => void;
  scroll?: boolean;
}) {
  return (
    <>
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
              "inline-flex items-center rounded-full px-3 text-xs font-semibold transition",
              scroll ? "min-h-11 shrink-0" : "py-1.5",
              active
                ? "bg-primary-700 text-white shadow-xs"
                : "border border-neutral-200 bg-white text-ink-muted hover:border-primary-200 hover:text-ink",
            )}
          >
            {label}
          </motion.button>
        );
      })}
    </>
  );
}

function QueryChip({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex min-h-8 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"
    >
      {query}
      <X className="size-3" aria-hidden />
    </button>
  );
}

function SortControl({
  sort,
  count,
  onSortChange,
  className,
}: {
  sort: SortOption;
  count: number;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-[11px] font-medium text-ink-subtle" aria-live="polite">
        {count} {count === 1 ? "package" : "packages"}
      </span>
      <label className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white pl-2 text-xs font-semibold text-ink-muted">
        <ArrowDownUp className="size-3 text-ink-subtle" aria-hidden />
        <span className="sr-only">Sort packages</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="rounded-full bg-transparent py-1.5 pr-2 text-base font-semibold outline-none lg:text-xs"
        >
          {SORT_OPTIONS.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
