"use client";

import { Fragment, useId, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Luggage,
  MessageCircle,
  Phone,
  Plane,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Timer,
} from "lucide-react";
import { AirlineMark } from "./airline-mark";
import { cn } from "@/lib/cn";
import { formatDate, formatDuration, formatINR } from "@/lib/format";
import { nightsBetween } from "@/lib/flights/calendar";
import { passengerTypeLabel, priceTrip } from "@/lib/flights/pricing";
import { segmentsOf, stopsLabel, stopsOf } from "@/lib/flights/segments";
import { telLink, whatsappLink } from "@/lib/contact";
import type { Airport, Flight, TravellerCounts } from "@/types";

type DetailTab = "flight" | "baggage" | "fare" | "cancellation";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "flight", label: "Itinerary" },
  { id: "baggage", label: "Baggage" },
  { id: "fare", label: "Fare breakup" },
  { id: "cancellation", label: "Cancellation" },
];

interface FlightResultCardProps {
  flight: Flight;
  counts: TravellerCounts;
  onSelect: () => void;
  /** Button text; round trips say which leg is being chosen. */
  ctaLabel?: string;
  /** Position in the list, used to stagger the entrance animation. */
  index?: number;
  cheapest?: boolean;
  fastest?: boolean;
}

export function FlightResultCard({
  flight,
  counts,
  onSelect,
  ctaLabel = "Select",
  index = 0,
  cheapest = false,
  fastest = false,
}: FlightResultCardProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DetailTab>("flight");
  const detailId = useId();
  const tabsId = useId();
  const segments = segmentsOf(flight);
  const stops = stopsOf(flight);
  const discount = flight.fare.discount ?? 0;
  const original = flight.fare.originalFare ?? flight.fare.totalFare + discount;
  const dayShift = nightsBetween(flight.departureDate, flight.arrivalDate);
  const via = (flight.layovers ?? []).map((l) => l.airport.code).join(", ");
  const fewSeats = flight.availableSeats > 0 && flight.availableSeats <= 5;

  return (
    <article
      aria-label={`${flight.airline.name} ${flight.flightNumber}, ${flight.departureTime} to ${flight.arrivalTime}, ${formatINR(flight.fare.totalFare)}`}
      className={cn(
        "animate-fade-up group/card relative overflow-hidden rounded-xl border bg-white transition-colors",
        open ? "border-primary-300" : "border-neutral-200 hover:border-primary-300",
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      {(cheapest || fastest) && (
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", cheapest ? "bg-success-500" : "bg-primary-500")} />
      )}

      <div className="grid md:grid-cols-[minmax(0,1fr)_164px]">
        <div className="min-w-0 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="grid gap-2.5 sm:grid-cols-[minmax(150px,190px)_minmax(0,1fr)] sm:items-center sm:gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <AirlineMark code={flight.airline.code} name={flight.airline.name} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-semibold text-ink">{flight.airline.name}</p>
                <p className="truncate text-[11px] text-ink-muted">
                  {flight.flightNumber}
                  {segments.length === 1 && flight.aircraft ? ` · ${flight.aircraft}` : ""}
                </p>
              </div>
              {/* Phones: price and Select sit in the airline row instead of a separate band. */}
              <div className="ml-auto flex shrink-0 items-center gap-2 md:hidden">
                <div className="text-right leading-tight">
                  {discount > 0 && (
                    <p className="text-[10px] text-ink-subtle line-through tabular-nums">{formatINR(original)}</p>
                  )}
                  <p className="text-[17px] font-bold tabular-nums text-ink">{formatINR(flight.fare.totalFare)}</p>
                </div>
                <button
                  type="button"
                  onClick={onSelect}
                  className="inline-flex h-9 items-center rounded-lg bg-accent px-3 text-[13px] font-semibold text-white transition hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  {ctaLabel}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(84px,1.2fr)_minmax(0,1fr)] items-center gap-2 sm:gap-3">
              <Endpoint time={flight.departureTime} airport={flight.origin} />
              <div className="flex flex-col items-center text-center leading-tight" title={via ? `Via ${via}` : undefined}>
                <p className="text-[11px] text-ink-muted">{formatDuration(flight.durationMinutes)}</p>
                <div className="relative my-1 flex w-full items-center" aria-hidden>
                  <span className="size-1.5 shrink-0 rounded-full border border-neutral-300 bg-white" />
                  <span className="relative h-px flex-1 bg-neutral-300">
                    {Array.from({ length: stops }, (_, i) => (
                      <span
                        key={i}
                        className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-white"
                        style={{ left: `${((i + 1) / (stops + 1)) * 100}%` }}
                      />
                    ))}
                  </span>
                  <Plane className="size-3 shrink-0 rotate-45 text-primary-600" />
                </div>
                <p className={cn("text-[11px] font-medium", stops ? "text-accent-dark" : "text-success-700")}>
                  {stopsLabel(stops)}
                  {via && <span className="font-normal text-ink-subtle"> · {via}</span>}
                </p>
              </div>
              <Endpoint time={flight.arrivalTime} airport={flight.destination} dayShift={dayShift} alignRight />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-neutral-200 pt-2 text-[11px]">
            {cheapest && (
              <Badge tone="success">
                <Sparkles className="size-3" aria-hidden /> Cheapest
              </Badge>
            )}
            {fastest && (
              <Badge tone="primary">
                <Clock className="size-3" aria-hidden /> Fastest
              </Badge>
            )}
            <span className={cn("inline-flex items-center gap-1", flight.refundable ? "text-success-700" : "text-ink-muted")}>
              {flight.refundable ? <ShieldCheck className="size-3.5" aria-hidden /> : <ShieldOff className="size-3.5" aria-hidden />}
              {flight.refundable ? "Refundable" : "Non-refundable"}
            </span>
            {flight.baggage?.checkIn && (
              <span className="inline-flex items-center gap-1 text-ink-muted">
                <Luggage className="size-3.5" aria-hidden />
                {flight.baggage.checkIn}
                <span className="hidden sm:inline"> check-in</span>
              </span>
            )}
            {fewSeats && (
              <span className="font-medium text-accent-dark">
                {flight.availableSeats} seat{flight.availableSeats === 1 ? "" : "s"} left
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={detailId}
              className="-my-1 ml-auto inline-flex min-h-7 items-center gap-0.5 rounded-md px-1 text-xs font-medium text-primary-700 transition hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span className="sm:hidden">{open ? "Hide" : "Details"}</span>
              <span className="hidden sm:inline">{open ? "Hide details" : "Flight details"}</span>
              <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} aria-hidden />
            </button>
          </div>
        </div>

        <div className="hidden md:flex md:flex-col md:items-stretch md:justify-center md:gap-2 md:border-l md:border-neutral-100 md:bg-neutral-50/70 md:px-3 md:py-3">
          <div className="min-w-0 leading-tight md:text-right">
            {discount > 0 && (
              <p className="flex items-center gap-1.5 text-[11px] md:justify-end">
                <span className="text-ink-subtle line-through tabular-nums">{formatINR(original)}</span>
                <span className="font-semibold text-success-700">Save {formatINR(discount)}</span>
              </p>
            )}
            <p className="text-[22px] font-bold tracking-tight tabular-nums text-ink">{formatINR(flight.fare.totalFare)}</p>
            <p className="text-[11px] text-ink-subtle">per adult</p>
          </div>
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "inline-flex h-9 min-w-[104px] shrink-0 items-center justify-center gap-0.5 rounded-lg bg-accent px-4 text-[13px] font-semibold text-white transition md:w-full",
              "hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            )}
          >
            {ctaLabel}
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {open && (
        <div id={detailId} className="animate-fade-up border-t border-neutral-100 px-3 pb-3 pt-2.5 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="tablist" aria-label="Flight details" className="no-scrollbar flex gap-0.5 overflow-x-auto rounded-lg bg-neutral-100 p-0.5">
              {DETAIL_TABS.map((detail) => (
                <button
                  key={detail.id}
                  id={`${tabsId}-${detail.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === detail.id}
                  aria-controls={`${tabsId}-panel`}
                  onClick={() => setTab(detail.id)}
                  className={cn(
                    "h-7 shrink-0 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    tab === detail.id ? "bg-white text-ink shadow-xs" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {detail.label}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1 text-xs text-ink-muted">
              <Timer className="size-3.5 text-primary-600" aria-hidden />
              {flight.origin.city} → {flight.destination.city} · {formatDuration(flight.durationMinutes)}
            </p>
          </div>

          <div
            id={`${tabsId}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsId}-${tab}`}
            className="mt-2 rounded-lg border border-neutral-200 p-3 text-[13px] text-ink-muted"
          >
            {tab === "flight" && <SegmentsDetail flight={flight} />}
            {tab === "baggage" && <BaggageDetail flight={flight} />}
            {tab === "fare" && <FareBreakup flight={flight} counts={counts} />}
            {tab === "cancellation" && <PolicyDetail flight={flight} />}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-ink-subtle">
              {segments.length > 1 ? "Questions about this connection?" : "Not sure this is the right flight?"}
            </p>
            <div className="flex items-center gap-3">
              <a
                href={telLink()}
                className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Phone className="size-3.5" aria-hidden /> Call an expert
              </a>
              <a
                href={whatsappLink(
                  `Hi Tripime, I have a question about ${flight.airline.name} ${flight.flightNumber} (${flight.origin.code} → ${flight.destination.code}).`,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-success-700 hover:text-success-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500"
              >
                <MessageCircle className="size-3.5" aria-hidden /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function Endpoint({
  time,
  airport,
  dayShift = 0,
  alignRight,
}: {
  time: string;
  airport: Airport;
  dayShift?: number;
  alignRight?: boolean;
}) {
  return (
    <div className={cn("min-w-0 leading-tight", alignRight && "text-right")}>
      <p className="text-[22px] font-semibold tracking-tight tabular-nums text-ink">
        {time}
        {dayShift > 0 && (
          <sup className="ml-0.5 text-[10px] font-semibold text-accent" title={`Arrives ${dayShift} day${dayShift > 1 ? "s" : ""} later`}>
            +{dayShift}
          </sup>
        )}
      </p>
      <p className="truncate text-[11px] text-ink-muted">
        <span className="font-semibold text-ink">{airport.code}</span> {airport.city}
      </p>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "success" | "primary" }) {
  const tones = {
    success: "bg-success-50 text-success-700",
    primary: "bg-primary-50 text-primary-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SegmentsDetail({ flight }: { flight: Flight }) {
  const segments = segmentsOf(flight);
  return (
    <div>
      {segments.map((seg, i) => {
        const layover = i > 0 ? flight.layovers?.[i - 1] : undefined;
        return (
          <Fragment key={seg.id}>
            {layover && (
              <div className="my-3 flex items-center justify-between gap-3 border-y border-neutral-100 py-2.5 text-xs">
                <p className="text-ink-muted">
                  Change planes in{" "}
                  <span className="font-semibold text-ink">
                    {layover.airport.city} ({layover.airport.code})
                  </span>
                  {layover.durationMinutes >= 8 * 60 && (
                    <span className="ml-2 rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-bold text-warning-500">
                      Long layover
                    </span>
                  )}
                </p>
                <p className="shrink-0 font-bold text-ink">{formatDuration(layover.durationMinutes)}</p>
              </div>
            )}
            <div className="grid grid-cols-[72px_minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[96px_minmax(0,1fr)_110px_minmax(0,1fr)]">
              <div className="flex flex-col items-center text-center">
                <AirlineMark code={seg.airline.code} name={seg.airline.name} />
                <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-ink">{seg.airline.name}</p>
                <p className="text-[10px] text-ink-subtle">{seg.flightNumber}</p>
              </div>
              <SegmentEnd airport={seg.origin} time={seg.departureTime} date={seg.departureDate} />
              <div className="pt-4 text-center">
                <p className="text-xs font-semibold text-ink-muted">{formatDuration(seg.durationMinutes)}</p>
                <div className="my-1 h-px bg-neutral-300" aria-hidden />
                <p className="text-[10px] text-ink-subtle">{flight.cabinClass}</p>
                <p className="mt-0.5 text-[10px] text-ink-subtle">{seg.aircraft}</p>
              </div>
              <SegmentEnd airport={seg.destination} time={seg.arrivalTime} date={seg.arrivalDate} alignRight />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function SegmentEnd({
  airport,
  time,
  date,
  alignRight,
}: {
  airport: Airport;
  time: string;
  date: string;
  alignRight?: boolean;
}) {
  return (
    <div className={cn("min-w-0", alignRight && "text-right")}>
      <p className="truncate text-xs font-semibold text-ink">
        {airport.city} ({airport.code})
      </p>
      <p className="text-base font-bold leading-tight text-ink">{time}</p>
      <p className="text-xs text-ink-muted">{formatDate(date).replace(/, \d{4}$/, "")}</p>
      <p className="truncate text-[11px] text-ink-subtle" title={airport.airport}>
        {airport.airport}
      </p>
      {airport.terminal && <p className="text-[11px] text-ink-subtle">Terminal: {airport.terminal}</p>}
    </div>
  );
}

function FareBreakup({ flight, counts }: { flight: Flight; counts: TravellerCounts }) {
  const price = priceTrip(flight, null, counts);
  const discount = flight.fare.discount ?? 0;
  const discounted = counts.adults * discount;

  return (
    <dl className="max-w-sm space-y-2">
      {price.lines.map((line) => (
        <Row
          key={line.type}
          label={`${passengerTypeLabel(line.type, line.count)} × ${line.count} (${formatINR(line.unit)} each)`}
          value={formatINR(line.total)}
        />
      ))}
      <Row label="Includes taxes and fees" value={formatINR(price.taxes)} />
      {discounted > 0 && <Row label="Discount already applied" value={`− ${formatINR(discounted)}`} highlight />}
      <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-base font-bold text-ink">
        <dt>Total for this flight</dt>
        <dd>{formatINR(price.total)}</dd>
      </div>
    </dl>
  );
}

function BaggageDetail({ flight }: { flight: Flight }) {
  const segments = segmentsOf(flight);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-ink-subtle">
              <th className="pb-2 font-semibold">Flight</th>
              <th className="pb-2 font-semibold">Cabin</th>
              <th className="pb-2 font-semibold">Check-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {segments.map((seg) => (
              <tr key={seg.id}>
                <td className="py-2 font-semibold text-ink">
                  {seg.origin.code} – {seg.destination.code}
                  <span className="ml-1.5 font-normal text-ink-subtle">{seg.flightNumber}</span>
                </td>
                <td className="py-2 text-ink">{flight.baggage.cabin}</td>
                <td className="py-2 text-ink">{flight.baggage.checkIn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-subtle">
        Allowance is per passenger.
        {segments.length > 1 && " On connections, bags are usually checked through to your final destination."}{" "}
        Excess baggage is charged by the airline at the airport.
      </p>
    </div>
  );
}

function PolicyDetail({ flight }: { flight: Flight }) {
  return (
    <ul className="space-y-2 text-xs text-ink-muted">
      <li>
        <span className="font-semibold text-ink">Cancellation:</span>{" "}
        {flight.refundable
          ? "Refundable after airline and Tripime cancellation charges."
          : "This fare is non-refundable. Statutory taxes may still be refunded."}
      </li>
      <li>
        <span className="font-semibold text-ink">Date change:</span> Allowed with airline change fee
        plus fare difference.
      </li>
      {segmentsOf(flight).length > 1 && (
        <li>
          <span className="font-semibold text-ink">Connections:</span> Both flights are on one
          booking, so a missed connection caused by a delay is rebooked by the airline.
        </li>
      )}
      <li>
        <span className="font-semibold text-ink">Seats:</span> Seat selection is chargeable and
        confirmed at checkout.
      </li>
    </ul>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", highlight ? "text-success-700" : "text-ink-muted")}>
      <dt>{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}
