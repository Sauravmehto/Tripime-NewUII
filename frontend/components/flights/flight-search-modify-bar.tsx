"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeftRight, ArrowRight, CalendarDays, MapPin, SlidersHorizontal, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlightSearchForm } from "@/components/search/flight-search-form";
import { friendlyDate } from "@/lib/flights/calendar";
import { travellersLabel } from "@/lib/flights/search-params";
import { useFlightCatalog } from "@/lib/flights/use-flight-catalog";
import type { SearchParams } from "@/types";

interface FlightSearchModifyBarProps {
  search: SearchParams;
  onSearch: (search: SearchParams) => void;
}

export function FlightSearchModifyBar({ search, onSearch }: FlightSearchModifyBarProps) {
  const [open, setOpen] = useState(false);
  const { airportByCode } = useFlightCatalog();
  const from = airportByCode(search.origin);
  const to = airportByCode(search.destination);
  const roundTrip = search.tripType === "round_trip";

  return (
    <section className="rounded-2xl bg-linear-to-r from-primary-900 via-primary-800 to-primary-600 text-white shadow-elevated">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 p-3 sm:p-4">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4">
          <Segment icon={<MapPin className="size-3.5" aria-hidden />} label="From">
            {from?.city ?? search.origin} ({search.origin})
          </Segment>
          <Segment
            icon={
              roundTrip ? (
                <ArrowLeftRight className="size-3.5" aria-hidden />
              ) : (
                <ArrowRight className="size-3.5" aria-hidden />
              )
            }
            label={roundTrip ? "To · round trip" : "To"}
          >
            {to?.city ?? search.destination} ({search.destination})
          </Segment>
          <Segment icon={<CalendarDays className="size-3.5" aria-hidden />} label={roundTrip ? "Dates" : "Departure"}>
            {friendlyDate(search.date)}
            {roundTrip && search.returnDate ? ` – ${friendlyDate(search.returnDate)}` : ""}
          </Segment>
          <Segment icon={<Users className="size-3.5" aria-hidden />} label="Travellers">
            {travellersLabel(search)} · {search.cabin}
          </Segment>
        </div>

        <Button
          variant="accent"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="w-full shrink-0 sm:w-auto"
        >
          {open ? (
            <X className="size-4" aria-hidden />
          ) : (
            <SlidersHorizontal className="size-4" aria-hidden />
          )}
          {open ? "Close" : "Modify search"}
        </Button>
      </div>

      {open && (
        <div className="animate-panel-in border-t border-white/15 p-3 sm:p-4">
          <FlightSearchForm
            key={JSON.stringify(search)}
            variant="bar"
            initial={search}
            onSearch={(next) => {
              setOpen(false);
              onSearch(next);
            }}
          />
        </div>
      )}
    </section>
  );
}

function Segment({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 border-white/15 px-1 sm:border-l sm:px-3 sm:first:border-l-0">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/60">
        {icon}
        {label}
      </p>
      <p className="truncate text-sm font-semibold">{children}</p>
    </div>
  );
}
