import type { ReactNode } from "react";
import { Badge } from "@/components/ui/card";
import { formatDate, formatINR } from "@/lib/format";
import type { Booking } from "@/types";

export function BookingSummaryCard({
  booking,
  footer,
}: {
  booking: Booking;
  footer?: ReactNode;
}) {
  const confirmed = booking.status === "CONFIRMED";

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-elevated ${
        confirmed ? "border-success-500/30" : "border-warning-500/40"
      }`}
    >
      <div
        className={`px-5 py-8 sm:px-6 ${
          confirmed
            ? "bg-linear-to-r from-primary-800 to-primary-600"
            : "bg-linear-to-r from-warning-500 to-primary-700"
        } text-white`}
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-white/80">
          {confirmed ? "Booking confirmed" : "Booking received — processing"}
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {confirmed ? "You're all set to fly" : "Payment received — ticket pending"}
        </h1>
        <p className="mt-2 text-white/90">
          PNR <span className="font-mono text-xl font-bold tracking-widest">{booking.pnr}</span>
        </p>
        {!confirmed && (
          <p className="mt-4 rounded-xl bg-white/10 p-4 text-sm text-white/90 ring-1 ring-white/20">
            Our team is reviewing your booking. Confirmation will be emailed to{" "}
            <strong>{booking.contact.email}</strong>.
          </p>
        )}
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
        <Info label="Booking ID" value={booking.bookingId} mono />
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-subtle">Status</dt>
          <dd className="mt-1">
            <Badge tone={confirmed ? "success" : "warning"}>{booking.status}</Badge>
          </dd>
        </div>
        <Info
          label="Flight"
          value={`${booking.flight.airline.name} · ${booking.flight.flightNumber}`}
        />
        <Info
          label="Route"
          value={`${booking.flight.origin.city} → ${booking.flight.destination.city}`}
        />
        <Info label="Travel date" value={formatDate(booking.flight.departureDate)} />
        <Info
          label="Schedule"
          value={`${booking.flight.departureTime} – ${booking.flight.arrivalTime}`}
        />
      </div>

      <div className="border-t border-neutral-100 px-5 py-5 sm:px-6">
        <h2 className="mb-3 font-semibold text-ink">Passengers &amp; seats</h2>
        <ul className="space-y-2 text-sm text-ink-muted">
          {booking.passengers.map((p, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-50 px-4 py-3"
            >
              <span>
                {p.title} {p.firstName} {p.lastName}
              </span>
              <span className="rounded-lg bg-primary-50 px-2.5 py-1 font-mono text-sm font-semibold text-primary-800">
                {p.seatNumber ?? booking.seats[i]?.seatNumber ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 border-t border-neutral-100 px-5 py-5 sm:grid-cols-2 sm:px-6">
        <div>
          <h2 className="mb-3 font-semibold text-ink">Payment</h2>
          <dl className="space-y-2 text-sm text-ink-muted">
            <Row label="Status" value={booking.payment.status} />
            <Row label="Method" value={booking.payment.method.toUpperCase()} />
            <Row label="Transaction" value={booking.payment.transactionId} mono />
            <Row label="Amount paid" value={formatINR(booking.totalAmount)} bold />
          </dl>
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-ink">Fare breakdown</h2>
          <dl className="space-y-2 text-sm text-ink-muted">
            <Row label="Base fare" value={formatINR(booking.fare.baseFare)} />
            <Row label="Taxes" value={formatINR(booking.fare.taxes)} />
            <Row label="Seat charges" value={formatINR(booking.seatCharges)} />
            <Row label="Total" value={formatINR(booking.totalAmount)} bold />
          </dl>
        </div>
      </div>

      {footer && (
        <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-5 sm:flex-row sm:flex-wrap sm:px-6">
          {footer}
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className={`mt-1 text-sm font-medium text-ink ${mono ? "font-mono text-xs break-all" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  bold,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className={`${mono ? "truncate font-mono text-xs" : ""} ${bold ? "font-bold text-ink" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
