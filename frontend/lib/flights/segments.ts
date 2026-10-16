import type { Flight, FlightSegment } from "@/types";

/** A flight's segments; older bookings without a segment list become one segment. */
export function segmentsOf(flight: Flight): FlightSegment[] {
  if (flight.segments?.length) return flight.segments;
  return [
    {
      id: flight.id,
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      aircraft: flight.aircraft,
      origin: flight.origin,
      destination: flight.destination,
      departureDate: flight.departureDate,
      departureTime: flight.departureTime,
      arrivalDate: flight.arrivalDate,
      arrivalTime: flight.arrivalTime,
      durationMinutes: flight.durationMinutes,
    },
  ];
}

export function stopsOf(flight: Flight): number {
  return flight.stops ?? Math.max(0, segmentsOf(flight).length - 1);
}

export function stopsLabel(stops: number): string {
  return stops === 0 ? "Non-stop" : `${stops} Stop${stops > 1 ? "s" : ""}`;
}

/** Minutes since midnight for an "HH:MM" time. */
export function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** "18:35" → "06:35 PM" */
export function clock12(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h < 12 ? "AM" : "PM";
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}
