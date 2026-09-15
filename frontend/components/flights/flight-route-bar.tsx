import Link from "next/link";
import { ArrowRight, CalendarDays, Users } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Flight } from "@/types";

export function FlightRouteBar({
  flight,
  passengers,
  changeFlightTo,
  className = "",
}: {
  flight: Flight;
  passengers: number;
  changeFlightTo?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xs ${className}`}
    >
      <p className="flex items-center gap-2 text-sm font-bold text-ink">
        {flight.origin.city.toUpperCase()} ({flight.origin.code})
        <ArrowRight className="size-4 text-primary-600" aria-hidden />
        {flight.destination.city.toUpperCase()} ({flight.destination.code})
      </p>
      <span className="hidden h-4 w-px bg-neutral-200 sm:block" aria-hidden />
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <CalendarDays className="size-3.5 text-ink-subtle" aria-hidden />
        {formatDate(flight.departureDate)}
      </p>
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <Users className="size-3.5 text-ink-subtle" aria-hidden />
        {passengers} {passengers === 1 ? "Adult" : "Adults"}
      </p>
      <span className="rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success-700">
        Non-stop
      </span>
      {changeFlightTo && (
        <Link
          href={changeFlightTo}
          className="ml-auto text-xs font-semibold text-primary-700 transition hover:text-primary-800"
        >
          Choose different flight
        </Link>
      )}
    </div>
  );
}
