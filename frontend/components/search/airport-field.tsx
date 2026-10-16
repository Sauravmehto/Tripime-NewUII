"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MapPin, PlaneLanding, PlaneTakeoff, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CatalogAirport } from "@/types";
import { FieldTile } from "./field-tile";
import { SearchPopover } from "./search-popover";

interface AirportFieldProps {
  kind: "origin" | "destination";
  value: string;
  onChange: (code: string) => void;
  airports: CatalogAirport[] | null;
  /** Codes with direct flights from the other end; others are listed as unavailable. */
  servedCodes?: string[] | null;
  /** City on the other end, for the "no direct flights" message. */
  otherCity?: string;
  error?: string;
}

function matches(airport: CatalogAirport, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    airport.code.toLowerCase().startsWith(q) ||
    airport.city.toLowerCase().includes(q) ||
    airport.airport.toLowerCase().includes(q) ||
    airport.countryName.toLowerCase().includes(q)
  );
}

export function AirportField({
  kind,
  value,
  onChange,
  airports,
  servedCodes,
  otherCity,
  error,
}: AirportFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const label = kind === "origin" ? "From" : "To";
  const selected = airports?.find((a) => a.code === value);

  const options = useMemo(() => {
    const list = (airports ?? []).filter((a) => matches(a, query));
    const served = servedCodes ? new Set(servedCodes) : null;
    const available = list.filter((a) => !served || served.has(a.code));
    const unavailable = list.filter((a) => served && !served.has(a.code));
    // Home country first, then international — mirrors how people scan.
    const byRegion = (a: CatalogAirport, b: CatalogAirport) =>
      Number(a.country !== "IN") - Number(b.country !== "IN") || a.city.localeCompare(b.city);
    return { available: available.sort(byRegion), unavailable: unavailable.sort(byRegion) };
  }, [airports, query, servedCodes]);

  function openPanel() {
    setQuery("");
    setActiveIndex(Math.max(0, options.available.findIndex((a) => a.code === value)));
    setOpen(true);
  }

  function choose(code: string) {
    onChange(code);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function scrollActiveIntoView(index: number) {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = options.available.length;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!count) return;
      const next = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + count) % count;
      setActiveIndex(next);
      scrollActiveIntoView(next);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options.available[activeIndex];
      if (option) choose(option.code);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const regionOf = (a: CatalogAirport) => (a.country === "IN" ? "India" : "International");

  return (
    <div ref={containerRef} className="relative min-w-0">
      <FieldTile
        ref={triggerRef}
        label={label}
        field={kind}
        icon={
          kind === "origin" ? (
            <PlaneTakeoff className="size-4" />
          ) : (
            <PlaneLanding className="size-4" />
          )
        }
        active={open}
        error={error}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        placeholder={!selected}
        value={
          selected ? (
            <>
              {selected.city} <span className="font-semibold text-ink-subtle">{selected.code}</span>
            </>
          ) : (
            "Select city"
          )
        }
        hint={selected ? selected.airport : kind === "origin" ? "Where from?" : "Where to?"}
      />

      <SearchPopover
        open={open}
        onClose={() => setOpen(false)}
        containerRef={containerRef}
        title={kind === "origin" ? "Flying from" : "Flying to"}
        className="sm:w-[380px]"
      >
        <div className="p-3">
          <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 focus-within:border-primary-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/15">
            <Search className="size-4 shrink-0 text-ink-subtle" aria-hidden />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                options.available[activeIndex] ? `${listId}-${options.available[activeIndex].code}` : undefined
              }
              aria-label={`Search ${kind === "origin" ? "departure" : "arrival"} city or airport`}
              placeholder="City, airport or code"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              className="h-11 w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-subtle"
            />
          </label>
        </div>

        {!airports && (
          <div className="space-y-2 px-3 pb-3" aria-busy>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-100" />
            ))}
          </div>
        )}

        {airports && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Airports"
            className="max-h-[50dvh] overflow-y-auto px-2 pb-2 sm:max-h-[340px]"
          >
            {options.available.length === 0 && (
              <li className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                <MapPin className="size-6 text-ink-subtle" aria-hidden />
                <p className="text-sm font-semibold text-ink">No airports match “{query}”</p>
                {servedCodes && otherCity && (
                  <p className="text-xs text-ink-muted">
                    We only list cities with direct flights from {otherCity}.
                  </p>
                )}
              </li>
            )}
            {options.available.map((airport, index) => {
              const region = regionOf(airport);
              const header = index === 0 || regionOf(options.available[index - 1]) !== region;
              const isActive = index === activeIndex;
              const isSelected = airport.code === value;
              return (
                <li key={airport.code} role="presentation">
                  {header && (
                    <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-subtle">
                      {region}
                    </p>
                  )}
                  <div
                    id={`${listId}-${airport.code}`}
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(airport.code)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition",
                      isActive ? "bg-primary-50" : "hover:bg-neutral-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-12 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold tracking-wide",
                        isSelected ? "bg-primary-600 text-white" : "bg-neutral-100 text-ink",
                      )}
                    >
                      {airport.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {airport.city}
                        <span className="ml-1.5 text-xs font-normal text-ink-subtle">
                          {airport.countryName}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-ink-muted">{airport.airport}</span>
                    </span>
                  </div>
                </li>
              );
            })}
            {options.unavailable.length > 0 && otherCity && (
              <li role="presentation" className="px-2 pb-1 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-subtle">
                  No direct flights from {otherCity}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
                  {options.unavailable.map((a) => `${a.city} (${a.code})`).join(" · ")}
                </p>
              </li>
            )}
          </ul>
        )}
      </SearchPopover>
    </div>
  );
}
