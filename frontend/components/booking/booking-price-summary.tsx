import type { ReactNode } from "react";
import { FareSummaryCard } from "@/components/flights/fare-summary-card";
import { passengerTypeLabel } from "@/lib/flights/pricing";
import type { Booking } from "@/types";

/** Fare breakdown exactly as priced by the server — no invented fees. */
export function BookingPriceSummary({
  booking,
  title,
  totalLabel = "Total",
  note,
  children,
}: {
  booking: Booking;
  title?: string;
  totalLabel?: string;
  note?: ReactNode;
  children?: ReactNode;
}) {
  const roundTrip = Boolean(booking.returnFlight);
  const rows = [
    ...(booking.fareBreakdown ?? []).map((line) => ({
      label: `${roundTrip ? (line.leg === "outbound" ? "Departing · " : "Return · ") : ""}${line.count} × ${passengerTypeLabel(line.passengerType, line.count)}`,
      hint: `₹${line.unitFare.toLocaleString("en-IN")} each, incl. taxes`,
      amount: line.total,
    })),
    { label: "of which base fare", amount: booking.fare.baseFare },
    { label: "of which taxes & airline fees", amount: booking.fare.taxes },
  ];
  if (booking.seatCharges > 0) rows.push({ label: "Seats", amount: booking.seatCharges });
  return (
    <FareSummaryCard title={title} rows={rows} total={booking.totalAmount} totalLabel={`${totalLabel} (${booking.fare.currency})`} note={note}>
      {children}
    </FareSummaryCard>
  );
}
