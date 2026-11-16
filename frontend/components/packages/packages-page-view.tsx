"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { listPackageThemes, listPackages } from "@/lib/api/packages";
import { getErrorMessage } from "@/lib/api/client";
import { Container } from "@/components/layout/container";
import { PackagesHero } from "@/components/packages/packages-hero";
import {
  PackagesFilters,
  type CatalogFilter,
  type SortOption,
} from "@/components/packages/packages-filters";
import { PackagesFeatured } from "@/components/packages/packages-featured";
import { PackagesGrid } from "@/components/packages/packages-grid";
import { PackagesDiscoveryRows } from "@/components/packages/packages-discovery-rows";
import { PackagesOffersShowcase } from "@/components/packages/packages-offers-showcase";
import { PackagesPromoBanner } from "@/components/packages/packages-promo-banner";
import { PackagesCta } from "@/components/packages/packages-cta";
import { InfluencerTrips } from "@/components/packages/influencer-trips";
import { useOffers } from "@/lib/offers/use-offers";
import { whatsappLink } from "@/lib/contact";
import {
  buildExpertMessage,
  buildSearchSummary,
  packageTrip,
  withinBudget,
  type HolidaySearch,
} from "@/lib/packages/search-options";
// import { LeadEnquiryForm } from "@/components/enquiries/lead-enquiry-form";
// import { Card } from "@/components/ui/card";
import type { PackageTheme, TravelPackage } from "@/types";

const DOMESTIC_PATTERN =
  /goa|kerala|rajasthan|varanasi|himachal|kashmir|spiti|gokarna|bundi|india/i;
const INTERNATIONAL_PATTERN =
  /bali|mauritius|dubai|singapore|thailand|maldives|nepal|bhutan|sri lanka|fiji|barbados|indonesia|uae/i;

function matchesQuery(pkg: TravelPackage, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack =
    `${pkg.title} ${pkg.destination} ${pkg.tagline} ${pkg.highlights.join(" ")}`.toLowerCase();
  return haystack.includes(q) || q.split(/\s+/).some((token) => haystack.includes(token));
}

