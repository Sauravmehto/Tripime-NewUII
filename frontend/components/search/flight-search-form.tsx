"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowLeftRight, ArrowRight, ChevronRight, History, Search, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { addDays, clampDate } from "@/lib/airports";
import { friendlyDate } from "@/lib/flights/calendar";
import {
  DEFAULT_SEARCH,
  flightsHref,
  travellerCount,
  validateSearch,
  type SearchValidation,
} from "@/lib/flights/search-params";
import { saveRecentSearch, useRecentSearches } from "@/lib/flights/recent-searches";
import { useFlightCatalog } from "@/lib/flights/use-flight-catalog";
import { DURATION, EASE_SIGNATURE } from "@/lib/motion";
import type { SearchParams, TripType } from "@/types";
import { AirportField } from "./airport-field";
import { DateRangeField } from "./date-range-field";
import { TravellersField } from "./travellers-field";

const FIELD_LABELS: Record<keyof SearchValidation, string> = {
  origin: "From",
  destination: "To",
  date: "Departure",
  returnDate: "Return",
  travellers: "Travellers",
};
const FIELD_ORDER = Object.keys(FIELD_LABELS) as (keyof SearchValidation)[];

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-8px)" },
  { transform: "translateX(7px)" },
  { transform: "translateX(-5px)" },
  { transform: "translateX(4px)" },
  { transform: "translateX(-2px)" },
  { transform: "translateX(0)" },
];

interface FlightSearchFormProps {
  /** Pre-filled search (results page). Omitted on the homepage. */
  initial?: SearchParams;
  /** Defaults to navigating to the results page. */
  onSearch?: (search: SearchParams) => void;
  variant?: "hero" | "bar";
  className?: string;
}

