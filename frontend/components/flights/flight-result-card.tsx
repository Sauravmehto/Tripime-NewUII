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
  PlaneTakeoff,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Tag as TagIcon,
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
        "animate-fade-up group/card relative overflow-hidden rounded-2xl border bg-white shadow-soft transition duration-300",
        "hover:-translate-y-0.5 hover:shadow-elevated motion-reduce:hover:translate-y-0",
        open ? "border-primary-300 ring-4 ring-primary-500/5" : "border-neutral-200/80 hover:border-primary-200",
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      {/* A thin accent rail marks the stand-out results. */}
      {(cheapest || fastest) && (
        <span
          aria-hidden
          className={cn("absolute inset-y-0 left-0 w-1", cheapest ? "bg-success-500" : "bg-primary-500")}
        />
      )}

      <div className="grid md:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AirlineMark code={flight.airline.code} name={flight.airline.name} size="lg" className="rounded-xl shadow-soft" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-ink">{flight.airline.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {flight.flightNumber}
                  {segments.length === 1 && flight.aircraft ? <span className="text-ink-subtle"> · {flight.aircraft}</span> : null}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
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
              {discount > 0 && (
                <Badge tone="accent">
                  <TagIcon className="size-3" aria-hidden /> Deal
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(96px,1.3fr)_minmax(0,1fr)] items-center gap-2 sm:gap-4">
            <Endpoint time={flight.departureTime} airport={flight.origin} />

            <div className="flex flex-col items-center text-center" title={via ? `Via ${via}` : undefined}>
              <p className="text-[11px] font-semibold text-ink-muted">{formatDuration(flight.durationMinutes)}</p>
              <div className="relative my-1.5 flex w-full items-center" aria-hidden>
                <span className="size-1.5 shrink-0 rounded-full border border-neutral-300 bg-white" />
                <span className="relative h-px flex-1 bg-linear-to-r from-neutral-300 via-primary-300 to-neutral-300">
                  {Array.from({ length: stops }, (_, i) => (
                    <span
                      key={i}
                      className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-white"
                      style={{ left: `${((i + 1) / (stops + 1)) * 100}%` }}
                    />
                  ))}
                </span>
                <Plane className="size-3.5 shrink-0 rotate-45 text-primary-600 transition-transform duration-500 group-hover/card:translate-x-0.5" />
              </div>
              <p
                className={cn(
                  "text-[11px] font-semibold",
                  stops ? "text-accent-dark" : "text-success-700",
                )}
              >
                {stopsLabel(stops)}
                {via && <span className="font-medium text-ink-subtle"> · {via}</span>}
              </p>
            </div>

            <Endpoint time={flight.arrivalTime} airport={flight.destination} dayShift={dayShift} alignRight />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-neutral-200 pt-3 text-[11px] font-semibold">
            <span className={cn("inline-flex items-center gap-1", flight.refundable ? "text-success-700" : "text-ink-muted")}>
              {flight.refundable ? (
                <ShieldCheck className="size-3.5" aria-hidden />
              ) : (
                <ShieldOff className="size-3.5" aria-hidden />
              )}
              {flight.refundable ? "Refundable" : "Non-refundable"}
            </span>
            {flight.baggage?.checkIn && (
              <span className="inline-flex items-center gap-1 text-ink-muted">
                <Luggage className="size-3.5" aria-hidden />
                {flight.baggage.checkIn}
              </span>
            )}
            {fewSeats && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-accent-dark">
                Only {flight.availableSeats} seat{flight.availableSeats === 1 ? "" : "s"} left
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={detailId}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-1 text-xs font-semibold text-primary-700 transition hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {open ? "Hide details" : "Flight details"}
              <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 bg-linear-to-b from-neutral-50/40 to-neutral-50 px-4 py-3.5 sm:px-5 md:flex-col md:items-stretch md:justify-center md:border-l md:border-t-0 md:py-5">
          <div className="min-w-0 md:text-right">
            {discount > 0 && (
              <p className="flex items-center gap-1.5 md:justify-end">
                <span className="text-xs text-ink-subtle line-through tabular-nums">{formatINR(original)}</span>
                <span className="rounded-md bg-success-50 px-1.5 py-px text-[10px] font-bold text-success-700">
                  Save {formatINR(discount)}
                </span>
              </p>
            )}
            <p className="text-2xl font-extrabold leading-tight tracking-tight tabular-nums text-ink">
              {formatINR(flight.fare.totalFare)}
            </p>
            <p className="text-[11px] text-ink-subtle">per adult · incl. taxes</p>
          </div>
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "inline-flex h-11 min-w-[128px] shrink-0 items-center justify-center gap-1 rounded-xl px-5 text-sm font-bold text-white transition duration-200 md:w-full",
              "bg-linear-to-b from-accent to-accent-dark shadow-[0_10px_20px_-10px_rgb(225_77_85/0.9)]",
              "hover:-translate-y-px hover:shadow-[0_14px_24px_-10px_rgb(225_77_85/0.95)] active:translate-y-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0",
            )}
          >
            {ctaLabel}
            <ChevronRight className="size-4 transition-transform duration-200 group-hover/card:translate-x-0.5" aria-hidden />
          </button>
        </div>
      </div>

      {open && (
        <div id={detailId} className="animate-fade-up border-t border-neutral-100 bg-neutral-50/40 px-4 pb-4 pt-3 sm:px-5">
          <div className="mb-3 flex items-center justify-between rounded-xl bg-primary-50 px-4 py-2.5">
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <PlaneTakeoff className="size-4 text-primary-600" aria-hidden />
              {flight.origin.city} → {flight.destination.city}
            </p>
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Timer className="size-4 text-primary-600" aria-hidden />
              {formatDuration(flight.durationMinutes)}
            </p>
          </div>

          <div role="tablist" aria-label="Flight details" className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1">
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
                  "flex-1 shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                  tab === detail.id ? "bg-white text-ink shadow-soft" : "text-ink-muted hover:text-ink",
                )}
              >
                {detail.label}
              </button>
            ))}
          </div>

          <div
            id={`${tabsId}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsId}-${tab}`}
            className="mt-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-ink-muted"
          >
            {tab === "flight" && <SegmentsDetail flight={flight} />}
            {tab === "baggage" && <BaggageDetail flight={flight} />}
            {tab === "fare" && <FareBreakup flight={flight} counts={counts} />}
            {tab === "cancellation" && <PolicyDetail flight={flight} />}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-subtle">
              {segments.length > 1 ? "Questions about this connection?" : "Not sure this is the right flight?"}
            </p>
            <div className="flex items-center gap-3">
              <a
                href={telLink()}
                className="inline-flex items-center gap-1 rounded-md text-xs font-semibold text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Phone className="size-3.5" aria-hidden /> Call an expert
              </a>
              <a
                href={whatsappLink(
                  `Hi Tripime, I have a question about ${flight.airline.name} ${flight.flightNumber} (${flight.origin.code} → ${flight.destination.code}).`,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md text-xs font-semibold text-success-700 hover:text-success-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500"
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
    <div className={cn("min-w-0", alignRight && "text-right")}>
      <p className="text-xl font-extrabold leading-none tracking-tight tabular-nums text-ink sm:text-2xl">
        {time}
        {dayShift > 0 && (
          <sup className="ml-0.5 text-[10px] font-bold text-accent" title={`Arrives ${dayShift} day${dayShift > 1 ? "s" : ""} later`}>
            +{dayShift}
          </sup>
        )}
      </p>
      <p className="mt-1 truncate text-xs text-ink-muted">
        <span className="font-bold text-ink">{airport.code}</span> · {airport.city}
      </p>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "success" | "primary" | "accent" }) {
  const tones = {
    success: "bg-success-50 text-success-700 ring-success-500/20",
    primary: "bg-primary-50 text-primary-700 ring-primary-500/20",
    accent: "bg-accent-soft text-accent-dark ring-accent/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${tones[tone]}`}
    >
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
      <p className="text-lg font-extrabold leading-tight text-ink">{time}</p>
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