function sortPackages(list: TravelPackage[], sort: SortOption): TravelPackage[] {
  const next = [...list];
  if (sort === "price-asc") return next.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return next.sort((a, b) => b.price - a.price);
  return next.sort(
    (a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder,
  );
}

/**
 * Compact packages landing — homepage visual language,
 * same listPackages API + filter/search/enquiry routes.
 */
export function PackagesPageView() {
  const router = useRouter();
  const pathname = usePathname() || "/packages";
  const searchParams = useSearchParams();
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [themes, setThemes] = useState<PackageTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [search, setSearch] = useState<HolidaySearch | null>(null);
  const { offers } = useOffers("We couldn't load offers right now.");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [data, themeList] = await Promise.all([
          listPackages(),
          listPackageThemes(),
        ]);
        if (!cancelled) {
          setPackages(data);
          setThemes(themeList);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const explore = useCallback((term: string) => {
    setQuery(term);
    if (DOMESTIC_PATTERN.test(term)) setFilter("domestic");
    else if (INTERNATIONAL_PATTERN.test(term)) setFilter("international");
    else setFilter("all");
    window.setTimeout(() => {
      document
        .getElementById("all-packages")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  // Searches from the home page and destination cards arrive as /packages?q=Goa.
  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL on arrival
    if (q) explore(q);
  }, [explore, searchParams]);

  // Footer links arrive as /packages?trip=domestic or ?trip=international: show only that kind of trip.
  useEffect(() => {
    const trip = searchParams.get("trip");
    if (trip !== "domestic" && trip !== "international") return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from the URL on arrival */
    setSearch(null);
    setQuery("");
    setFilter(trip);
    /* eslint-enable react-hooks/set-state-in-effect */
    const timer = window.setTimeout(() => {
      document.getElementById("all-packages")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  // Links like /packages#honeymoon-row arrive before the rows exist, so re-scroll once the page has content.
  useEffect(() => {
    if (loading) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const handleSearch = useCallback(
    (next: HolidaySearch) => {
      setSearch(next);
      setQuery(next.destination);
      setFilter(next.trip ?? "all");
      const params = new URLSearchParams(searchParams.toString());
      const set = (key: string, value: string) => (value ? params.set(key, value) : params.delete(key));
      set("from", next.from);
      set("q", next.destination);
      set("month", next.month);
      set("travellers", `${next.adults}a${next.children}c${next.rooms}r`);
      set("budget", next.budgetId === "any" ? "" : next.budgetId);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      window.setTimeout(() => {
        document.getElementById("all-packages")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    },
    [router, searchParams, pathname],
  );

  const clearSearch = useCallback(() => {
    setSearch(null);
    setQuery("");
    setFilter("all");
  }, []);

  const handleExploreRajasthan = useCallback(() => {
    explore("Rajasthan");
  }, [explore]);

  const handleExploreState = useCallback(
    (state: string) => {
      explore(state);
    },
    [explore],
  );

  const themeNames = useMemo(
    () => Object.fromEntries(themes.map((t) => [t.id, t.name])),
    [themes],
  );

  const filtered = useMemo(() => {
    const matched = packages.filter(
      (pkg) =>
        (filter === "all" ||
          (filter === "domestic" || filter === "international"
            ? packageTrip(pkg) === filter
            : pkg.category === filter)) &&
        matchesQuery(pkg, query),
    );
    const sorted = sortPackages(matched, sort);
    if (!search || search.budgetId === "any" || sort !== "recommended") return sorted;
    // Budget is a hint, not a filter: affordable packages go first, nothing is hidden.
    return [
      ...sorted.filter((pkg) => withinBudget(pkg, search.budgetId)),
      ...sorted.filter((pkg) => !withinBudget(pkg, search.budgetId)),
    ];
  }, [packages, filter, query, sort, search]);

  const inBudgetCount = useMemo(
    () => (search && search.budgetId !== "any" ? filtered.filter((pkg) => withinBudget(pkg, search.budgetId)).length : 0),
    [filtered, search],
  );

  return (
    <div className="bg-canvas">
      <PackagesHero onSearch={handleSearch} />

      {!loading && !error && (
        <PackagesDiscoveryRows packages={packages} onExplore={handleExploreState} />
      )}

      <PackagesOffersShowcase offers={offers ?? []} />

      <PackagesPromoBanner onExploreState={handleExploreState} />

      <Container className="pb-1">
        {search && (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Your search</p>
              <p className="text-sm font-semibold text-ink">{buildSearchSummary(search)}</p>
              <p className="text-xs text-ink-muted">
                {filtered.length === 0
                  ? "No ready-made package matches yet."
                  : `${filtered.length} package${filtered.length === 1 ? "" : "s"} found${
                      search.budgetId !== "any" ? `, ${inBudgetCount} within your budget (listed first)` : ""
                    }. Final dates and prices are confirmed by an expert.`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href={whatsappLink(buildExpertMessage(search))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-full bg-primary-700 px-4 text-xs font-semibold text-white transition hover:bg-primary-800"
              >
                Ask an expert
              </a>
              <button
                type="button"
                onClick={clearSearch}
                className="min-h-11 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-ink transition hover:border-primary-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <PackagesFilters
          filter={filter}
          sort={sort}
          query={query}
          count={filtered.length}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onQueryChange={setQuery}
        />

        {!loading && !error && packages.length > 0 && filter === "all" && !query.trim() && (
          <PackagesFeatured packages={packages} themeNames={themeNames} />
        )}

        <PackagesGrid
          packages={filtered}
          loading={loading}
          error={error}
          query={query}
          filter={filter}
          onQueryChange={setQuery}
          onFilterChange={setFilter}
          themeNames={themeNames}
        />

        {!loading && !error && (
          <button
            type="button"
            onClick={handleExploreRajasthan}
            className="mt-2 text-sm font-semibold text-primary-700 transition hover:text-primary-800"
          >
            Explore Rajasthan journeys
          </button>
        )}

        <section id="honeymoon-row">
          <InfluencerTrips />
        </section>

        {/* Temporarily hidden: group trip / custom itinerary enquiry forms
        <section className="border-t border-neutral-200 py-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <LeadEnquiryForm
                source="group"
                title="Plan a group trip"
                submitLabel="Request group quote"
                showTravelFields
              />
            </Card>
            <Card>
              <LeadEnquiryForm
                source="itinerary"
                title="Request a custom itinerary"
                submitLabel="Request itinerary"
                showTravelFields
              />
            </Card>
          </div>
        </section>
        */}
      </Container>

      <PackagesCta />
    </div>
  );
}
