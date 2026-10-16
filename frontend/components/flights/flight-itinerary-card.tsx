import { Fragment, type ReactNode } from "react";
import { Armchair, Clock, Luggage, Plane, ShieldCheck } from "lucide-react";
import { AirlineMark } from "./airline-mark";
import { formatDate, formatDuration } from "@/lib/format";
import { segmentsOf, stopsLabel, stopsOf } from "@/lib/flights/segments";
import type { Flight } from "@/types";

export function FlightItineraryCard({
  flight,
  title = "Flight details",
  className = "",
}: {
  flight: Flight;
  title?: string;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/70 px-4 py-2.5">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <p className="text-xs text-ink-muted">
          {formatDate(flight.departureDate)} · {stopsLabel(stopsOf(flight))} · {formatDuration(flight.durationMinutes)}
        </p>
      </header>
      <div className="divide-y divide-dashed divide-neutral-200">
        {segmentsOf(flight).map((seg, i) => {
          const layover = i > 0 ? flight.layovers?.[i - 1] : undefined;
          return (
            <Fragment key={seg.id}>
              {layover && (
                <p className="flex items-center justify-between gap-2 bg-warning-50/50 px-4 py-2 text-xs text-ink-muted">
                  <span>
                    Change planes in{" "}
                    <strong className="text-ink">
                      {layover.airport.city} ({layover.airport.code})
                    </strong>
                  </span>
                  <strong className="text-ink">{formatDuration(layover.durationMinutes)} layover</strong>
                </p>
              )}
              <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center">
                <div className="flex items-center gap-2.5">
                  <AirlineMark code={seg.airline.code} name={seg.airline.name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{seg.airline.name}</p>
                    <p className="truncate text-xs text-ink-muted">{seg.flightNumber}</p>
                  </div>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-ink">{seg.departureTime}</p>
                    <p className="truncate text-xs font-semibold text-ink-muted">
                      {seg.origin.code}
                      {seg.origin.terminal && <span className="font-normal"> · {seg.origin.terminal}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-center px-1 text-center">
                    <p className="text-[11px] font-medium text-ink-muted">{formatDuration(seg.durationMinutes)}</p>
                    <div className="relative my-1.5 w-16 sm:w-28">
                      <div className="h-px w-full bg-neutral-300" />
                      <Plane
                        className="absolute -top-[7px] left-1/2 size-3.5 -translate-x-1/2 rotate-90 bg-white text-primary-500"
                        aria-hidden
                      />
                    </div>
                    <p className="text-[11px] text-ink-subtle">{formatDate(seg.departureDate).replace(/, \d{4}$/, "")}</p>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-lg font-bold text-ink">{seg.arrivalTime}</p>
                    <p className="truncate text-xs font-semibold text-ink-muted">
                      {seg.destination.code}
                      {seg.destination.terminal && <span className="font-normal"> · {seg.destination.terminal}</span>}
                    </p>
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-neutral-100 px-4 py-2.5 text-[11px] font-medium text-ink-muted">
        <Tag><Armchair className="size-3" aria-hidden /> {flight.cabinClass}</Tag>
        <Tag><Luggage className="size-3" aria-hidden /> Cabin {flight.baggage.cabin}</Tag>
        <Tag><Clock className="size-3" aria-hidden /> {flight.aircraft}</Tag>
        <Tag highlight={flight.refundable}>
          <ShieldCheck className="size-3" aria-hidden />
          {flight.refundable ? "Refundable" : "Non-refundable"}
        </Tag>
      </div>
    </section>
  );
}

function Tag({ children, highlight = false }: { children: ReactNode; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
        highlight
          ? "border-success-200 bg-success-50 text-success-700"
          : "border-neutral-200 bg-neutral-50 text-ink-muted"
      }`}
    >
      {children}
    </span>
  );
}
