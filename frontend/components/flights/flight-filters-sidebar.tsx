"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  IndianRupee,
  Moon,
  ShieldCheck,
  Sun,
  Sunrise,
  Sunset,
  Plane,
} from "lucide-react";
import { AirlineMark } from "./airline-mark";
import {
  TIME_SLOTS,
  toggleValue,
  type AirlineFacet,
  type FlightFilters,
  type PriceBounds,
  type TimeSlotId,
} from "@/lib/flights/flight-filters";
import { formatINR } from "@/lib/format";

const SLOT_ICONS: Record<TimeSlotId, ReactNode> = {
  early: <Sunrise className="size-4" aria-hidden />,
  morning: <Sun className="size-4" aria-hidden />,
  afternoon: <Sunset className="size-4" aria-hidden />,
  night: <Moon className="size-4" aria-hidden />,
};

interface FlightFiltersSidebarProps {
  filters: FlightFilters;
  onChange: (filters: FlightFilters) => void;
  facets: AirlineFacet[];
  bounds: PriceBounds;
  slotCounts: Record<TimeSlotId, number>;
  activeCount: number;
  onClear: () => void;
  className?: string;
}

export function FlightFiltersSidebar({
  filters,
  onChange,
  facets,
  bounds,
  slotCounts,
  activeCount,
  onClear,
  className = "",
}: FlightFiltersSidebarProps) {
  const maxPrice = filters.maxPrice ?? bounds.max;
  const priceDisabled = bounds.max <= bounds.min;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-soft">
        <p className="text-sm font-bold text-ink">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
              {activeCount}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onClear}
          disabled={activeCount === 0}
          className="text-xs font-semibold text-primary-700 transition hover:text-primary-800 disabled:cursor-not-allowed disabled:text-neutral-300"
        >
          Clear all
        </button>
      </div>

      <FilterSection title="Price range" icon={<IndianRupee className="size-4" aria-hidden />}>
        <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
          <span>{formatINR(bounds.min)}</span>
          <span className="text-primary-700">Up to {formatINR(maxPrice)}</span>
        </div>
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={100}
          value={maxPrice}
          disabled={priceDisabled}
          onChange={(event) => onChange({ ...filters, maxPrice: Number(event.target.value) })}
          aria-label="Maximum price"
          className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-primary-600 disabled:cursor-not-allowed"
        />
      </FilterSection>

      <FilterSection title="Departure from origin" icon={<Plane className="size-4" aria-hidden />}>
        <div className="grid grid-cols-2 gap-2">
          {TIME_SLOTS.map((slot) => {
            const active = filters.departSlots.includes(slot.id);
            const count = slotCounts[slot.id];
            return (
              <button
                key={slot.id}
                type="button"
                disabled={count === 0}
                onClick={() =>
                  onChange({ ...filters, departSlots: toggleValue(filters.departSlots, slot.id) })
                }
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "border-primary-500 bg-primary-50 text-primary-800 ring-1 ring-primary-200"
                    : "border-neutral-200 text-ink-muted hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {SLOT_ICONS[slot.id]}
                <span>{slot.hint}</span>
                <span className="text-[10px] font-medium text-ink-subtle">{count} flights</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Airlines" icon={<Plane className="size-4 rotate-45" aria-hidden />}>
        <ul className="space-y-1">
          {facets.map((facet) => {
            const checked = filters.airlines.includes(facet.name);
            return (
              <li key={facet.name}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({ ...filters, airlines: toggleValue(filters.airlines, facet.name) })
                    }
                    className="size-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <AirlineMark code={facet.code} name={facet.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-muted">
                    {facet.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-ink-subtle">
                    {formatINR(facet.cheapest)}
                  </span>
                </label>
              </li>
            );
          })}
          {facets.length === 0 && (
            <li className="px-2 py-2 text-sm text-ink-muted">No airlines available</li>
          )}
        </ul>
      </FilterSection>

      <FilterSection title="Fare policy" icon={<ShieldCheck className="size-4" aria-hidden />}>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-neutral-50">
          <input
            type="checkbox"
            checked={filters.refundableOnly}
            onChange={(event) => onChange({ ...filters, refundableOnly: event.target.checked })}
            className="size-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-ink-muted">Refundable fares only</span>
        </label>
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-neutral-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="text-primary-600">{icon}</span>
          {title}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-ink-subtle transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open && <div className="animate-panel-in border-t border-neutral-100 p-3">{children}</div>}
    </section>
  );
}
