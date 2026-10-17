import type { BookingState } from "@/types";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

interface StateInfo {
  /** Short label for badges. */
  label: string;
  /** Plain-language headline for the traveller. */
  headline: string;
  tone: StatusTone;
}

export const STATE_INFO: Record<BookingState, StateInfo> = {
  DRAFT: { label: "Draft", headline: "Booking not submitted yet", tone: "neutral" },
  PASSENGERS_COMPLETED: { label: "Draft", headline: "Booking not submitted yet", tone: "neutral" },
  REVIEWED: { label: "Draft (reviewed)", headline: "Booking not submitted yet", tone: "neutral" },
  PAYMENT_PENDING: { label: "Request submitted", headline: "Booking request received — not confirmed yet", tone: "warning" },
  PAYMENT_FAILED: { label: "Payment not received", headline: "We haven't received your payment", tone: "danger" },
  PAYMENT_CONFIRMED: { label: "Payment verified", headline: "Payment verified — we're booking with the airline", tone: "warning" },
  BOOKING_CONFIRMED: { label: "Confirmed by airline", headline: "Confirmed by the airline — ticket on the way", tone: "success" },
  TICKET_ISSUED: { label: "Ticket issued", headline: "Your ticket is issued", tone: "success" },
  BOOKING_FAILED: { label: "Booking failed", headline: "The airline couldn't confirm this booking", tone: "danger" },
  CANCELLED: { label: "Cancelled", headline: "This booking was cancelled", tone: "danger" },
};

/** What happens next, in order, for a submitted request. */
export function nextSteps(state: BookingState): string[] {
  switch (state) {
    case "PAYMENT_PENDING":
      return [
        "Our team checks seat availability and the final price with the airline.",
        "We contact you by email or phone with the confirmed price and how to pay.",
        "After we verify your payment, we book with the airline and send your airline PNR.",
        "Your e-ticket follows once the airline issues the tickets.",
      ];
    case "PAYMENT_FAILED":
      return ["Contact us if you've already paid — we'll check again.", "Otherwise we'll get in touch about next steps."];
    case "PAYMENT_CONFIRMED":
      return ["We're booking your flight with the airline.", "You'll receive the airline PNR once it's confirmed."];
    case "BOOKING_CONFIRMED":
      return ["The airline confirmed your booking (PNR below).", "Your e-ticket will follow when tickets are issued."];
    case "TICKET_ISSUED":
      return ["Download your e-ticket below and check in with the airline using your PNR."];
    default:
      return [];
  }
}
