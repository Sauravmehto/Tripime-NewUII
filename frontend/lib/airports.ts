interface AirportInfo {
  code: string;
  city: string;
  airport: string;
}

const AIRPORTS: Record<string, AirportInfo> = {
  DEL: { code: "DEL", city: "Delhi", airport: "Indira Gandhi International" },
  BOM: { code: "BOM", city: "Mumbai", airport: "Chhatrapati Shivaji Maharaj International" },
  BLR: { code: "BLR", city: "Bangalore", airport: "Kempegowda International" },
};

export const AIRPORT_CODES = Object.keys(AIRPORTS);

export function airportOf(code: string): AirportInfo {
  return AIRPORTS[code] ?? { code, city: code, airport: `${code} Airport` };
}

export const INVENTORY_START = "2026-08-04";
export const INVENTORY_END = "2026-08-31";

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function clampDate(isoDate: string, min: string, max: string): string {
  if (isoDate < min) return min;
  if (isoDate > max) return max;
  return isoDate;
}

export function shortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function weekdayOf(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
}
