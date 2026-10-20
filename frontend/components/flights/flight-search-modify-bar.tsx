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
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary-900 via-primary-800 to-primary-600 text-white shadow-elevated"
    >
      {/* Soft light blobs give the banner depth without an image. */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-primary-400/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
          <Place code={search.origin} city={from?.city} />

          <div className="flex min-w-12 flex-1 flex-col items-center gap-1 sm:max-w-44" aria-hidden>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
              {roundTrip ? "Round trip" : "One way"}
            </span>
            <span className="relative flex w-full items-center">
              <span className="h-px flex-1 border-t border-dashed border-white/40" />
              <span className="mx-1.5 flex size-7 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur">
                {roundTrip ? <ArrowLeftRight className="size-3.5" /> : <Plane className="size-3.5" />}
              </span>
              <span className="h-px flex-1 border-t border-dashed border-white/40" />
            </span>
          </div>

          <Place code={search.destination} city={to?.city} alignRight />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <Chip icon={<CalendarDays className="size-3.5" aria-hidden />} label={roundTrip ? "Dates" : "Departure"}>
            {friendlyDate(search.date)}
            {roundTrip && search.returnDate ? ` – ${friendlyDate(search.returnDate)}` : ""}
          </Chip>
          <Chip icon={<Users className="size-3.5" aria-hidden />} label="Travellers">
            {travellersLabel(search)} · {search.cabin}
          </Chip>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition sm:w-auto",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800",
              open
                ? "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/20"
                : "bg-white text-primary-800 shadow-medium hover:-translate-y-px hover:shadow-elevated motion-reduce:hover:translate-y-0",
            )}
          >
            {open ? <X className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
            {open ? "Close" : "Modify search"}
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-panel-in relative border-t border-white/15 p-3 sm:p-4">
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
    <div className={cn("min-w-0", alignRight && "text-right")}>
      <p className="text-2xl font-extrabold leading-none tracking-tight sm:text-3xl">{code}</p>
      <p className="mt-1 truncate text-xs font-medium text-white/75 sm:text-sm">{city ?? code}</p>
    </div>
  );
}

function Chip({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur sm:flex-none">
      <span className="hidden size-7 shrink-0 items-center justify-center rounded-lg bg-white/15 sm:flex">{icon}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/60">
          <span className="sm:hidden">{icon}</span>
          {label}
        </span>
        <span className="block truncate text-[13px] font-semibold sm:text-sm">{children}</span>
      </span>
    </div>
  );
}
