import type { Fare, Flight, FlightLeg, PassengerType, TravellerCounts } from "@/types";

/** Mirrors the backend fare rules (app/models/flight.py `Fare`). */
export function unitFare(fare: Fare, type: PassengerType) {
  if (type === "child") {
    const base = fare.childBaseFare ?? Math.floor((fare.baseFare * 0.75) / 50) * 50;
    const taxes = fare.childTaxes ?? fare.taxes;
    return { base, taxes, total: fare.childTotalFare ?? base + taxes };
  }
  if (type === "infant") {
    const base = fare.infantBaseFare ?? Math.max(1250, Math.floor((fare.baseFare * 0.1) / 50) * 50);
    const taxes = fare.infantTaxes ?? Math.floor((base * 0.12) / 10) * 10;
    return { base, taxes, total: fare.infantTotalFare ?? base + taxes };
  }
  return { base: fare.baseFare, taxes: fare.taxes, total: fare.totalFare };
}

export interface PriceLine {
  leg: FlightLeg;
  type: PassengerType;
  count: number;
  unit: number;
  total: number;
}

export interface TripPrice {
  lines: PriceLine[];
  baseFare: number;
  taxes: number;
  total: number;
}

const TYPES: PassengerType[] = ["adult", "child", "infant"];
const COUNT_KEY = { adult: "adults", child: "children", infant: "infants" } as const;

/** Total price for every traveller across one or two legs — same maths as the booking API. */
export function priceTrip(
  outbound: Flight,
  returnFlight: Flight | null | undefined,
  counts: TravellerCounts,
): TripPrice {
  const legs: [FlightLeg, Flight][] = [["outbound", outbound]];
  if (returnFlight) legs.push(["return", returnFlight]);
  const result: TripPrice = { lines: [], baseFare: 0, taxes: 0, total: 0 };
  for (const [leg, flight] of legs) {
    for (const type of TYPES) {
      const count = counts[COUNT_KEY[type]];
      if (!count) continue;
      const unit = unitFare(flight.fare, type);
      result.lines.push({ leg, type, count, unit: unit.total, total: unit.total * count });
      result.baseFare += unit.base * count;
      result.taxes += unit.taxes * count;
      result.total += unit.total * count;
    }
  }
  return result;
}

export function passengerTypeLabel(type: PassengerType, count = 1): string {
  if (type === "child") return count === 1 ? "Child" : "Children";
  if (type === "infant") return count === 1 ? "Infant" : "Infants";
  return count === 1 ? "Adult" : "Adults";
}

/** Rows for `FareSummaryCard`: one per leg and passenger type. */
export function fareSummaryRows(price: TripPrice, roundTrip: boolean) {
  return price.lines.map((line) => ({
    label: `${roundTrip ? (line.leg === "outbound" ? "Departing · " : "Return · ") : ""}${passengerTypeLabel(line.type, line.count)}`,
    hint: `${line.count} × ₹${line.unit.toLocaleString("en-IN")} incl. taxes`,
    amount: line.total,
  }));
}
