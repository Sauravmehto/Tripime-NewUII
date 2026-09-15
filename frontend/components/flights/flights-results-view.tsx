"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlaneTakeoff, SearchX, SlidersHorizontal, X } from "lucide-react";
import { searchFlights } from "@/lib/api/flights";
import { getErrorMessage } from "@/lib/api/client";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { FlightDateStrip } from "@/components/flights/flight-date-strip";
import {
  FlightFareHint,
  type NeighborFareHint,
} from "@/components/flights/flight-fare-hint";
import { FlightFiltersSidebar } from "@/components/flights/flight-filters-sidebar";
import { FlightResultCard } from "@/components/flights/flight-result-card";
import { FlightSearchModifyBar } from "@/components/flights/flight-search-modify-bar";
import { FlightSortBar } from "@/components/flights/flight-sort-bar";
import { InventoryNotice } from "@/components/marketing/inventory-notice";
import { FaqList } from "@/components/marketing/faq-list";
import {
  EMPTY_FILTERS,
  airlineFacets,
  applyFilters,
  countActiveFilters,
  priceBounds,
  slotCounts,
  sortFlights,
  sortTeasers,
  type FlightFilters,
  type SortKey,
} from "@/lib/flights/flight-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import { INVENTORY_END, INVENTORY_START, addDays, clampDate } from "@/lib/airports";
import { formatDate } from "@/lib/format";
import type { Flight } from "@/types";

const FLIGHT_FAQS = [
  {
    question: "Is the fare shown per person or the total?",
    answer:
      "Prices here are per adult. Your exact total for all travellers is shown clearly on the next step before you pay.",
  },
  {
    question: "Can I change dates or passengers after booking?",
    answer:
      "Call or WhatsApp us with your booking reference and we'll help you rebook the best way.",
  },
  {
    question: "What if my route isn't listed here?",
    answer:
      "We're covering select domestic routes for now. Call or WhatsApp us — our team can often still help.",
  },
];

