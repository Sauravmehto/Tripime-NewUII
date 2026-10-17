"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CircleCheck, PlaneLanding, PlaneTakeoff, SearchX, SlidersHorizontal, X } from "lucide-react";
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
  applyFilters,
  countActiveFilters,
  flightFacets,
  sortFlights,
  type FlightFilters,
  type SortKey,
} from "@/lib/flights/flight-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
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
import { formatINR } from "@/lib/format";
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

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

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
  const cheapestId = flights.length ? sortFlights(flights, "cheapest")[0].id : undefined;
  const fastestId = flights.length > 1 ? sortFlights(flights, "shortest")[0].id : undefined;

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

  const sidebar = (
    <FlightFiltersSidebar
      filters={filters}
      onChange={setFilters}
      facets={facets}
      fromLabel={legFrom}
      toLabel={legTo}
      airlineCodes={airlineCodes}
      activeCount={activeCount}
      onClear={() => setFilters(EMPTY_FILTERS)}
    />
  );

  const otherCabins = CABIN_CLASSES.filter((c) => c !== search.cabin);

  return (
    <Container className="space-y-4 py-6 pb-24 lg:pb-8">
      <FlightSearchModifyBar search={search} onSearch={go} />

      {result && <InventoryNotice minDate={result.minDate} maxDate={result.maxDate} />}

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

      <div className="grid gap-5 lg:grid-cols-[268px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-20 lg:block">{sidebar}</aside>

        <div className="space-y-4">
          {loading ? (
            <p className="flex items-center gap-1.5 px-1 text-sm text-ink-muted">
              {step === "outbound" ? (
                <PlaneTakeoff className="size-4 text-primary-600" aria-hidden />
              ) : (
                <PlaneLanding className="size-4 text-primary-600" aria-hidden />
              )}
              Searching flights…
            </p>
          ) : (
            <FlightSortBar
              value={sort}
              onChange={setSort}
              shown={visible.length}
              total={flights.length}
              label={`${roundTrip ? (step === "outbound" ? "Departing " : "Return ") : ""}${legFrom} → ${legTo} · ${friendlyDate(legDate)} · ${travellersLabel(search)} · ${search.cabin}`}
            />
          )}

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
              {roundTrip ? ` · step ${step === "outbound" ? 1 : 2} of 2` : ""}
            </p>
            <p className="truncate text-sm font-semibold text-ink">
              {legFrom} → {legTo}
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
        className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-xs ${
          step === "outbound" ? "border-primary-500 ring-4 ring-primary-500/10" : "border-neutral-200"
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
        className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-xs ${
          step === "return" ? "border-primary-500 ring-4 ring-primary-500/10" : "border-neutral-200 opacity-80"
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
    <div className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white px-4 py-12 text-center shadow-xs">
      <SearchX className="size-10 text-warning-500" aria-hidden />
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-ink-muted">{body}</p>}
      {actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
