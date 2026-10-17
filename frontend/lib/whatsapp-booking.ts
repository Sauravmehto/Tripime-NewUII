import type { Booking } from "@/types";

/**
 * Official click-to-chat link the traveller opens and sends themselves.
 * Only a non-sensitive summary is included — never passport or payment details.
 */
export function bookingWhatsAppLink(number: string, booking: Booking): string {
  const legs = `${booking.flight.origin.code}→${booking.flight.destination.code} on ${booking.flight.departureDate}`;
  const back = booking.returnFlight ? `, return ${booking.returnFlight.departureDate}` : "";
  const text = `Hi Tripime, I've submitted booking request ${booking.bookingId} (${legs}${back}, ${booking.passengerCount} traveller${booking.passengerCount === 1 ? "" : "s"}). Please help me with the next steps.`;
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
