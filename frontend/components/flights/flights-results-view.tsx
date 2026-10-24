"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  CircleCheck,
  PlaneLanding,
  PlaneTakeoff,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { searchFlights } from "@/lib/api/flights";
import { getErrorMessage } from "@/lib/api/client";
import { useBooking } from "@/context/booking-provider";
import { useCustomerSession } from "@/context/customer-session-provider";
import { loginHref } from "@/lib/safe-redirect";
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
import { FlightPromoBanner } from "@/components/flights/flight-promo-banner";
import { AirlineMark } from "@/components/flights/airline-mark";
import { InventoryNotice } from "@/components/marketing/inventory-notice";
import { FaqList } from "@/components/marketing/faq-list";
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  applyFilters,
  countActiveFilters,
  flightFacets,
  sortFlights,
  type FlightFilters,
  type SortKey,
} from "@/lib/flights/flight-filters";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { addDays } from "@/lib/airports";
import { friendlyDate, monthOf, nightsBetween, shiftMonth, todayISO } from "@/lib/flights/calendar";
import { useFareCalendar } from "@/lib/flights/use-fare-calendar";
import { priceTrip } from "@/lib/flights/pricing";
import {
  CABIN_CLASSES,
  flightsHref,
  parseSearchParams,
  toQueryString,
  travellersLabel,
} from "@/lib/flights/search-params";
import { formatDuration, formatINR } from "@/lib/format";
import { clock12, minutesOf } from "@/lib/flights/segments";
import type { Flight, FlightSearchResponse, SearchParams } from "@/types";

const FLIGHT_FAQS = [
  {
    question: "Is the fare shown per person or the total?",
    answer:
      "Prices on each card are per adult. Children and infants pay less — your exact total for all travellers is shown before you pay.",
  },
  {
    question: "How do round trips work?",
    answer:
      "Pick your departing flight first, then your return. Both flights are booked together under one booking reference.",
  },
  {
    question: "Can I change dates or passengers after booking?",
    answer:
      "Call or WhatsApp us with your booking reference and we'll help you rebook the best way.",
  },
];

type Step = "outbound" | "return";

/** Return flights must leave at least an hour after the outbound one lands. */
function departsAfter(flight: Flight, outbound: Flight) {
  const landed = new Date(`${outbound.arrivalDate}T${outbound.arrivalTime}:00`).getTime();
  const leaves = new Date(`${flight.departureDate}T${flight.departureTime}:00`).getTime();
  return leaves - landed >= 60 * 60 * 1000;
}

