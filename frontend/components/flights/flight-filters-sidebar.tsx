"use client";

import { useId, useState, type ReactNode } from "react";
import { Check, ChevronDown, Moon, PlaneLanding, PlaneTakeoff, SlidersHorizontal, Sun, Sunrise, Sunset, X } from "lucide-react";
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
  /** Hide the card header (the mobile sheet renders its own). */
  hideHeader?: boolean;
}

/** Departure time-of-day presets; they set the departure range slider. */
const DAY_PARTS: { label: string; hint: string; range: Range; icon: typeof Sun }[] = [
  { label: "Early", hint: "Before 6 AM", range: [0, 359], icon: Moon },
  { label: "Morning", hint: "6 AM – 12 PM", range: [360, 719], icon: Sunrise },
  { label: "Afternoon", hint: "12 – 6 PM", range: [720, 1079], icon: Sun },
  { label: "Evening", hint: "After 6 PM", range: [1080, 1439], icon: Sunset },
];

const narrowed = (range: Range | null, full: Range) => Boolean(range && (range[0] > full[0] || range[1] < full[1]));

export function FlightFiltersSidebar({
  filters,
  onChange,
  facets,
  fromLabel,
  toLabel,
  activeCount,
  onClear,
  airlineCodes,
  hideHeader = false,
}: FlightFiltersSidebarProps) {
  const set = (patch: Partial<FlightFilters>) => onChange({ ...filters, ...patch });
  const rangeOr = (range: Range | null, full: Range): Range => range ?? full;

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...filters.stops.map((stop) => ({
      key: `stop-${stop}`,
      label: facets.stops.find((s) => s.key === stop)?.label ?? `${stop} stops`,
      remove: () => set({ stops: filters.stops.filter((s) => s !== stop) }),
    })),
    ...filters.airlines.map((airline) => ({
      key: `airline-${airline}`,
      label: airline,
      remove: () => set({ airlines: filters.airlines.filter((a) => a !== airline) }),
    })),
    ...(filters.refundableOnly
      ? [{ key: "refundable", label: "Refundable", remove: () => set({ refundableOnly: false }) }]
      : []),
    ...(narrowed(filters.price, facets.price) && filters.price
      ? [{
          key: "price",
          label: `${formatINR(filters.price[0])} – ${formatINR(filters.price[1])}`,
          remove: () => set({ price: null }),
        }]
      : []),
    ...(narrowed(filters.depart, facets.depart) && filters.depart
      ? [{
          key: "depart",
          label: `Departs ${clock12(filters.depart[0])} – ${clock12(filters.depart[1])}`,
          remove: () => set({ depart: null }),
        }]
      : []),
    ...(narrowed(filters.arrive, facets.arrive) && filters.arrive
      ? [{
          key: "arrive",
          label: `Arrives ${clock12(filters.arrive[0])} – ${clock12(filters.arrive[1])}`,
          remove: () => set({ arrive: null }),
        }]
      : []),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-soft">
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-3.5">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <SlidersHorizontal className="size-4 text-primary-600" aria-hidden />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {activeCount}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={onClear}
            disabled={activeCount === 0}
            className="rounded-md text-xs font-semibold text-primary-700 transition hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-default disabled:text-ink-subtle"
          >
            Clear all
          </button>
        </div>
      )}

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 border-t border-neutral-100 px-4 py-3" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={chip.remove}
                aria-label={`Remove filter: ${chip.label}`}
                className="group inline-flex max-w-full items-center gap-1 rounded-full bg-primary-50 py-1 pl-2.5 pr-1.5 text-[11px] font-semibold text-primary-800 ring-1 ring-primary-200 transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span className="truncate">{chip.label}</span>
                <X className="size-3 shrink-0 opacity-70 group-hover:opacity-100" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

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
                    "relative rounded-xl border px-3 py-2.5 text-left transition duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
                    active
                      ? "border-primary-500 bg-primary-50 shadow-[0_0_0_3px_rgb(59_130_246/0.12)]"
                      : "border-neutral-200 hover:border-primary-300 hover:bg-neutral-50",
                  )}
                >
                  {active && (
                    <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary-600 text-white">
                      <Check className="size-2.5" aria-hidden />
                    </span>
                  )}
                  <span className="block text-xs font-bold text-ink">{stop.label}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">
                    from <span className="font-semibold text-ink">{formatINR(stop.cheapest)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section
        title={`Departure from ${fromLabel}`}
        onReset={filters.depart ? () => set({ depart: null }) : undefined}
      >
        <div className="grid grid-cols-4 gap-1.5">
          {DAY_PARTS.map((part) => {
            const lo = Math.max(part.range[0], facets.depart[0]);
            const hi = Math.min(part.range[1], facets.depart[1]);
            const available = lo <= hi;
            const active = available && filters.depart?.[0] === lo && filters.depart?.[1] === hi;
            const Icon = part.icon;
            return (
              <button
                key={part.label}
                type="button"
                disabled={!available}
                aria-pressed={active}
                title={part.hint}
                onClick={() => set({ depart: active ? null : [lo, hi] })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-semibold transition duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
                  "disabled:cursor-not-allowed disabled:opacity-35",
                  active
                    ? "border-primary-500 bg-primary-50 text-primary-800"
                    : "border-neutral-200 text-ink-muted hover:border-primary-300 hover:text-ink",
                )}
              >
                <Icon className={cn("size-4", active ? "text-primary-600" : "text-ink-subtle")} aria-hidden />
                {part.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <SliderLabel icon={<PlaneTakeoff className="size-3.5 text-primary-600" aria-hidden />}>
            Departure time
          </SliderLabel>
          <RangeSlider
            min={facets.depart[0]}
            max={facets.depart[1]}
            step={5}
            value={rangeOr(filters.depart, facets.depart)}
            onChange={(depart) => set({ depart })}
            labels={[`Earliest departure from ${fromLabel}`, `Latest departure from ${fromLabel}`]}
            format={clock12}
          />
        </div>
      </Section>

      <Section title="Airlines" onReset={filters.airlines.length ? () => set({ airlines: [] }) : undefined}>
        <ul className="-mx-1.5 max-h-64 space-y-0.5 overflow-y-auto px-1.5">
          {facets.airlines.map((airline) => {
            const checked = filters.airlines.includes(airline.key);
            return (
              <li key={airline.key} className="group relative">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition",
                    checked ? "bg-primary-50/70" : "hover:bg-neutral-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => set({ airlines: toggleValue(filters.airlines, airline.key) })}
                    className="size-4 shrink-0 cursor-pointer rounded border-neutral-300 accent-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500"
                  />
                  <AirlineMark code={airlineCodes[airline.key] ?? "?"} name={airline.key} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{airline.key}</span>
                    <span className="block text-[11px] text-ink-subtle">
                      {airline.count} flight{airline.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-ink transition group-hover:opacity-0 group-focus-within:opacity-0">
                    {formatINR(airline.cheapest)}
                  </span>
                </label>
                {facets.airlines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => set({ airlines: [airline.key] })}
                    aria-label={`Show only ${airline.key}`}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-primary-700 opacity-0 shadow-xs ring-1 ring-primary-200 transition hover:bg-primary-50 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    Only
                  </button>
                )}
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
        <Toggle
          checked={filters.refundableOnly}
          onChange={(refundableOnly) => set({ refundableOnly })}
          label="Refundable fares only"
        />
      </Section>

      <Section
        title={`Arrival at ${toLabel}`}
        onReset={filters.arrive ? () => set({ arrive: null }) : undefined}
        defaultOpen={false}
      >
        <SliderLabel icon={<PlaneLanding className="size-3.5 text-primary-600" aria-hidden />}>Arrival time</SliderLabel>
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

function SliderLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink">{icon}{children}</p>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5">
      <span className="text-xs font-semibold text-ink">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2",
          checked ? "bg-primary-600" : "bg-neutral-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow-soft transition-transform duration-200",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </span>
    </label>
  );
}

function Section({
  title,
  onReset,
  defaultOpen = true,
  children,
}: {
  title: string;
  onReset?: () => void;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className="border-t border-neutral-100">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md text-left text-[13px] font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span className="truncate">{title}</span>
          <ChevronDown
            className={cn("size-4 shrink-0 text-ink-subtle transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-md text-[11px] font-semibold text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Reset
          </button>
        )}
      </div>
      {/* grid-rows trick animates height without measuring. */}
      <div
        id={bodyId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
