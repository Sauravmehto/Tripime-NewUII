"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { cn } from "@/lib/cn";
import { AirlineMark } from "@/components/flights/airline-mark";
import { RangeSlider } from "@/components/ui/range-slider";
import {
  toggleValue,
  type FlightFacets,
  type FlightFilters,
  type Range,
} from "@/lib/flights/flight-filters";
import { clock12 } from "@/lib/flights/segments";
import { formatINR } from "@/lib/format";

interface FlightFiltersSidebarProps {
  filters: FlightFilters;
  onChange: (filters: FlightFilters) => void;
  facets: FlightFacets;
  /** Airport codes for the leg being shown (labels for the time sliders). */
  fromLabel: string;
  toLabel: string;
  activeCount: number;
  onClear: () => void;
  /** Airline name → code, for the logo badges. */
  airlineCodes: Record<string, string>;
}

export function FlightFiltersSidebar({
  filters,
  onChange,
  facets,
  fromLabel,
  toLabel,
  activeCount,
  onClear,
  airlineCodes,
}: FlightFiltersSidebarProps) {
  const set = (patch: Partial<FlightFilters>) => onChange({ ...filters, ...patch });
  const rangeOr = (range: Range | null, full: Range): Range => range ?? full;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <p className="text-sm font-bold text-ink">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onClear}
          disabled={activeCount === 0}
          className="text-xs font-semibold text-primary-700 hover:text-primary-800 disabled:text-ink-subtle"
        >
          Clear all
        </button>
      </div>

      {facets.stops.length > 0 && (
        <Section title="Stops" onReset={filters.stops.length ? () => set({ stops: [] }) : undefined}>
          <div className="grid grid-cols-2 gap-2">
            {facets.stops.map((stop) => {
              const active = filters.stops.includes(stop.key);
              return (
                <button
                  key={stop.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ stops: toggleValue(filters.stops, stop.key) })}
                  className={cn(
                    "rounded-xl border px-2.5 py-2 text-left transition",
                    active
                      ? "border-primary-500 bg-primary-50 shadow-[0_0_0_3px_rgb(59_130_246/0.12)]"
                      : "border-neutral-200 hover:border-primary-300",
                  )}
                >
                  <span className="block text-xs font-bold text-ink">{stop.label}</span>
                  <span className="block text-[11px] text-ink-muted">
                    from {formatINR(stop.cheapest)} · {stop.count}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Airlines" onReset={filters.airlines.length ? () => set({ airlines: [] }) : undefined}>
        <ul className="-mx-1 max-h-60 space-y-0.5 overflow-y-auto px-1">
          {facets.airlines.map((airline) => {
            const checked = filters.airlines.includes(airline.key);
            return (
              <li key={airline.key}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm transition hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => set({ airlines: toggleValue(filters.airlines, airline.key) })}
                    className="size-4 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <AirlineMark code={airlineCodes[airline.key] ?? "?"} name={airline.key} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {airline.key}
                    <span className="ml-1 text-[11px] text-ink-subtle">({airline.count})</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">
                    {formatINR(airline.cheapest)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Price" onReset={filters.price ? () => set({ price: null }) : undefined}>
        <RangeSlider
          min={facets.price[0]}
          max={facets.price[1]}
          step={10}
          value={rangeOr(filters.price, facets.price)}
          onChange={(price) => set({ price })}
          labels={["Minimum price", "Maximum price"]}
          format={formatINR}
        />
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-muted">
          <input
            type="checkbox"
            checked={filters.refundableOnly}
            onChange={(e) => set({ refundableOnly: e.target.checked })}
            className="size-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          Refundable fares only
        </label>
      </Section>

      <Section
        title="Times"
        onReset={filters.depart || filters.arrive ? () => set({ depart: null, arrive: null }) : undefined}
      >
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink">
          <PlaneTakeoff className="size-3.5 text-primary-600" aria-hidden />
          Depart from {fromLabel}
        </p>
        <RangeSlider
          min={facets.depart[0]}
          max={facets.depart[1]}
          step={5}
          value={rangeOr(filters.depart, facets.depart)}
          onChange={(depart) => set({ depart })}
          labels={[`Earliest departure from ${fromLabel}`, `Latest departure from ${fromLabel}`]}
          format={clock12}
        />
        <p className="mb-2 mt-5 flex items-center gap-1.5 text-xs font-semibold text-ink">
          <PlaneLanding className="size-3.5 text-primary-600" aria-hidden />
          Arrive at {toLabel}
        </p>
        <RangeSlider
          min={facets.arrive[0]}
          max={facets.arrive[1]}
          step={5}
          value={rangeOr(filters.arrive, facets.arrive)}
          onChange={(arrive) => set({ arrive })}
          labels={[`Earliest arrival at ${toLabel}`, `Latest arrival at ${toLabel}`]}
          format={clock12}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  onReset,
  children,
}: {
  title: string;
  onReset?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border-b border-neutral-100 last:border-b-0">
      <div className="flex items-center justify-between bg-neutral-50/80 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1 text-sm font-bold text-ink"
        >
          {title}
          <ChevronDown className={cn("size-4 transition", open ? "rotate-180" : "")} aria-hidden />
        </button>
        {onReset && (
          <button type="button" onClick={onReset} className="text-xs font-semibold text-primary-700 hover:text-primary-800">
            reset
          </button>
        )}
      </div>
      {open && <div className="px-4 py-3.5">{children}</div>}
    </section>
  );
}
