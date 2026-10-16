"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CalendarCheck2, CalendarDays, CalendarPlus, Plane, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/hooks/use-media-query";
import { destinationMedia } from "@/lib/flights/destination-media";
import { friendlyDate, monthOf, nightsBetween, shiftMonth } from "@/lib/flights/calendar";
import { useFareCalendar } from "@/lib/flights/use-fare-calendar";
import type { CabinClass, CatalogAirport, TripType } from "@/types";
import { FieldTile } from "./field-tile";
import { FlightCalendar, type CalendarPhase } from "./flight-calendar";
import { SearchPopover } from "./search-popover";

export interface DateSelection {
  tripType: TripType;
  date: string;
  returnDate: string | null;
}

interface DateRangeFieldProps {
  value: DateSelection;
  onChange: (value: DateSelection) => void;
  origin: CatalogAirport | undefined;
  destination: CatalogAirport | undefined;
  cabin: CabinClass;
  bookable: { minDate: string; maxDate: string } | null;
  errors?: { date?: string; returnDate?: string };
  /** Grid classes for the two tiles (layout differs per form variant). */
  className?: string;
}

export function DateRangeField({
  value,
  onChange,
  origin,
  destination,
  cabin,
  bookable,
  errors,
  className,
}: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<CalendarPhase>("departure");
  const containerRef = useRef<HTMLDivElement>(null);
  const wide = useMediaQuery("(min-width: 768px)");
  const roundTrip = value.tripType === "round_trip";

  // Fares follow the leg being picked: outbound route, or the reverse for the return.
  const legFrom = phase === "return" ? destination?.code : origin?.code;
  const legTo = phase === "return" ? origin?.code : destination?.code;
  const anchor = (phase === "return" ? value.returnDate ?? value.date : value.date) || bookable?.minDate || "";
  const fareMonths = useMemo(() => {
    if (!anchor) return [];
    const first = monthOf(anchor);
    return [shiftMonth(first, -1), first, shiftMonth(first, 1), shiftMonth(first, 2)];
  }, [anchor]);
  const { fares, loading } = useFareCalendar(legFrom ?? "", legTo ?? "", fareMonths, cabin, open);

  function openAt(next: CalendarPhase) {
    setPhase(next);
    setOpen(true);
  }

  function handleSelect(day: string) {
    if (!roundTrip) {
      onChange({ ...value, date: day });
      setOpen(false);
      return;
    }
    if (phase === "departure" || day < value.date) {
      const keepReturn = value.returnDate && value.returnDate >= day ? value.returnDate : null;
      onChange({ ...value, date: day, returnDate: keepReturn });
      setPhase("return");
      return;
    }
    onChange({ ...value, returnDate: day });
    setOpen(false);
  }

  const nights =
    roundTrip && value.date && value.returnDate ? nightsBetween(value.date, value.returnDate) : null;
  const media = destinationMedia(destination?.code, 640);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <div className="min-w-0">
          <FieldTile
            label="Departure"
            field="date"
            icon={<CalendarDays className="size-4" />}
            active={open && phase === "departure"}
            error={errors?.date}
            aria-haspopup="dialog"
            aria-expanded={open && phase === "departure"}
            onClick={() => openAt("departure")}
            placeholder={!value.date}
            value={value.date ? friendlyDate(value.date) : bookable ? "Select date" : "Loading…"}
            hint={value.date ? new Date(`${value.date}T00:00:00`).getFullYear() : "Pick a day"}
          />
        </div>
        <div className="relative min-w-0">
          <FieldTile
            label="Return"
            field="returnDate"
            icon={roundTrip ? <CalendarCheck2 className="size-4" /> : <CalendarPlus className="size-4" />}
            active={open && phase === "return"}
            error={errors?.returnDate}
            aria-haspopup="dialog"
            aria-expanded={open && phase === "return"}
            onClick={() => {
              if (!roundTrip) onChange({ ...value, tripType: "round_trip", returnDate: null });
              openAt("return");
            }}
            placeholder={!roundTrip || !value.returnDate}
            value={
              roundTrip && value.returnDate
                ? friendlyDate(value.returnDate)
                : roundTrip
                  ? "Select date"
                  : "Add return"
            }
            hint={
              nights !== null
                ? `${nights} night${nights === 1 ? "" : "s"} trip`
                : roundTrip
                  ? "Required for round trip"
                  : "Save more on round trips"
            }
          />
          {roundTrip && (
            <button
              type="button"
              aria-label="Remove return date (one way)"
              onClick={() => onChange({ ...value, tripType: "one_way", returnDate: null })}
              className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-ink-subtle transition hover:bg-neutral-100 hover:text-ink"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <SearchPopover
        open={open && Boolean(bookable)}
        onClose={() => setOpen(false)}
        containerRef={containerRef}
        title={phase === "return" ? "Choose your return" : "Choose your departure"}
        className="sm:w-[min(calc(100vw-2rem),25rem)] md:w-[min(calc(100vw-2rem),44rem)] lg:w-[min(calc(100vw-2rem),58rem)]"
      >
        <div className="flex">
          {/* Destination imagery (desktop): the journey at a glance */}
          <aside className="relative hidden w-[17rem] shrink-0 overflow-hidden lg:block">
            {media ? (
              <Image
                key={media.src}
                src={media.src}
                alt={media.alt}
                fill
                sizes="272px"
                className="animate-fade-up object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-linear-to-br from-primary-700 to-primary-900" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-primary-900/95 via-primary-900/55 to-primary-900/10" />
            <div className="relative flex h-full flex-col justify-end p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                Your journey
              </p>
              <JourneyLine from={origin} to={destination} roundTrip={roundTrip} />
              {media && <p className="mt-2 text-xs text-white/75">{media.tagline}</p>}
              <div className="mt-4 space-y-2">
                <SummaryChip
                  label="Departure"
                  value={value.date ? friendlyDate(value.date) : "—"}
                  active={phase === "departure"}
                  onClick={() => setPhase("departure")}
                />
                {roundTrip && (
                  <SummaryChip
                    label="Return"
                    value={value.returnDate ? friendlyDate(value.returnDate) : "Select"}
                    active={phase === "return"}
                    onClick={() => setPhase("return")}
                  />
                )}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1 p-4 sm:p-5">
            {/* Compact journey banner on smaller screens */}
            {media && (
              <div className="relative mb-4 h-20 overflow-hidden rounded-2xl lg:hidden">
                <Image src={media.src} alt={media.alt} fill sizes="(min-width: 768px) 44rem, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-linear-to-r from-primary-900/90 via-primary-900/60 to-transparent" />
                <div className="relative flex h-full items-center px-4 text-white">
                  <JourneyLine from={origin} to={destination} roundTrip={roundTrip} compact />
                </div>
              </div>
            )}

            {roundTrip && (
              <div className="mb-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Date to choose">
                <PhaseTab
                  label="Departure"
                  value={value.date ? friendlyDate(value.date) : "Select"}
                  active={phase === "departure"}
                  onClick={() => setPhase("departure")}
                />
                <PhaseTab
                  label="Return"
                  value={value.returnDate ? friendlyDate(value.returnDate) : "Select"}
                  active={phase === "return"}
                  onClick={() => setPhase("return")}
                />
              </div>
            )}

            {bookable && (
              <FlightCalendar
                key={`${phase}-${wide ? 2 : 1}`}
                range={roundTrip}
                phase={phase}
                departure={value.date || null}
                returnDate={roundTrip ? value.returnDate : null}
                minDate={phase === "return" && value.date ? value.date : bookable.minDate}
                maxDate={bookable.maxDate}
                monthsShown={wide ? 2 : 1}
                fares={fares}
                faresLoading={loading}
                onSelect={handleSelect}
              />
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3">
              <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                <span className="size-2 rounded-full bg-success-500" aria-hidden />
                Lowest {cabin} fare per adult
                {legFrom && legTo ? ` · ${legFrom} → ${legTo}` : ""}
              </p>
              <div className="flex items-center gap-2">
                {nights !== null && (
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
                    {nights} night{nights === 1 ? "" : "s"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </SearchPopover>
    </div>
  );
}

function JourneyLine({
  from,
  to,
  roundTrip,
  compact,
}: {
  from?: CatalogAirport;
  to?: CatalogAirport;
  roundTrip: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex w-full items-center gap-3", compact ? "mt-0" : "mt-2")}>
      <div className="min-w-0">
        <p className={cn("font-extrabold tracking-tight", compact ? "text-xl" : "text-2xl")}>
          {from?.code ?? "—"}
        </p>
        <p className="truncate text-[11px] text-white/70">{from?.city ?? "Origin"}</p>
      </div>
      <div className="relative flex min-w-10 flex-1 items-center" aria-hidden>
        <span className="h-px flex-1 border-t border-dashed border-white/50" />
        <span className="mx-1 flex size-7 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
          <Plane className="size-3.5 rotate-45 animate-float" />
        </span>
        <span className="h-px flex-1 border-t border-dashed border-white/50" />
        {roundTrip && (
          <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-white/70">
            Return
          </span>
        )}
      </div>
      <div className="min-w-0 text-right">
        <p className={cn("font-extrabold tracking-tight", compact ? "text-xl" : "text-2xl")}>
          {to?.code ?? "—"}
        </p>
        <p className="truncate text-[11px] text-white/70">{to?.city ?? "Destination"}</p>
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs ring-1 backdrop-blur-md transition",
        active ? "bg-white text-ink ring-white" : "bg-white/10 text-white ring-white/25 hover:bg-white/20",
      )}
    >
      <span className={cn("font-semibold", active ? "text-primary-700" : "text-white/75")}>{label}</span>
      <span className="font-bold">{value}</span>
    </button>
  );
}

function PhaseTab({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2 text-left transition",
        active
          ? "border-primary-500 bg-primary-50 shadow-[0_0_0_3px_rgb(59_130_246/0.12)]"
          : "border-neutral-200 hover:border-primary-300",
      )}
    >
      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-primary-600">
        {label}
      </span>
      <span className="block text-sm font-bold text-ink">{value}</span>
    </button>
  );
}
