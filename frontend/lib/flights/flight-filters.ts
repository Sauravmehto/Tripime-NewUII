import type { Flight } from "@/types";
import { minutesOf, stopsOf } from "./segments";

export type SortKey = "recommended" | "cheapest" | "shortest" | "earliest" | "latest";

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "cheapest", label: "Cheapest" },
  { id: "shortest", label: "Fastest" },
  { id: "earliest", label: "Earliest departure" },
  { id: "latest", label: "Latest departure" },
];

export type Range = [number, number];

export interface FlightFilters {
  /** Selected stop counts; empty means any. */
  stops: number[];
  airlines: string[];
  refundableOnly: boolean;
  /** `null` means the full range. */
  price: Range | null;
  /** Minutes after midnight, local time at the airport. */
  depart: Range | null;
  arrive: Range | null;
}

export const EMPTY_FILTERS: FlightFilters = {
  stops: [],
  airlines: [],
  refundableOnly: false,
  price: null,
  depart: null,
  arrive: null,
};

export interface Facet<K> {
  key: K;
  label: string;
  count: number;
  cheapest: number;
}

export interface FlightFacets {
  stops: Facet<number>[];
  airlines: Facet<string>[];
  price: Range;
  depart: Range;
  arrive: Range;
}

function bounds(values: number[]): Range {
  return values.length ? [Math.min(...values), Math.max(...values)] : [0, 0];
}

function facetBy<K>(flights: Flight[], keyOf: (f: Flight) => K, labelOf: (k: K) => string): Facet<K>[] {
  const map = new Map<K, Facet<K>>();
  for (const flight of flights) {
    const key = keyOf(flight);
    const price = flight.fare.totalFare;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.cheapest = Math.min(existing.cheapest, price);
    } else {
      map.set(key, { key, label: labelOf(key), count: 1, cheapest: price });
    }
  }
  return [...map.values()];
}

export function flightFacets(flights: Flight[]): FlightFacets {
  return {
    stops: facetBy(flights, stopsOf, (n) => (n === 0 ? "Non-stop" : `${n} stop${n > 1 ? "s" : ""}`)).sort(
      (a, b) => a.key - b.key,
    ),
    // Like the reference: airlines listed cheapest first.
    airlines: facetBy(flights, (f) => f.airline.name, (name) => name).sort((a, b) => a.cheapest - b.cheapest),
    price: bounds(flights.map((f) => f.fare.totalFare)),
    depart: bounds(flights.map((f) => minutesOf(f.departureTime))),
    arrive: bounds(flights.map((f) => minutesOf(f.arrivalTime))),
  };
}

const within = (value: number, range: Range | null) => !range || (value >= range[0] && value <= range[1]);

export function applyFilters(flights: Flight[], filters: FlightFilters): Flight[] {
  return flights.filter(
    (flight) =>
      (filters.stops.length === 0 || filters.stops.includes(stopsOf(flight))) &&
      (filters.airlines.length === 0 || filters.airlines.includes(flight.airline.name)) &&
      (!filters.refundableOnly || flight.refundable) &&
      within(flight.fare.totalFare, filters.price) &&
      within(minutesOf(flight.departureTime), filters.depart) &&
      within(minutesOf(flight.arrivalTime), filters.arrive),
  );
}

export function sortFlights(flights: Flight[], key: SortKey): Flight[] {
  const list = [...flights];
  if (key === "recommended") {
    // Balance price and journey time relative to the best of each in this list.
    const minPrice = Math.min(...list.map((f) => f.fare.totalFare));
    const minDuration = Math.min(...list.map((f) => f.durationMinutes));
    const score = (f: Flight) => f.fare.totalFare / minPrice + 0.6 * (f.durationMinutes / minDuration);
    return list.sort((a, b) => score(a) - score(b));
  }
  list.sort((a, b) => {
    if (key === "cheapest") return a.fare.totalFare - b.fare.totalFare;
    if (key === "shortest") return a.durationMinutes - b.durationMinutes;
    if (key === "earliest") return a.departureTime.localeCompare(b.departureTime);
    return b.departureTime.localeCompare(a.departureTime);
  });
  return list;
}

export function countActiveFilters(filters: FlightFilters, facets: FlightFacets): number {
  const narrowed = (range: Range | null, full: Range) => (range && (range[0] > full[0] || range[1] < full[1]) ? 1 : 0);
  return (
    filters.stops.length +
    filters.airlines.length +
    (filters.refundableOnly ? 1 : 0) +
    narrowed(filters.price, facets.price) +
    narrowed(filters.depart, facets.depart) +
    narrowed(filters.arrive, facets.arrive)
  );
}

export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