export function FlightsResultsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSearch, setSelectedFlight } = useBooking();

  const origin = searchParams.get("origin") || "DEL";
  const destination = searchParams.get("destination") || "BOM";
  const date = searchParams.get("date") || "2026-08-20";
  const passengers = Number(searchParams.get("passengers") || 1);

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("cheapest");
  const [filters, setFilters] = useState<FlightFilters>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fareHint, setFareHint] = useState<NeighborFareHint | null>(null);

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => params.set(k, v));
    router.push(`/flights?${params.toString()}`);
  }

  useEffect(() => {
    let cancelled = false;
    setSearch({ origin, destination, date, passengers });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets filters/fare hint when route params change
    setFilters(EMPTY_FILTERS);
    setFareHint(null);

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await searchFlights({ origin, destination, date, passengers });
        if (!cancelled) setFlights(result.flights);
      } catch (err) {
        if (!cancelled) {
          setFlights([]);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [origin, destination, date, passengers, setSearch]);

  useEffect(() => {
    if (loading || flights.length === 0) return;
    let cancelled = false;
    const currentMin = Math.min(...flights.map((f) => f.fare.totalFare));
    const candidates = [-2, 2]
      .map((offset) => addDays(date, offset))
      .filter((d) => d >= INVENTORY_START && d <= INVENTORY_END && d !== date)
      .map((d) => clampDate(d, INVENTORY_START, INVENTORY_END));

    async function probe() {
      const results = await Promise.allSettled(
        candidates.map((d) =>
          searchFlights({ origin, destination, date: d, passengers }).then((r) => ({
            date: d,
            flights: r.flights,
          })),
        ),
      );
      if (cancelled) return;
      let best: NeighborFareHint | null = null;
      for (const result of results) {
        if (result.status !== "fulfilled" || result.value.flights.length === 0) continue;
        const minFare = Math.min(...result.value.flights.map((f) => f.fare.totalFare));
        const savings = currentMin - minFare;
        if (savings < 200) continue;
        if (!best || savings > best.savings) {
          best = { date: result.value.date, minFare, savings };
        }
      }
      setFareHint(best);
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, [loading, flights, origin, destination, date, passengers]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const bounds = useMemo(() => priceBounds(flights), [flights]);
  const facets = useMemo(() => airlineFacets(flights), [flights]);
  const counts = useMemo(() => slotCounts(flights), [flights]);
  const teasers = useMemo(() => sortTeasers(flights), [flights]);
  const activeCount = countActiveFilters(filters, bounds);
  const visible = useMemo(
    () => sortFlights(applyFilters(flights, filters), sort),
    [flights, filters, sort],
  );
  const cheapestId = teasers.cheapest ? sortFlights(flights, "cheapest")[0]?.id : undefined;
  const fastestId = teasers.shortest ? sortFlights(flights, "shortest")[0]?.id : undefined;

  const sidebar = (
    <FlightFiltersSidebar
      filters={filters}
      onChange={setFilters}
      facets={facets}
      bounds={bounds}
      slotCounts={counts}
      activeCount={activeCount}
      onClear={() => setFilters(EMPTY_FILTERS)}
    />
  );

  return (
    <Container className="space-y-4 py-6 pb-24 lg:pb-8">
      <FlightSearchModifyBar
        origin={origin}
        destination={destination}
        date={date}
        passengers={passengers}
        onSearch={(values) =>
          updateParams({
            origin,
            destination: values.destination,
            date: values.date,
            passengers: String(values.passengers),
          })
        }
      />

      <InventoryNotice />

      <FlightDateStrip date={date} onChange={(nextDate) => updateParams({ date: nextDate })} />

      {!loading && (
        <FlightFareHint
          hint={fareHint}
          onSelectDate={(nextDate) => updateParams({ date: nextDate })}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-[268px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-20 lg:block">{sidebar}</aside>

        <div className="space-y-4">
          <FlightSortBar value={sort} onChange={setSort} teasers={teasers} />

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-sm text-ink-muted">
              {loading ? (
                "Searching flights…"
              ) : (
                <>
                  <span className="font-semibold text-ink">{visible.length}</span> flight
                  {visible.length === 1 ? "" : "s"} from {origin} to {destination}
                </>
              )}
            </p>
            <p className="text-xs text-ink-subtle">
              {formatDate(date)} · {passengers} {passengers === 1 ? "traveller" : "travellers"}
            </p>
          </div>

          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          )}

          {error && !loading && (
            <div
              role="alert"
              className="rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700"
            >
              {error}
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white py-12 text-center shadow-xs">
              <SearchX className="size-10 text-warning-500" aria-hidden />
              <p className="mt-4 font-semibold text-ink">No flights matched your filters</p>
              <Button variant="outline" className="mt-4" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            </div>
          )}

          {!loading &&
            !error &&
            visible.map((flight, index) => (
              <FlightResultCard
                key={flight.id}
                flight={flight}
                passengers={passengers}
                index={index}
                cheapest={flight.id === cheapestId}
                fastest={flight.id === fastestId && flight.id !== cheapestId}
                onSelect={() => {
                  setSelectedFlight(flight);
                  router.push("/booking/passengers");
                }}
              />
            ))}

          {!loading && (
            <div className="pt-2">
              <p className="mb-2 px-1 text-sm font-semibold text-ink">Frequently asked questions</p>
              <FaqList items={FLIGHT_FAQS} />
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-elevated backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-muted">
              {loading ? "Searching…" : `${visible.length} flights`}
            </p>
            <p className="truncate text-sm font-semibold text-ink">
              {origin} → {destination}
            </p>
          </div>
          <Button size="lg" className="h-12 shrink-0" onClick={() => setDrawerOpen(true)}>
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 text-xs">{activeCount}</span>
            )}
          </Button>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/50"
          />
          <div className="relative max-h-[85vh] overflow-y-auto rounded-t-3xl bg-neutral-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-base font-bold text-ink">
                <PlaneTakeoff className="size-4 text-primary-600" aria-hidden />
                Filter flights
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 bg-white"
              >
                <X className="size-4" />
              </button>
            </div>
            {sidebar}
            <Button size="lg" className="mt-4 w-full" onClick={() => setDrawerOpen(false)}>
              Show {visible.length} flight{visible.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}
