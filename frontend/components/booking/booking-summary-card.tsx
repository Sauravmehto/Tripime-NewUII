import type { ReactNode } from "react";
import { Badge } from "@/components/ui/card";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { passengerTypeLabel } from "@/lib/flights/pricing";
import { STATE_INFO, nextSteps } from "@/lib/booking-status";
import type { Booking, Flight } from "@/types";

const HEADER_TONE = {
  success: "bg-linear-to-r from-primary-800 to-primary-600",
  warning: "bg-linear-to-r from-warning-500 to-primary-700",
  danger: "bg-linear-to-r from-danger-700 to-neutral-700",
  neutral: "bg-linear-to-r from-neutral-700 to-neutral-600",
} as const;

/** Honest status view of one booking. A request and an issued ticket look different. */
export function BookingSummaryCard({ booking, footer }: { booking: Booking; footer?: ReactNode }) {
  const info = STATE_INFO[booking.state];
  const issued = booking.state === "TICKET_ISSUED";
  const steps = nextSteps(booking.state);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-elevated">
      <div className={`px-5 py-8 text-white sm:px-6 ${HEADER_TONE[info.tone]}`}>
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/80">
          {info.label}
          {booking.legacy && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold tracking-wide ring-1 ring-white/40">
              Legacy test booking
            </span>
          )}
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{info.headline}</h1>
        <p className="mt-2 text-white/90">
          Request reference <span className="font-mono text-xl font-bold tracking-wider">{booking.bookingId}</span>
        </p>
        {booking.pnr && (
          <p className="mt-1 text-white/90">
            Airline PNR <span className="font-mono text-xl font-bold tracking-widest">{booking.pnr}</span>
          </p>
        )}
        {!issued && !["CANCELLED", "BOOKING_FAILED"].includes(booking.state) && (
          <p className="mt-4 rounded-xl bg-white/10 p-4 text-sm text-white/95 ring-1 ring-white/20">
            {booking.state === "BOOKING_CONFIRMED"
              ? "The airline has confirmed your booking, but your ticket hasn't been issued yet."
              : "This booking is not confirmed and no ticket has been issued yet."}{" "}
            Updates go to <strong>{booking.contact.email}</strong>.
          </p>
        )}
      </div>

      {steps.length > 0 && (
        <div className="border-b border-neutral-100 px-5 py-5 sm:px-6">
          <h2 className="mb-2 font-semibold text-ink">What happens next</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-muted">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
        <Info label="Submitted" value={booking.submittedAt ? formatDateTime(booking.submittedAt) : "Not submitted"} />
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-subtle">Status</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={info.tone}>{info.label}</Badge>
            <Badge tone={booking.paymentStatus === "paid" ? "success" : booking.paymentStatus === "failed" ? "danger" : "warning"}>
              Payment: {booking.paymentStatus === "paid" ? "verified" : booking.paymentStatus === "failed" ? "not received" : "not paid yet"}
            </Badge>
          </dd>
        </div>
      </div>

      <div className="grid gap-3 border-t border-neutral-100 px-5 py-5 sm:px-6 md:grid-cols-2">
        <LegCard title={booking.returnFlight ? "Departing flight" : "Flight"} flight={booking.flight} />
        {booking.returnFlight && <LegCard title="Return flight" flight={booking.returnFlight} />}
      </div>

      <div className="border-t border-neutral-100 px-5 py-5 sm:px-6">
        <h2 className="mb-3 font-semibold text-ink">Travellers</h2>
        <ul className="space-y-2 text-sm text-ink-muted">
          {booking.passengers.map((p, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-50 px-4 py-3">
              <span>
                {p.title} {p.firstName} {p.lastName}
                {p.type !== "adult" && <span className="ml-2 text-xs text-ink-subtle">{passengerTypeLabel(p.type)}</span>}
              </span>
              {issued && booking.ticketNumbers[i] && (
                <span className="font-mono text-xs text-ink">Ticket {booking.ticketNumbers[i]}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-neutral-100 px-5 py-5 sm:px-6">
        <h2 className="mb-3 font-semibold text-ink">{booking.paymentStatus === "paid" ? "Fare" : "Quoted fare"}</h2>
        <dl className="max-w-md space-y-2 text-sm text-ink-muted">
          {booking.fareBreakdown?.map((line) => (
            <Row
              key={`${line.leg}-${line.passengerType}`}
              label={`${booking.returnFlight ? (line.leg === "outbound" ? "Departing · " : "Return · ") : ""}${line.count} × ${passengerTypeLabel(line.passengerType, line.count)}`}
              value={formatINR(line.total)}
            />
          ))}
          <Row label="Base fare" value={formatINR(booking.fare.baseFare)} />
          <Row label="Taxes & airline fees" value={formatINR(booking.fare.taxes)} />
          {booking.seatCharges > 0 && <Row label="Seats" value={formatINR(booking.seatCharges)} />}
          <Row label={booking.paymentStatus === "paid" ? "Total paid" : "Quoted total"} value={formatINR(booking.totalAmount)} bold />
          {booking.payment?.status === "SUCCESS" && (
            <Row label="Payment reference" value={booking.payment.transactionId} />
          )}
        </dl>
      </div>

      {footer && (
        <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-5 sm:flex-row sm:flex-wrap sm:px-6">{footer}</div>
      )}
    </div>
  );
}

function LegCard({ title, flight }: { title: string; flight: Flight }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-600">{title}</p>
      <p className="mt-1 text-sm font-bold text-ink">
        {flight.origin.city} ({flight.origin.code}) → {flight.destination.city} ({flight.destination.code})
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {formatDate(flight.departureDate)} · {flight.departureTime} – {flight.arrivalTime}
        {flight.arrivalDate !== flight.departureDate ? " (+1)" : ""}
      </p>
      <p className="mt-0.5 text-xs text-ink-subtle">
        {flight.airline.name} · {flight.flightNumber} · {flight.cabinClass}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-ink-muted">
        {flight.layovers?.length
          ? `1 stop · change in ${flight.layovers.map((l) => `${l.airport.city} (${Math.floor(l.durationMinutes / 60)}h ${l.durationMinutes % 60}m)`).join(", ")}`
          : "Non-stop"}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className={bold ? "font-bold text-ink" : ""}>{value}</dd>
    </div>
  );
}
