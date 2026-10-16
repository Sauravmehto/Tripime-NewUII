import type { ReactNode } from "react";
import { Badge } from "@/components/ui/card";
import { formatDate, formatINR } from "@/lib/format";
import { passengerTypeLabel } from "@/lib/flights/pricing";
import type { Booking, Flight } from "@/types";

export function BookingSummaryCard({
  booking,
  footer,
}: {
  booking: Booking;
  footer?: ReactNode;
}) {
  const confirmed = booking.bookingStatus === "confirmed";
  const cancelled = booking.bookingStatus === "cancelled";
  const paid = booking.paymentStatus === "paid";
  const testMode = (booking.payment ?? booking.payments.at(-1))?.testMode ?? false;
  const headline = cancelled
    ? { kicker: "Booking cancelled", title: "This booking has been cancelled", tone: "danger" as const }
    : confirmed
      ? { kicker: "Booking confirmed", title: "You're all set to fly", tone: "success" as const }
      : paid
        ? { kicker: "Booking received — processing", title: "Payment received — ticket pending", tone: "warning" as const }
        : {
            kicker: booking.paymentStatus === "failed" ? "Payment failed" : "Payment pending",
            title: "Your seats are held — payment not completed",
            tone: "warning" as const,
          };

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-elevated ${
        headline.tone === "success"
          ? "border-success-500/30"
          : headline.tone === "danger"
            ? "border-danger-500/40"
            : "border-warning-500/40"
      }`}
    >
      <div
        className={`px-5 py-8 sm:px-6 ${
          headline.tone === "success"
            ? "bg-linear-to-r from-primary-800 to-primary-600"
            : headline.tone === "danger"
              ? "bg-linear-to-r from-danger-700 to-neutral-700"
              : "bg-linear-to-r from-warning-500 to-primary-700"
        } text-white`}
      >
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/80">
          {headline.kicker}
          {testMode && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white ring-1 ring-white/40">
              Test payment
            </span>
          )}
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{headline.title}</h1>
        <p className="mt-2 text-white/90">
          PNR <span className="font-mono text-xl font-bold tracking-widest">{booking.pnr}</span>
        </p>
        {paid && !confirmed && !cancelled && (
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
          <dd className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={paid ? "success" : booking.paymentStatus === "failed" ? "danger" : "warning"}>
              Payment: {booking.paymentStatus.toUpperCase()}
            </Badge>
            <Badge tone={confirmed ? "success" : cancelled ? "danger" : "warning"}>
              Booking: {booking.bookingStatus.toUpperCase()}
            </Badge>
          </dd>
        </div>
      </div>

      <div className="grid gap-3 border-t border-neutral-100 px-5 py-5 sm:px-6 md:grid-cols-2">
        <LegCard title={booking.returnFlight ? "Departing flight" : "Flight"} flight={booking.flight} />
        {booking.returnFlight && <LegCard title="Return flight" flight={booking.returnFlight} />}
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
                {p.type && p.type !== "adult" && (
                  <span className="ml-2 text-xs text-ink-subtle">{passengerTypeLabel(p.type)}</span>
                )}
              </span>
              <span className="rounded-lg bg-primary-50 px-2.5 py-1 font-mono text-sm font-semibold text-primary-800">
                {p.type === "infant"
                  ? "On lap"
                  : `${p.seatNumber ?? booking.seats[i]?.seatNumber ?? "—"}${booking.returnFlight ? ` / ${p.returnSeatNumber ?? "—"}` : ""}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 border-t border-neutral-100 px-5 py-5 sm:grid-cols-2 sm:px-6">
        <div>
          <h2 className="mb-3 font-semibold text-ink">Payment</h2>
          <dl className="space-y-2 text-sm text-ink-muted">
            <Row label="Status" value={booking.paymentStatus.toUpperCase()} />
            {booking.payment ? (
              <>
                <Row
                  label="Method"
                  value={`${booking.payment.method.toUpperCase()}${booking.payment.testMode ? " (test mode)" : ""}`}
                />
                {booking.payment.payee && <Row label="Paid to" value={booking.payment.payee} mono />}
                <Row label="Transaction" value={booking.payment.transactionId} mono />
                <Row label="Amount paid" value={formatINR(booking.totalAmount)} bold />
              </>
            ) : (
              <Row label="Amount due" value={formatINR(booking.totalAmount)} bold />
            )}
            <Row label="Invoice" value={booking.invoiceNumber} mono />
          </dl>
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-ink">Fare breakdown</h2>
          <dl className="space-y-2 text-sm text-ink-muted">
            {booking.fareBreakdown?.map((line) => (
              <Row
                key={`${line.leg}-${line.passengerType}`}
                label={`${booking.returnFlight ? (line.leg === "outbound" ? "Departing · " : "Return · ") : ""}${line.count} × ${passengerTypeLabel(line.passengerType, line.count)}`}
                value={formatINR(line.total)}
              />
            ))}
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
