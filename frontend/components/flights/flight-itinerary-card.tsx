import type { ReactNode } from "react";
import { Armchair, Clock, Luggage, Plane, ShieldCheck } from "lucide-react";
import { AirlineMark } from "./airline-mark";
import { formatDate, formatDuration } from "@/lib/format";
import type { Flight } from "@/types";

export function FlightItineraryCard({
  flight,
  className = "",
}: {
  flight: Flight;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/70 px-4 py-2.5">
        <h2 className="text-sm font-bold text-ink">Flight details</h2>
        <p className="text-xs text-ink-muted">{formatDate(flight.departureDate)}</p>
      </header>
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center">
        <div className="flex items-center gap-2.5">
          <AirlineMark code={flight.airline.code} name={flight.airline.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{flight.airline.name}</p>
            <p className="truncate text-xs text-ink-muted">{flight.flightNumber}</p>
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="min-w-0">
            <p className="text-lg font-bold text-ink">{flight.departureTime}</p>
            <p className="text-xs font-semibold text-ink-muted">{flight.origin.code}</p>
          </div>
          <div className="flex flex-col items-center px-1 text-center">
            <p className="text-[11px] font-medium text-ink-muted">
              {formatDuration(flight.durationMinutes)}
            </p>
            <div className="relative my-1.5 w-16 sm:w-28">
              <div className="h-px w-full bg-neutral-300" />
              <Plane
                className="absolute -top-[7px] left-1/2 size-3.5 -translate-x-1/2 rotate-90 bg-white text-primary-500"
                aria-hidden
              />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-success-700">
              Non-stop
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-lg font-bold text-ink">{flight.arrivalTime}</p>
            <p className="text-xs font-semibold text-ink-muted">{flight.destination.code}</p>
          </div>
        </div>
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
