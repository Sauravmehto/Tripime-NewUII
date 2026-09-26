import type { Flight } from "@/types";

export type SortKey = "cheapest" | "shortest" | "earliest" | "latest";
export type TimeSlotId = "early" | "morning" | "afternoon" | "night";

interface TimeSlot {
  id: TimeSlotId;
  label: string;
  hint: string;
  from: number;
  to: number;
}

export const TIME_SLOTS: TimeSlot[] = [
  { id: "early", label: "Before 6 AM", hint: "00 – 06", from: 0, to: 6 },
  { id: "morning", label: "6 AM – 12 PM", hint: "06 – 12", from: 6, to: 12 },
  { id: "afternoon", label: "12 PM – 6 PM", hint: "12 – 18", from: 12, to: 18 },
  { id: "night", label: "After 6 PM", hint: "18 – 24", from: 18, to: 24 },
];

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "cheapest", label: "Cheapest" },
  { id: "shortest", label: "Fastest" },
  { id: "earliest", label: "Earliest departure" },
  { id: "latest", label: "Latest departure" },
];

export interface FlightFilters {
  airlines: string[];
  departSlots: TimeSlotId[];
  refundableOnly: boolean;
  maxPrice: number | null;
}

export const EMPTY_FILTERS: FlightFilters = {
  airlines: [],
  departSlots: [],
  refundableOnly: false,
  maxPrice: null,
};

export interface PriceBounds {
  min: number;
  max: number;
}

export interface AirlineFacet {
  name: string;
  code: string;
  count: number;
  cheapest: number;
}

function slotOf(time: string): TimeSlotId {
  const hour = Number(time.slice(0, 2));
  const slot = TIME_SLOTS.find((s) => hour >= s.from && hour < s.to);
  return slot?.id ?? "night";
}

export function priceBounds(flights: Flight[]): PriceBounds {
  if (flights.length === 0) return { min: 0, max: 0 };
  const prices = flights.map((f) => f.fare.totalFare);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function airlineFacets(flights: Flight[]): AirlineFacet[] {
  const map = new Map<string, AirlineFacet>();
  for (const flight of flights) {
    const key = flight.airline.name;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.cheapest = Math.min(existing.cheapest, flight.fare.totalFare);
    } else {
      map.set(key, {
        name: key,
        code: flight.airline.code,
        count: 1,
        cheapest: flight.fare.totalFare,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function slotCounts(flights: Flight[]): Record<TimeSlotId, number> {
  const counts: Record<TimeSlotId, number> = {
    early: 0,
    morning: 0,
    afternoon: 0,
    night: 0,
  };
  for (const flight of flights) counts[slotOf(flight.departureTime)] += 1;
  return counts;
}

export function applyFilters(flights: Flight[], filters: FlightFilters): Flight[] {
  return flights.filter((flight) => {
    if (filters.airlines.length > 0 && !filters.airlines.includes(flight.airline.name)) {
      return false;
    }
    if (
      filters.departSlots.length > 0 &&
      !filters.departSlots.includes(slotOf(flight.departureTime))
    ) {
      return false;
    }
    if (filters.refundableOnly && !flight.refundable) return false;
    if (filters.maxPrice !== null && flight.fare.totalFare > filters.maxPrice) return false;
    return true;
  });
}

export function sortFlights(flights: Flight[], key: SortKey): Flight[] {
  const list = [...flights];
  list.sort((a, b) => {
    if (key === "cheapest") return a.fare.totalFare - b.fare.totalFare;
    if (key === "shortest") return a.durationMinutes - b.durationMinutes;
    if (key === "earliest") return a.departureTime.localeCompare(b.departureTime);
    return b.departureTime.localeCompare(a.departureTime);
  });
  return list;
}

export interface SortTeaser {
  price: number;
  minutes: number;
}

export function sortTeasers(flights: Flight[]): Record<SortKey, SortTeaser | null> {
  const pick = (key: SortKey): SortTeaser | null => {
    const best = sortFlights(flights, key)[0];
    return best ? { price: best.fare.totalFare, minutes: best.durationMinutes } : null;
  };
  return {
    cheapest: pick("cheapest"),
    shortest: pick("shortest"),
    earliest: pick("earliest"),
    latest: pick("latest"),
  };
}

export function countActiveFilters(filters: FlightFilters, bounds: PriceBounds): number {
  let count = filters.airlines.length + filters.departSlots.length;
  if (filters.refundableOnly) count += 1;
  if (filters.maxPrice !== null && filters.maxPrice < bounds.max) count += 1;
  return count;
}

export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
