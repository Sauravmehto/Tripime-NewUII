import type { CabinClass, SearchParams, TravellerCounts, TripType } from "@/types";

export const CABIN_CLASSES: CabinClass[] = ["Economy", "Premium Economy", "Business", "First"];
export const MAX_SEATED_PASSENGERS = 9;

export const DEFAULT_SEARCH: Omit<SearchParams, "date"> = {
  origin: "DEL",
  destination: "BOM",
  tripType: "one_way",
  returnDate: null,
  adults: 1,
  children: 0,
  infants: 0,
  cabin: "Economy",
};

function int(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (value === null || !Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Reads a search from `/flights?…`. Old links that only carry `passengers` become adults. */
export function parseSearchParams(query: URLSearchParams, fallbackDate: string): SearchParams {
  const cabin = query.get("cabin") as CabinClass | null;
  const returnDate = query.get("returnDate");
  const tripType: TripType =
    query.get("tripType") === "round_trip" || returnDate ? "round_trip" : "one_way";
  const adults = int(query.get("adults") ?? query.get("passengers"), 1, 1, MAX_SEATED_PASSENGERS);
  const children = int(query.get("children"), 0, 0, MAX_SEATED_PASSENGERS - adults);
  return {
    origin: (query.get("origin") || DEFAULT_SEARCH.origin).toUpperCase(),
    destination: (query.get("destination") || DEFAULT_SEARCH.destination).toUpperCase(),
    date: query.get("date") || fallbackDate,
    tripType,
    returnDate: tripType === "round_trip" ? returnDate : null,
    adults,
    children,
    infants: int(query.get("infants"), 0, 0, adults),
    cabin: cabin && CABIN_CLASSES.includes(cabin) ? cabin : "Economy",
  };
}

export function toQueryString(search: SearchParams): string {
  const params = new URLSearchParams({
    origin: search.origin,
    destination: search.destination,
    date: search.date,
    tripType: search.tripType,
    adults: String(search.adults),
    children: String(search.children),
    infants: String(search.infants),
    cabin: search.cabin,
  });
  if (search.tripType === "round_trip" && search.returnDate) {
    params.set("returnDate", search.returnDate);
  }
  return params.toString();
}

export function flightsHref(search: SearchParams): string {
  return `/flights?${toQueryString(search)}`;
}

export function seatedCount(counts: TravellerCounts): number {
  return counts.adults + counts.children;
}

export function travellerCount(counts: TravellerCounts): number {
  return counts.adults + counts.children + counts.infants;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "2 Adults, 1 Child, 1 Infant" */
export function travellersLabel(counts: TravellerCounts): string {
  const parts = [plural(counts.adults, "Adult", "Adults")];
  if (counts.children) parts.push(plural(counts.children, "Child", "Children"));
  if (counts.infants) parts.push(plural(counts.infants, "Infant", "Infants"));
  return parts.join(", ");
}

/** "3 Travellers" — compact form for tight spaces. */
export function travellersShortLabel(counts: TravellerCounts): string {
  return plural(travellerCount(counts), "Traveller", "Travellers");
}

export interface SearchValidation {
  origin?: string;
  destination?: string;
  date?: string;
  returnDate?: string;
  travellers?: string;
}

/** Client-side mirror of the API's search rules, for inline form errors. */
export function validateSearch(
  search: SearchParams,
  window: { minDate: string; maxDate: string } | null,
): SearchValidation {
  const errors: SearchValidation = {};
  if (!search.origin) errors.origin = "Choose where you're flying from";
  if (!search.destination) errors.destination = "Choose where you're flying to";
  if (search.origin && search.origin === search.destination) {
    errors.destination = "Destination must differ from origin";
  }
  if (!search.date) errors.date = "Choose a departure date";
  else if (window && (search.date < window.minDate || search.date > window.maxDate)) {
    errors.date = "Pick a date within the bookable window";
  }
  if (search.tripType === "round_trip") {
    if (!search.returnDate) errors.returnDate = "Choose a return date";
    else if (search.returnDate < search.date) errors.returnDate = "Return can't be before departure";
    else if (window && search.returnDate > window.maxDate) {
      errors.returnDate = "Pick a date within the bookable window";
    }
  }
  if (search.infants > search.adults) errors.travellers = "Each infant needs an adult";
  if (seatedCount(search) > MAX_SEATED_PASSENGERS) {
    errors.travellers = `Up to ${MAX_SEATED_PASSENGERS} adults and children per booking`;
  }
  return errors;
}
