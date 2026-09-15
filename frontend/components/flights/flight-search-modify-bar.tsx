"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { INVENTORY_END, INVENTORY_START, airportOf } from "@/lib/airports";
import { formatDate } from "@/lib/format";

const DESTINATIONS = ["BOM", "BLR"];

export interface ModifySearchValues {
  destination: string;
  date: string;
  passengers: number;
}

interface FlightSearchModifyBarProps {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  onSearch: (values: ModifySearchValues) => void;
}

export function FlightSearchModifyBar({
  origin,
  destination,
  date,
  passengers,
  onSearch,
}: FlightSearchModifyBarProps) {
  const [open, setOpen] = useState(false);
  const [draftDestination, setDraftDestination] = useState(destination);
  const [draftDate, setDraftDate] = useState(date);
  const [draftPassengers, setDraftPassengers] = useState(passengers);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs draft fields when the search params change
    setDraftDestination(destination);
    setDraftDate(date);
    setDraftPassengers(passengers);
  }, [destination, date, passengers]);

  const from = airportOf(origin);
  const to = airportOf(destination);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setOpen(false);
    onSearch({
      destination: draftDestination,
      date: draftDate,
      passengers: draftPassengers,
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900 via-primary-800 to-primary-600 text-white shadow-elevated">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 p-3 sm:p-4">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4">
          <Segment icon={<MapPin className="size-3.5" aria-hidden />} label="From">
            {from.city} ({from.code})
          </Segment>
          <Segment icon={<MapPin className="size-3.5" aria-hidden />} label="To">
            {to.city} ({to.code})
          </Segment>
          <Segment icon={<CalendarDays className="size-3.5" aria-hidden />} label="Departure">
            {formatDate(date)}
          </Segment>
          <Segment icon={<Users className="size-3.5" aria-hidden />} label="Travellers">
            {passengers} {passengers === 1 ? "Adult" : "Adults"} · Economy
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
        <form
          onSubmit={handleSubmit}
          className="animate-panel-in border-t border-white/15 bg-white p-4 text-ink"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.8fr_auto] lg:items-end">
            <Field label="From">
              <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-medium text-ink-muted sm:h-12">
                {from.city} ({from.code})
              </div>
            </Field>

            <Field label="To">
              <Select
                value={draftDestination}
                onChange={(event) => setDraftDestination(event.target.value)}
              >
                {DESTINATIONS.map((code) => {
                  const airport = airportOf(code);
                  return (
                    <option key={code} value={code}>
                      {airport.city} ({code})
                    </option>
                  );
                })}
              </Select>
            </Field>

            <Field label="Departure">
              <Input
                type="date"
                min={INVENTORY_START}
                max={INVENTORY_END}
                required
                value={draftDate}
                onChange={(event) => setDraftDate(event.target.value)}
              />
            </Field>

            <Field label="Travellers">
              <Select
                value={draftPassengers}
                onChange={(event) => setDraftPassengers(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? "Adult" : "Adults"}
                  </option>
                ))}
              </Select>
            </Field>

            <Button
              type="submit"
              size="lg"
              variant="accent"
              className="h-11 w-full sm:h-12 lg:min-w-[140px]"
            >
              <Search className="size-4" aria-hidden />
              Search
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-subtle">
            <ArrowRightLeft className="size-3.5" aria-hidden />
            Inventory available 4–31 August 2026 on Delhi departures.
          </p>
        </form>
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
