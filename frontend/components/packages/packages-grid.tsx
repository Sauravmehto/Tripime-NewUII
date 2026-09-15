"use client";

import { PackageSearch, Sparkles } from "lucide-react";
import { PackageCard } from "./package-card";
import { SectionHeading } from "@/components/home/section-heading";
import { Skeleton } from "@/components/ui/card";
import { HERO_QUICK_PICKS } from "@/lib/packages/package-landing-data";
import type { CatalogFilter } from "./packages-filters";
import type { TravelPackage } from "@/types";

interface PackagesGridProps {
  packages: TravelPackage[];
  loading: boolean;
  error: string;
  query: string;
  filter: CatalogFilter;
  onQueryChange: (q: string) => void;
  onFilterChange: (f: CatalogFilter) => void;
  themeNames?: Record<string, string>;
}

export function PackagesGrid({
  packages,
  loading,
  error,
  query,
  filter,
  onQueryChange,
  onFilterChange,
  themeNames = {},
}: PackagesGridProps) {
  const trimmed = query.trim();
  const filtered = trimmed.length > 0 || filter !== "all";

  return (
    <section id="all-packages" className="scroll-mt-24 py-7 sm:py-9">
      <SectionHeading
        eyebrow="Ready to enquire"
        title="All holiday packages"
        subtitle={
          loading
            ? "Loading the latest packages…"
            : trimmed
              ? `Showing matches for “${trimmed}”`
              : "Indicative prices — your expert confirms the final cost for your dates."
        }
      />

      {loading && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[240px] rounded-xl" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700"
        >
          {error}
        </p>
      )}

      {!loading && !error && packages.length === 0 && (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-neutral-200 bg-white py-10 text-center shadow-xs">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <PackageSearch className="size-5" aria-hidden />
          </span>
          <p className="mt-3 font-semibold text-ink">Nothing listed for that yet</p>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            We can still plan it — or try one of these instead.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {HERO_QUICK_PICKS.map(({ term }) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  onFilterChange("all");
                  onQueryChange(term);
                }}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && packages.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {packages.map((pkg, i) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                index={i}
                themeName={pkg.themeId ? themeNames[pkg.themeId] : undefined}
              />
            ))}
          </div>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                onQueryChange("");
                onFilterChange("all");
              }}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 transition hover:text-primary-800"
            >
              <Sparkles className="size-3.5" aria-hidden />
              Show every package
            </button>
          )}
        </>
      )}
    </section>
  );
}
