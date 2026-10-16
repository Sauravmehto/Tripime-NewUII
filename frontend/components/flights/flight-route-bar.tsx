import Link from "next/link";
import { ArrowLeftRight, ArrowRight, CalendarDays, Users } from "lucide-react";
import { formatDate } from "@/lib/format";
import { travellersLabel } from "@/lib/flights/search-params";
import { stopsLabel, stopsOf } from "@/lib/flights/segments";
import type { Flight, TravellerCounts } from "@/types";

export function FlightRouteBar({
  flight,
  returnFlight,
  counts,
  changeFlightTo,
  className = "",
}: {
  flight: Flight;
  returnFlight?: Flight | null;
  counts: TravellerCounts;
  changeFlightTo?: string;
  className?: string;
}) {
  const RouteIcon = returnFlight ? ArrowLeftRight : ArrowRight;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xs ${className}`}
    >
      <p className="flex items-center gap-2 text-sm font-bold text-ink">
        {flight.origin.city.toUpperCase()} ({flight.origin.code})
        <RouteIcon className="size-4 text-primary-600" aria-label={returnFlight ? "round trip to" : "to"} />
        {flight.destination.city.toUpperCase()} ({flight.destination.code})
      </p>
      <span className="hidden h-4 w-px bg-neutral-200 sm:block" aria-hidden />
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <CalendarDays className="size-3.5 text-ink-subtle" aria-hidden />
        {formatDate(flight.departureDate)}
        {returnFlight && <> – {formatDate(returnFlight.departureDate)}</>}
      </p>
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <Users className="size-3.5 text-ink-subtle" aria-hidden />
        {travellersLabel(counts)} · {flight.cabinClass}
      </p>
      {[flight, returnFlight].map((f, i) => {
        if (!f) return null;
        const stops = stopsOf(f);
        return (
          <span
            key={i}
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
              stops ? "bg-warning-50 text-warning-500" : "bg-success-50 text-success-700"
            }`}
          >
            {returnFlight ? (i === 0 ? "Dep · " : "Ret · ") : ""}
            {stopsLabel(stops)}
          </span>
        );
      })}
      {changeFlightTo && (
        <Link
          href={changeFlightTo}
          className="ml-auto text-xs font-semibold text-primary-700 transition hover:text-primary-800"
        >
          Choose different flight{returnFlight ? "s" : ""}
        </Link>
      )}
    </div>
  );
}