export function FlightsResultsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSearch, selectFlights } = useBooking();
  const { session } = useCustomerSession();

  const queryKey = searchParams.toString();
  // Parse once per URL so effects keyed on `search` don't refire every render.
  const search = useMemo(
    () => parseSearchParams(new URLSearchParams(queryKey), addDays(todayISO(), 7)),
    [queryKey],
  );
  const searchKey = toQueryString(search);
  const roundTrip = search.tripType === "round_trip";

  const [result, setResult] = useState<FlightSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("outbound");
  const [outbound, setOutbound] = useState<Flight | null>(null);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [filters, setFilters] = useState<FlightFilters>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [fareHint, setFareHint] = useState<NeighborFareHint | null>(null);

  function go(next: SearchParams) {
    router.push(flightsHref(next));
  }

  useEffect(() => {
    let cancelled = false;
    setSearch(search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the flow when the search changes
    setStep("outbound");
    setOutbound(null);
    setFilters(EMPTY_FILTERS);
    setFareHint(null);

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await searchFlights(search);
        if (!cancelled) setResult(response);
      } catch (err) {
        if (!cancelled) {
          setResult(null);
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
    // `searchKey` captures every field of `search`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, setSearch]);

  const flights = useMemo(() => {
    if (!result) return [];
    if (step === "outbound") return result.flights;
    return outbound ? result.returnFlights.filter((f) => departsAfter(f, outbound)) : [];
  }, [result, step, outbound]);

  // Background probe: is a nearby departure date noticeably cheaper? (outbound only)
  useEffect(() => {
    if (loading || step !== "outbound" || !result || result.flights.length === 0) return;
    let cancelled = false;
    const currentMin = Math.min(...result.flights.map((f) => f.fare.totalFare));
    const candidates = [-2, 2]
      .map((offset) => addDays(search.date, offset))
      .filter((d) => d >= result.minDate && d <= result.maxDate);

    async function probe() {
      const results = await Promise.allSettled(
        candidates.map((d) =>
          searchFlights({ ...search, date: d, tripType: "one_way", returnDate: null }).then((r) => ({
            date: d,
            flights: r.flights,
          })),
        ),
      );
      if (cancelled) return;
      let best: NeighborFareHint | null = null;
      for (const r of results) {
        if (r.status !== "fulfilled" || r.value.flights.length === 0) continue;
        // A cheaper departure is only useful if it still fits before the return.
        if (roundTrip && search.returnDate && r.value.date > search.returnDate) continue;
        const minFare = Math.min(...r.value.flights.map((f) => f.fare.totalFare));
        const savings = currentMin - minFare;
        if (savings < 200) continue;
        if (!best || savings > best.savings) best = { date: r.value.date, minFare, savings };
      }
      setFareHint(best);
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, [loading, step, result, search, roundTrip]);

  const sheetOpen = drawerOpen || sortSheetOpen;
  useEffect(() => {
    if (!sheetOpen) return;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setSortSheetOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const facets = useMemo(() => flightFacets(flights), [flights]);
  const airlineCodes = useMemo(
    () => Object.fromEntries(flights.map((f) => [f.airline.name, f.airline.code])),
    [flights],
  );
  const activeCount = countActiveFilters(filters, facets);
  const visible = useMemo(
    () => sortFlights(applyFilters(flights, filters), sort),
    [flights, filters, sort],
  );
  const cheapestFlight = flights.length ? sortFlights(flights, "cheapest")[0] : undefined;
  const fastestFlight = flights.length > 1 ? sortFlights(flights, "shortest")[0] : undefined;
  const cheapestId = cheapestFlight?.id;
  const fastestId = fastestFlight?.id;
  const sortInsights = useMemo(() => {
    if (!visible.length) return {};
    const times = visible.map((f) => minutesOf(f.departureTime));
    const cheapestVisible = Math.min(...visible.map((f) => f.fare.totalFare));
    const fastestVisible = Math.min(...visible.map((f) => f.durationMinutes));
    return {
      cheapest: formatINR(cheapestVisible),
      shortest: formatDuration(fastestVisible),
      earliest: clock12(Math.min(...times)),
      latest: clock12(Math.max(...times)),
    } satisfies Partial<Record<SortKey, string>>;
  }, [visible]);
  const sortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "Sort";

  const legFrom = step === "outbound" ? search.origin : search.destination;
  const legTo = step === "outbound" ? search.destination : search.origin;
  const legDate = step === "outbound" ? search.date : search.returnDate ?? search.date;
  const stripMonths = useMemo(() => [monthOf(legDate), shiftMonth(monthOf(legDate), 1)], [legDate]);
  const { fares: stripFares } = useFareCalendar(legFrom, legTo, stripMonths, search.cabin, Boolean(result));

  function chooseFlight(flight: Flight) {
    if (roundTrip && step === "outbound") {
      setOutbound(flight);
      setStep("return");
      setFilters(EMPTY_FILTERS);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Keep the selection; booking needs sign-in, then resumes here without a new search.
    selectFlights(search, roundTrip && outbound ? outbound : flight, roundTrip ? flight : null);
    router.push(session?.authenticated ? "/booking/passengers" : loginHref("/booking/passengers"));
  }

  function changeLegDate(nextDate: string) {
    if (step === "outbound") {
      // Keep the trip length when the departure moves past the return date.
      const returnDate =
        roundTrip && search.returnDate && nextDate > search.returnDate
          ? addDays(nextDate, nightsBetween(search.date, search.returnDate))
          : search.returnDate;
      go({ ...search, date: nextDate, returnDate });
    } else {
      go({ ...search, returnDate: nextDate });
    }
  }

  const sidebarProps = {
    filters,
    onChange: setFilters,
    facets,
    fromLabel: legFrom,
    toLabel: legTo,
    airlineCodes,
    activeCount,
    onClear: () => setFilters(EMPTY_FILTERS),
  };

  const otherCabins = CABIN_CLASSES.filter((c) => c !== search.cabin);

  return (
    <Container className="space-y-3 py-3 pb-6 sm:pt-4">
      <FlightSearchModifyBar search={search} onSearch={go} />

      {result && <InventoryNotice compact className="px-0.5" minDate={result.minDate} maxDate={result.maxDate} />}

      {roundTrip && <RoundTripProgress step={step} search={search} outbound={outbound} onChangeOutbound={() => {
        setStep("outbound");
        setOutbound(null);
        setFilters(EMPTY_FILTERS);
      }} />}

      {result && (step === "outbound" || search.returnDate) && (
        <FlightDateStrip
          date={legDate}
          minDate={step === "return" ? search.date : result.minDate}
          maxDate={result.maxDate}
          fares={stripFares}
          onChange={changeLegDate}
        />
      )}

      {!loading && step === "outbound" && (
        <FlightFareHint
          hint={fareHint}
          onSelectDate={(nextDate) => changeLegDate(nextDate)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start">
        <aside className="no-scrollbar hidden lg:sticky lg:top-16 lg:block lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pb-2">
          <FlightFiltersSidebar {...sidebarProps} />
        </aside>

        <div className="space-y-2.5">
          {loading ? (
            <p className="flex items-center gap-2 px-0.5 text-xs text-ink-muted" role="status">
              <span className="relative flex size-5 items-center justify-center rounded-full bg-primary-50">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary-200/60 motion-reduce:hidden" aria-hidden />
                {step === "outbound" ? (
                  <PlaneTakeoff className="relative size-3.5 text-primary-600" aria-hidden />
                ) : (
                  <PlaneLanding className="relative size-3.5 text-primary-600" aria-hidden />
                )}
              </span>
              Finding the best {legFrom} → {legTo} fares…
            </p>
          ) : (
            flights.length > 0 && (
              <div className="hidden sm:block">
                <FlightSortBar
                  value={sort}
                  onChange={setSort}
                  shown={visible.length}
                  total={flights.length}
                  insights={sortInsights}
                  label={`${roundTrip ? (step === "outbound" ? "Departing " : "Return ") : ""}${legFrom} → ${legTo} · ${friendlyDate(legDate)} · ${travellersLabel(search)} · ${search.cabin}`}
                />
              </div>
            )
          )}

          {!loading && flights.length > 0 && (
            <p className="px-0.5 text-xs text-ink-muted sm:hidden" aria-live="polite">
              <span className="font-semibold text-ink">{visible.length}</span>
              {visible.length !== flights.length && <> of {flights.length}</>} flights ·{" "}
              <span className="font-semibold text-ink">{sortLabel}</span>
            </p>
          )}

          {loading && (
            <div className="space-y-2.5" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <FlightCardSkeleton key={i} />
              ))}
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

          {!loading && !error && result && flights.length === 0 && (
            <EmptyState
              title={
                !result.routeAvailable
                  ? `No flights between ${search.origin} and ${search.destination}`
                  : step === "return"
                    ? "No return flights fit this trip"
                    : `No ${search.cabin} flights on this date`
              }
              body={
                !result.routeAvailable
                  ? "We don't fly this route yet. Try another destination, or call us — our team can often still help."
                  : step === "return"
                    ? "Every return flight on this day leaves too soon after you land. Try a later return date."
                    : `Try another date above${otherCabins.length ? ", or a different cabin" : ""}.`
              }
              actions={
                result.routeAvailable && step === "outbound"
                  ? otherCabins.map((cabin) => (
                      <Button key={cabin} variant="outline" size="sm" onClick={() => go({ ...search, cabin })}>
                        Try {cabin}
                      </Button>
                    ))
                  : null
              }
            />
          )}

          {!loading && !error && flights.length > 0 && visible.length === 0 && (
            <EmptyState
              title="No flights matched your filters"
              actions={
                <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          )}

          {!loading &&
            !error &&
            visible.map((flight, index) => (
              <Fragment key={flight.id}>
                <FlightResultCard
                  flight={flight}
                  counts={search}
                  index={index}
                  cheapest={flight.id === cheapestId}
                  fastest={flight.id === fastestId && flight.id !== cheapestId}
                  ctaLabel={roundTrip ? (step === "outbound" ? "Select" : "Select return") : "Select"}
                  onSelect={() => chooseFlight(flight)}
                />
                {/* Admin-managed promo after the third result (or the last, if fewer). */}
                {index === Math.min(2, visible.length - 1) && <FlightPromoBanner />}
              </Fragment>
            ))}

          {!loading && (
            <div className="pt-3">
              <p className="mb-2 px-0.5 text-sm font-semibold text-ink">Frequently asked questions</p>
              <FaqList items={FLIGHT_FAQS} />
            </div>
          )}
        </div>
      </div>

      <div
        data-mobile-bottom-bar
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(16_16_16/0.15)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <div className="min-w-0 flex-1 pl-1">
            <p className="truncate text-[13px] font-semibold text-ink">
              {legFrom} → {legTo}
            </p>
            <p className="truncate text-[11px] text-ink-muted">
              {loading ? "Searching…" : `${visible.length} flight${visible.length === 1 ? "" : "s"}`}
              {!loading && cheapestFlight ? ` · from ${formatINR(cheapestFlight.fare.totalFare)}` : ""}
              {roundTrip ? ` · step ${step === "outbound" ? 1 : 2} of 2` : ""}
            </p>
          </div>
          <BarButton onClick={() => setSortSheetOpen(true)} disabled={loading || flights.length === 0} label={`Sort: ${sortLabel}`}>
            <ArrowUpDown className="size-4" aria-hidden />
            Sort
          </BarButton>
          <BarButton onClick={() => setDrawerOpen(true)} disabled={loading || flights.length === 0} primary label="Filters">
            <SlidersHorizontal className="size-4" aria-hidden />
            Filter
            {activeCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary-700">
                {activeCount}
              </span>
            )}
          </BarButton>
        </div>
      </div>

      {drawerOpen && (
        <BottomSheet title="Filter flights" onClose={() => setDrawerOpen(false)}
          action={
            activeCount > 0 ? (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="rounded-md text-xs font-semibold text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Clear all ({activeCount})
              </button>
            ) : null
          }
          footer={
            <Button size="lg" className="w-full" onClick={() => setDrawerOpen(false)}>
              Show {visible.length} flight{visible.length === 1 ? "" : "s"}
            </Button>
          }
        >
          <FlightFiltersSidebar {...sidebarProps} hideHeader />
        </BottomSheet>
      )}

      {sortSheetOpen && (
        <BottomSheet title="Sort flights" onClose={() => setSortSheetOpen(false)}>
          <ul role="radiogroup" aria-label="Sort flights by" className="space-y-1.5">
            {SORT_OPTIONS.map((option) => {
              const active = option.id === sort;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setSort(option.id);
                      setSortSheetOpen(false);
                    }}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                      active ? "border-primary-500 bg-primary-50" : "border-neutral-200 bg-white hover:border-primary-300",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-ink">{option.label}</span>
                      {sortInsights[option.id as keyof typeof sortInsights] && (
                        <span className="block text-xs text-ink-muted">
                          {sortInsights[option.id as keyof typeof sortInsights]}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                        active ? "border-primary-600 bg-primary-600 text-white" : "border-neutral-300",
                      )}
                    >
                      {active && <Check className="size-3" aria-hidden />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </BottomSheet>
      )}
    </Container>
  );
}

function RoundTripProgress({
  step,
  search,
  outbound,
  onChangeOutbound,
}: {
  step: Step;
  search: SearchParams;
  outbound: Flight | null;
  onChangeOutbound: () => void;
}) {
  const estimate = outbound ? priceTrip(outbound, null, search).total : null;
  return (
    <ol className="grid gap-2 sm:grid-cols-2" aria-label="Round trip steps">
      <li
        className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2 ${
          step === "outbound" ? "border-primary-500 ring-2 ring-primary-500/10" : "border-neutral-200"
        }`}
        aria-current={step === "outbound" ? "step" : undefined}
      >
        {outbound ? (
          <CircleCheck className="size-6 shrink-0 text-success-700" aria-hidden />
        ) : (
          <StepNumber n={1} active />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-600">
            Departing · {friendlyDate(search.date)}
          </p>
          {outbound ? (
            <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
              <AirlineMark code={outbound.airline.code} name={outbound.airline.name} />
              {outbound.departureTime} → {outbound.arrivalTime} · {outbound.flightNumber}
            </p>
          ) : (
            <p className="text-sm font-semibold text-ink">
              Choose your flight {search.origin} <ArrowRight className="inline size-3.5" aria-hidden /> {search.destination}
            </p>
          )}
        </div>
        {outbound && (
          <button
            type="button"
            onClick={onChangeOutbound}
            className="shrink-0 text-xs font-semibold text-primary-700 hover:text-primary-800"
          >
            Change
          </button>
        )}
      </li>
      <li
        className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2 ${
          step === "return" ? "border-primary-500 ring-2 ring-primary-500/10" : "border-neutral-200 opacity-80"
        }`}
        aria-current={step === "return" ? "step" : undefined}
      >
        <StepNumber n={2} active={step === "return"} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-600">
            Returning · {search.returnDate ? friendlyDate(search.returnDate) : "—"}
          </p>
          <p className="text-sm font-semibold text-ink">
            {search.destination} <ArrowRight className="inline size-3.5" aria-hidden /> {search.origin}
          </p>
        </div>
        {estimate !== null && (
          <p className="shrink-0 text-right text-[11px] text-ink-muted">
            Departing total
            <span className="block text-sm font-bold text-ink">{formatINR(estimate)}</span>
          </p>
        )}
      </li>
    </ol>
  );
}

function StepNumber({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        active ? "bg-primary-600 text-white" : "bg-neutral-200 text-ink-muted"
      }`}
      aria-hidden
    >
      {n}
    </span>
  );
}

function BarButton({
  children,
  onClick,
  disabled,
  primary,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50",
        primary
          ? "bg-primary-600 text-white hover:bg-primary-700"
          : "border border-neutral-200 bg-white text-ink hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}

function FlightCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="grid md:grid-cols-[minmax(0,1fr)_164px]">
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="size-9 animate-pulse rounded-lg bg-neutral-100" />
            <span className="space-y-1.5">
              <span className="block h-3.5 w-28 animate-pulse rounded bg-neutral-100" />
              <span className="block h-3 w-16 animate-pulse rounded bg-neutral-100" />
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="h-7 w-16 animate-pulse rounded bg-neutral-100" />
            <span className="h-px flex-1 bg-neutral-100" />
            <span className="h-7 w-16 animate-pulse rounded bg-neutral-100" />
          </div>
          <span className="block h-3 w-40 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-neutral-100 bg-neutral-50 px-3 py-3 md:flex-col md:items-stretch md:justify-center md:border-l md:border-t-0">
          <span className="h-6 w-24 animate-pulse rounded bg-neutral-200/70 md:ml-auto" />
          <span className="h-9 w-28 animate-pulse rounded-lg bg-neutral-200/70 md:w-full" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center">
      <SearchX className="size-8 text-warning-500" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-ink-muted">{body}</p>}
      {actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
