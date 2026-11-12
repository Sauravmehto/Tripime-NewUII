import { formatINR } from "@/lib/format";
import type { TravelPackage } from "@/types";

export type TripType = "domestic" | "international";

/** Everything the guided holiday search collects. Empty string / null means "no preference". */
export interface HolidaySearch {
  from: string;
  trip: TripType | null;
  destination: string;
  month: string;
  adults: number;
  children: number;
  rooms: number;
  budgetId: string;
}

export const DOMESTIC_PATTERN =
  /goa|kerala|rajasthan|varanasi|himachal|kashmir|spiti|gokarna|bundi|andaman|sikkim|india/i;
export const INTERNATIONAL_PATTERN =
  /bali|mauritius|dubai|singapore|thailand|maldives|nepal|bhutan|sri lanka|vietnam|fiji|barbados|indonesia|uae/i;

export const DESTINATIONS_BY_TRIP: Record<TripType, string[]> = {
  domestic: ["Goa", "Kerala", "Rajasthan", "Kashmir", "Himachal", "Varanasi", "Andaman", "Sikkim"],
  international: ["Dubai", "Bali", "Thailand", "Singapore", "Mauritius", "Maldives", "Sri Lanka", "Vietnam"],
};

/* ------------------------------- departure cities ------------------------------- */

export interface DepartureCity {
  name: string;
  lat: number;
  lng: number;
}

export const DEPARTURE_CITIES: DepartureCity[] = [
  { name: "New Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Kochi", lat: 9.9312, lng: 76.2673 },
  { name: "Goa", lat: 15.4909, lng: 73.8278 },
  { name: "Guwahati", lat: 26.1445, lng: 91.7362 },
  { name: "Bhubaneswar", lat: 20.2961, lng: 85.8245 },
  { name: "Patna", lat: 25.5941, lng: 85.1376 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
  { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
  { name: "Amritsar", lat: 31.634, lng: 74.8723 },
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Surat", lat: 21.1702, lng: 72.8311 },
  { name: "Vadodara", lat: 22.3072, lng: 73.1812 },
  { name: "Srinagar", lat: 34.0837, lng: 74.7973 },
  { name: "Dehradun", lat: 30.3165, lng: 78.0322 },
  { name: "Ranchi", lat: 23.3441, lng: 85.3096 },
  { name: "Raipur", lat: 21.2514, lng: 81.6296 },
  { name: "Mangaluru", lat: 12.9141, lng: 74.856 },
  { name: "Madurai", lat: 9.9252, lng: 78.1198 },
];

export const QUICK_CITIES = DEPARTURE_CITIES.slice(0, 12).map((city) => city.name);

/** Beyond this distance from every listed city we do not guess. */
const MAX_CITY_DISTANCE_KM = 150;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Nearest listed city, or null when the position is not within reach of any (for example outside India). */
export function nearestCity(lat: number, lng: number): { city: DepartureCity; km: number } | null {
  let best: { city: DepartureCity; km: number } | null = null;
  for (const city of DEPARTURE_CITIES) {
    const km = haversineKm(lat, lng, city.lat, city.lng);
    if (!best || km < best.km) best = { city, km };
  }
  return best && best.km <= MAX_CITY_DISTANCE_KM ? best : null;
}

/* ------------------------------------ months ------------------------------------ */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface MonthOption {
  /** e.g. "December 2026" */
  value: string;
  /** e.g. "Dec" */
  short: string;
  year: number;
}

export function nextMonths(count = 12, now: Date = new Date()): MonthOption[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const name = MONTH_NAMES[date.getMonth()];
    return { value: `${name} ${date.getFullYear()}`, short: name.slice(0, 3), year: date.getFullYear() };
  });
}

/* ------------------------------------ budget ------------------------------------ */

export interface BudgetBand {
  id: string;
  label: string;
  min: number;
  max: number;
}

export const BUDGET_BANDS: BudgetBand[] = [
  { id: "any", label: "Any budget", min: 0, max: Infinity },
  { id: "under-25k", label: "Under ₹25k", min: 0, max: 25_000 },
  { id: "25k-50k", label: "₹25k – ₹50k", min: 25_000, max: 50_000 },
  { id: "50k-1l", label: "₹50k – ₹1L", min: 50_000, max: 100_000 },
  { id: "1l-plus", label: "₹1L and above", min: 100_000, max: Infinity },
];

export function budgetBand(id: string): BudgetBand {
  return BUDGET_BANDS.find((band) => band.id === id) ?? BUDGET_BANDS[0];
}

/* --------------------------------- package helpers --------------------------------- */

export function packageTrip(pkg: TravelPackage): TripType | null {
  if (pkg.category === "domestic") return "domestic";
  if (pkg.category === "international") return "international";
  const text = `${pkg.destination} ${pkg.title}`;
  if (INTERNATIONAL_PATTERN.test(text)) return "international";
  if (DOMESTIC_PATTERN.test(text)) return "domestic";
  return null;
}

/** Prices are quoted either per person or "total for N travellers"; budget is compared per person. */
export function pricePerPerson(pkg: TravelPackage): number {
  const match = /total for (\d+)/i.exec(pkg.priceNote);
  const travellers = match ? Math.max(1, Number(match[1])) : 1;
  return Math.round(pkg.price / travellers);
}

export function withinBudget(pkg: TravelPackage, budgetId: string): boolean {
  const band = budgetBand(budgetId);
  if (band.id === "any") return false;
  const price = pricePerPerson(pkg);
  return price >= band.min && price < band.max;
}

/* ----------------------------------- wording ----------------------------------- */

export function tripLabel(trip: TripType | null): string {
  return trip === "domestic" ? "Domestic" : trip === "international" ? "International" : "";
}

export function guestsLabel(adults: number, children: number, rooms: number): string {
  const parts = [`${adults} adult${adults === 1 ? "" : "s"}`];
  if (children > 0) parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  parts.push(`${rooms} room${rooms === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

/** "New Delhi → International · Goa · December 2026 · 2 adults · 1 room · ₹50k – ₹1L" */
export function buildSearchSummary(search: HolidaySearch): string {
  const parts = [
    [search.from, tripLabel(search.trip)].filter(Boolean).join(" → "),
    search.destination,
    search.month,
    guestsLabel(search.adults, search.children, search.rooms),
    search.budgetId !== "any" ? budgetBand(search.budgetId).label : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Message sent to a travel expert when nothing in the catalogue matches. */
export function buildExpertMessage(search: HolidaySearch): string {
  const lines = ["Hi Tripime, I'd like help planning a holiday."];
  if (search.from) lines.push(`*Flying from:* ${search.from}`);
  const where = [tripLabel(search.trip), search.destination].filter(Boolean).join(" · ");
  if (where) lines.push(`*Where:* ${where}`);
  if (search.month) lines.push(`*When:* ${search.month}`);
  lines.push(`*Travellers:* ${guestsLabel(search.adults, search.children, search.rooms)}`);
  if (search.budgetId !== "any") lines.push(`*Budget per person:* ${budgetBand(search.budgetId).label}`);
  return lines.join("\n");
}

export function priceFromLabel(pkg: TravelPackage): string {
  return formatINR(pricePerPerson(pkg));
}
