"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeftRight, CalendarDays, Pencil, Plane, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";
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
    <section
      aria-label="Your flight search"
      className="overflow-hidden rounded-xl bg-linear-to-r from-primary-900 to-primary-700 text-white"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none sm:gap-4">
          <Place code={search.origin} city={from?.city} />
          <div className="flex min-w-16 flex-1 flex-col items-center gap-0.5 sm:w-28 sm:flex-none" aria-hidden>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">
              {roundTrip ? "Round trip" : "One way"}
            </span>
            <span className="flex w-full items-center gap-1 text-white/70">
              <span className="h-px flex-1 border-t border-dashed border-white/35" />
              {roundTrip ? <ArrowLeftRight className="size-3.5" /> : <Plane className="size-3.5 rotate-45" />}
              <span className="h-px flex-1 border-t border-dashed border-white/35" />
            </span>
          </div>
          <Place code={search.destination} city={to?.city} alignRight />
        </div>

        <div className="flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:w-auto">
          <Chip icon={<CalendarDays className="size-3.5" aria-hidden />} label={roundTrip ? "Dates" : "Departure"} fit={!roundTrip}>
            {friendlyDate(search.date)}
            {roundTrip && search.returnDate ? ` – ${friendlyDate(search.returnDate)}` : ""}
          </Chip>
          <Chip icon={<Users className="size-3.5" aria-hidden />} label="Travellers">
            {travellersLabel(search)}, {search.cabin}
          </Chip>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close search form" : "Modify search"}
            className={cn(
              "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800",
              open ? "bg-white/15 text-white hover:bg-white/20" : "bg-white text-primary-800 hover:bg-primary-50",
            )}
          >
            {open ? <X className="size-3.5" aria-hidden /> : <Pencil className="size-3.5" aria-hidden />}
            <span className="hidden min-[420px]:inline">{open ? "Close" : "Modify"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-panel-in border-t border-white/15 p-3">
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

function Place({ code, city, alignRight }: { code: string; city?: string; alignRight?: boolean }) {
  return (
    <div className={cn("min-w-0", alignRight && "text-right sm:text-left")}>
      <p className="text-[26px] font-bold leading-none tracking-tight">{code}</p>
      <p className="mt-0.5 truncate text-[11px] text-white/70">{city ?? code}</p>
    </div>
  );
}

function Chip({ icon, label, fit, children }: { icon: ReactNode; label: string; fit?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-9 min-w-0 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 ring-1 ring-inset ring-white/15 sm:flex-none",
        fit ? "shrink-0" : "flex-1",
      )}
      title={label}
    >
      <span className="shrink-0 text-white/70">{icon}</span>
      <span className="sr-only">{label}: </span>
      <span className="truncate text-[13px] font-medium">{children}</span>
    </div>
  );
}