export function FlightSearchForm({
  initial,
  onSearch,
  variant = "hero",
  className,
}: FlightSearchFormProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { catalog, error: catalogError, airportByCode } = useFlightCatalog();
  const [draft, setDraft] = useState<SearchParams>(() => initial ?? { ...DEFAULT_SEARCH, date: "" });
  const [errors, setErrors] = useState<SearchValidation>({});
  const [swapTurns, setSwapTurns] = useState(0);
  // Bumped on every failed submit: shakes invalid tiles and opens the error popup.
  const [failedAttempt, setFailedAttempt] = useState(0);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const recent = useRecentSearches(variant === "hero" ? catalog?.minDate : undefined);

  const bookable = catalog ? { minDate: catalog.minDate, maxDate: catalog.maxDate } : null;
  // Until the user picks a date, default to a week out (within the bookable window).
  const date =
    draft.date || (bookable ? clampDate(addDays(bookable.minDate, 7), bookable.minDate, bookable.maxDate) : "");
  const search: SearchParams = { ...draft, date };

  const origin = airportByCode(search.origin);
  const destination = airportByCode(search.destination);
  const routeError =
    catalog && origin && destination && !catalog.routes[origin.code]?.includes(destination.code)
      ? `No direct flights between ${origin.city} and ${destination.city} yet`
      : undefined;

  useEffect(() => {
    if (!failedAttempt || reduceMotion) return;
    formRef.current?.querySelectorAll<HTMLElement>("[data-invalid='true']").forEach((el) => {
      el.animate(SHAKE, { duration: 480, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" });
    });
  }, [failedAttempt, reduceMotion]);

  /** Close the popup and open the field so the user can fix it straight away. */
  function fixField(field: keyof SearchValidation) {
    setErrorsOpen(false);
    window.setTimeout(() => {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${field}"]`)?.click();
    }, 60);
  }

  function patch(next: Partial<SearchParams>) {
    setDraft((prev) => ({ ...prev, date: prev.date || date, ...next }));
    const cleared = Object.keys(next);
    if (cleared.length) {
      setErrors((prev) => {
        const copy = { ...prev };
        for (const key of cleared) delete copy[key as keyof SearchValidation];
        if ("cabin" in next || "adults" in next || "children" in next || "infants" in next) delete copy.travellers;
        if ("tripType" in next) delete copy.returnDate;
        return copy;
      });
    }
  }

  function setTripType(tripType: TripType) {
    patch({ tripType, returnDate: tripType === "one_way" ? null : search.returnDate });
  }

  function swap() {
    setSwapTurns((n) => n + 1);
    patch({ origin: search.destination, destination: search.origin });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateSearch(search, bookable);
    if (routeError && !found.destination) found.destination = routeError;
    setErrors(found);
    if (Object.keys(found).length) {
      setFailedAttempt((n) => n + 1);
      setErrorsOpen(true);
      return;
    }
    saveRecentSearch(search);
    if (onSearch) onSearch(search);
    else router.push(flightsHref(search));
  }

  const isBar = variant === "bar";
  const visibleErrors = FIELD_ORDER.flatMap((field) =>
    errors[field] ? [[field, errors[field]] as [keyof SearchValidation, string]] : [],
  );

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Search flights"
      className={cn(
        "relative w-full rounded-3xl border border-white/60 bg-white/95 p-3 text-ink backdrop-blur-xl sm:p-4",
        "shadow-[0_30px_70px_-30px_rgb(30_58_138/0.55),0_2px_8px_rgb(16_16_16/0.06)]",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <TripTypeToggle value={search.tripType} onChange={setTripType} />
        {catalog && (
          <p className="text-[11px] font-medium text-ink-subtle">
            {catalog.airports.length} airports · {new Set(catalog.airports.map((a) => a.country)).size} countries
          </p>
        )}
      </div>

      {catalogError && (
        <p role="alert" className="mb-3 rounded-xl bg-danger-50 px-3 py-2 text-xs text-danger-700">
          Couldn’t load airports: {catalogError}. Please refresh to try again.
        </p>
      )}

      <div
        className={cn(
          "grid gap-2",
          isBar ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.3fr)_auto] lg:items-start" : "",
        )}
      >
        {/* From ⇄ To */}
        <div className="relative grid gap-2 sm:grid-cols-2">
          <AirportField
            kind="origin"
            value={search.origin}
            onChange={(code) => patch({ origin: code })}
            airports={catalog?.airports ?? null}
            error={errors.origin}
          />
          <AirportField
            kind="destination"
            value={search.destination}
            onChange={(code) => patch({ destination: code })}
            airports={catalog?.airports.filter((a) => a.code !== search.origin) ?? null}
            servedCodes={origin ? catalog?.routes[origin.code] : null}
            otherCity={origin?.city}
            error={errors.destination ?? (routeError && !errors.origin ? routeError : undefined)}
          />
          <motion.button
            type="button"
            onClick={swap}
            aria-label="Swap origin and destination"
            animate={{ rotate: reduceMotion ? 0 : swapTurns * 180 }}
            transition={{ duration: DURATION.base, ease: EASE_SIGNATURE }}
            whileHover={reduceMotion ? undefined : { scale: 1.08 }}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            className={cn(
              "absolute z-10 flex size-9 items-center justify-center rounded-full border-4 border-white bg-linear-to-b from-primary-500 to-primary-700 text-white",
              "shadow-[0_8px_18px_-6px_rgb(37_99_235/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
              // Mobile: right edge between the stacked fields; ≥sm: centred between them.
              "right-4 top-[68px] -translate-y-1/2 sm:right-auto sm:left-1/2 sm:top-8 sm:-translate-x-1/2",
            )}
          >
            <ArrowLeftRight className="size-4 rotate-90 sm:rotate-0" aria-hidden />
          </motion.button>
        </div>

        <DateRangeField
          value={{ tripType: search.tripType, date: search.date, returnDate: search.returnDate }}
          onChange={(next) => patch(next)}
          origin={origin}
          destination={destination}
          cabin={search.cabin}
          bookable={bookable}
          errors={{ date: errors.date, returnDate: errors.returnDate }}
        />

        <div className={cn("grid gap-2", isBar ? "lg:contents" : "sm:grid-cols-[minmax(0,1fr)_auto]")}>
          <TravellersField
            counts={search}
            cabin={search.cabin}
            onChange={(counts, cabin) => patch({ ...counts, cabin })}
            error={errors.travellers}
          />
          <button
            type="submit"
            disabled={!catalog}
            className={cn(
              "group relative inline-flex h-[64px] items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 text-sm font-bold text-white",
              "bg-linear-to-b from-accent to-accent-dark shadow-[0_14px_28px_-12px_rgb(225_77_85/0.8),inset_0_1px_0_rgb(255_255_255/0.25)]",
              "transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-12px_rgb(225_77_85/0.9)] active:translate-y-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70",
              "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            )}
          >
            <Search className="size-4" aria-hidden />
            Search flights
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-subtle">
            <History className="size-3.5" aria-hidden />
            Recent searches
          </p>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {recent.map((item) => (
              <button
                key={`${item.origin}-${item.destination}-${item.date}-${item.returnDate}`}
                type="button"
                onClick={() => {
                  setDraft(item);
                  setErrors({});
                }}
                className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left transition hover:-translate-y-px hover:border-primary-300 hover:shadow-soft motion-reduce:hover:translate-y-0"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  {item.origin}
                  {item.tripType === "round_trip" ? (
                    <ArrowLeftRight className="size-3 text-primary-600" aria-label="round trip to" />
                  ) : (
                    <ArrowRight className="size-3 text-primary-600" aria-label="to" />
                  )}
                  {item.destination}
                  <span className="ml-1 inline-flex items-center gap-0.5 font-semibold text-ink-subtle">
                    <Users className="size-3" aria-hidden />
                    {travellerCount(item)}
                  </span>
                </span>
                <span className="block text-[10.5px] text-ink-muted">
                  {friendlyDate(item.date)}
                  {item.returnDate ? ` – ${friendlyDate(item.returnDate)}` : ""} · {item.cabin}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Portalled: the hero's entrance animation would otherwise trap `position: fixed`. */}
      {errorsOpen &&
        createPortal(
          <Modal open onClose={() => setErrorsOpen(false)} title="Please check your search">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-700">
                <AlertTriangle className="size-5" aria-hidden />
              </span>
              <p className="pt-2 text-sm text-ink-muted">
                {visibleErrors.length === 1
                  ? "One thing needs fixing before we can search:"
                  : `${visibleErrors.length} things need fixing before we can search:`}
              </p>
            </div>
            <ul role="alert" className="mt-4 space-y-2">
              {visibleErrors.map(([field, message]) => (
                <li key={field}>
                  <button
                    type="button"
                    onClick={() => fixField(field)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-danger-500/20 bg-danger-50/60 px-3 py-2.5 text-left transition hover:border-danger-500/40 hover:bg-danger-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-danger-700">
                        {FIELD_LABELS[field]}
                      </span>
                      <span className="block text-sm font-semibold text-ink">{message}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-danger-700 transition group-hover:translate-x-0.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              autoFocus
              onClick={() => visibleErrors[0] && fixField(visibleErrors[0][0])}
              className="mt-4 w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-800"
            >
              Fix it
            </button>
          </Modal>,
          document.body,
        )}
    </form>
  );
}

function TripTypeToggle({ value, onChange }: { value: TripType; onChange: (v: TripType) => void }) {
  const pillId = useId();
  const options: { id: TripType; label: string }[] = [
    { id: "one_way", label: "One way" },
    { id: "round_trip", label: "Round trip" },
  ];
  return (
    <div role="radiogroup" aria-label="Trip type" className="relative inline-flex rounded-full bg-neutral-100 p-1">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative z-[1] rounded-full px-4 py-1.5 text-xs font-bold transition-colors",
              selected ? "text-primary-700" : "text-ink-muted hover:text-ink",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`trip-type-pill-${pillId}`}
                className="absolute inset-0 -z-[1] rounded-full bg-white shadow-soft"
                transition={{ duration: DURATION.base, ease: EASE_SIGNATURE }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
