import type { ReactNode } from "react";
import {
  CheckCircle2,
  Clock3,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration, formatINR } from "@/lib/format";
import { passengerTypeLabel } from "@/lib/flights/pricing";
import { STATE_INFO, nextSteps, type StatusTone } from "@/lib/booking-status";
import type { Booking, BookingState, Flight } from "@/types";

/** "2026-10-17" → "17 Oct 2026" */
function ticketDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Where the airline side stands — kept separate from payment so a paid request never reads as a ticket. */
function airlineStatus(state: BookingState): { label: string; tone: StatusTone } {
  switch (state) {
    case "TICKET_ISSUED":
      return { label: "Ticket issued", tone: "success" };
    case "BOOKING_CONFIRMED":
      return { label: "Confirmed by airline", tone: "success" };
    case "BOOKING_FAILED":
      return { label: "Airline booking failed", tone: "danger" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "danger" };
    default:
      return { label: "Pending airline confirmation", tone: "warning" };
  }
}

function headerMessage(booking: Booking): string {
  switch (booking.state) {
    case "PAYMENT_CONFIRMED":
      return "Your payment has been verified. Airline booking confirmation is pending.";
    case "PAYMENT_PENDING":
      return "We've received your request. It isn't confirmed yet — we'll contact you with the final price and how to pay.";
    case "PAYMENT_FAILED":
      return "We haven't received your payment. Contact us if you've already paid.";
    case "BOOKING_CONFIRMED":
      return "The airline has confirmed your booking. Your e-ticket hasn't been issued yet.";
    case "TICKET_ISSUED":
      return "Your e-ticket is issued. Check in with the airline using your PNR.";
    case "DRAFT":
    case "PASSENGERS_COMPLETED":
    case "REVIEWED":
      return "This booking hasn't been submitted yet.";
    default:
      return STATE_INFO[booking.state].headline;
  }
}

const TONE_TEXT: Record<StatusTone, string> = {
  success: "bg-success-50 text-success-700 ring-success-500/25",
  // No dark warning token exists; amber-800 keeps the text readable on the pale amber (≈7:1).
  warning: "bg-warning-50 text-amber-800 ring-warning-500/40",
  danger: "bg-danger-50 text-danger-700 ring-danger-500/25",
  neutral: "bg-neutral-100 text-ink-muted ring-neutral-300",
};

function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONE_TEXT[tone])}>
      {children}
    </span>
  );
}

function travellerSummary(booking: Booking): string {
  return (
    [
      ["adult", booking.adults],
      ["child", booking.children],
      ["infant", booking.infants],
    ] as const
  )
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${n} ${passengerTypeLabel(type, n)}`)
    .join(", ");
}

/** Compact status header: what is verified, what is still pending. */
export function BookingStatusHeader({ booking }: { booking: Booking }) {
  const info = STATE_INFO[booking.state];
  const paid = booking.paymentStatus === "paid";
  const airline = airlineStatus(booking.state);
  const Icon = info.tone === "success" ? CheckCircle2 : info.tone === "danger" ? XCircle : paid ? ShieldCheck : Clock3;

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
            TONE_TEXT[paid && info.tone !== "danger" ? "success" : info.tone],
          )}
          aria-hidden
        >
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight text-ink">{info.label}</h1>
            {booking.legacy && <StatusBadge tone="neutral">Legacy test booking</StatusBadge>}
          </div>
          <p className="mt-0.5 text-[13px] text-ink-muted">{headerMessage(booking)}</p>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Updates go to <span className="font-medium text-ink-muted">{booking.contact.email}</span>
          </p>
        </div>
      </div>

      <dl className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-primary-100 bg-white/80 px-3 py-2 text-xs sm:min-w-64">
        <StatusItem label="Payment">
          <StatusBadge tone={paid ? "success" : booking.paymentStatus === "failed" ? "danger" : "warning"}>
            {paid ? "Verified" : booking.paymentStatus === "failed" ? "Not received" : "Not paid yet"}
          </StatusBadge>
        </StatusItem>
        <StatusItem label="Airline booking">
          <StatusBadge tone={airline.tone}>{airline.tone === "warning" ? "Pending" : airline.label}</StatusBadge>
        </StatusItem>
        <StatusItem label="Submitted">
          <span className="font-medium text-ink">{booking.submittedAt ? formatDateTime(booking.submittedAt) : "Not submitted"}</span>
        </StatusItem>
        <StatusItem label="E-ticket">
          <span className="font-medium text-ink">{booking.state === "TICKET_ISSUED" ? "Issued" : "Not issued"}</span>
        </StatusItem>
      </dl>
    </header>
  );
}

function StatusItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/**
 * Boarding-pass styled itinerary. It is deliberately labelled a booking request — it never shows
 * a PNR, seat, gate or ticket number the airline hasn't supplied.
 */
export function BookingTicket({ booking }: { booking: Booking }) {
  const airline = airlineStatus(booking.state);
  const legs: { title: string; flight: Flight }[] = [
    { title: booking.returnFlight ? "Departing flight" : "Flight itinerary", flight: booking.flight },
    ...(booking.returnFlight ? [{ title: "Return flight", flight: booking.returnFlight }] : []),
  ];
  const issued = booking.state === "TICKET_ISSUED";
  const lead = booking.passengers[0];
  const out = booking.flight;

  return (
    <article
      aria-label={`Booking ${booking.bookingId}, ${out.origin.code} to ${out.destination.code}`}
      className="relative grid overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-medium md:grid-cols-[minmax(0,68fr)_minmax(0,32fr)]"
    >
      {/* Main ticket */}
      <div className="min-w-0 p-4 sm:p-5">
        {legs.map(({ title, flight }, i) => (
          <section key={title} className={cn(i > 0 && "mt-4 border-t border-neutral-100 pt-4")} aria-label={title}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">
                <Plane className="size-3.5 rotate-45" aria-hidden />
                {title}
              </p>
              {i === 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] text-ink-muted">{booking.bookingId}</span>
                  <StatusBadge tone={airline.tone}>{airline.label}</StatusBadge>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(72px,1.3fr)_minmax(0,1fr)] items-center gap-2 sm:gap-4">
              <Airport label="From" code={flight.origin.code} city={flight.origin.city} time={flight.departureTime} />
              <div className="flex flex-col items-center text-center" aria-hidden>
                <span className="text-[11px] text-ink-muted">{formatDuration(flight.durationMinutes)}</span>
                <span className="my-1 flex w-full items-center gap-1 text-primary-500">
                  <PlaneTakeoff className="size-3.5 shrink-0" />
                  <span className="h-px flex-1 border-t border-dashed border-primary-300" />
                  <Plane className="size-3.5 shrink-0 rotate-45 text-primary-600" />
                  <span className="h-px flex-1 border-t border-dashed border-primary-300" />
                  <PlaneLanding className="size-3.5 shrink-0" />
                </span>
                <span className={cn("text-[11px] font-medium", flight.layovers?.length ? "text-accent-dark" : "text-success-700")}>
                  {flight.layovers?.length ? `1 stop · ${flight.layovers.map((l) => l.airport.code).join(", ")}` : "Non-stop"}
                </span>
              </div>
              <Airport
                label="To"
                code={flight.destination.code}
                city={flight.destination.city}
                time={flight.arrivalTime}
                nextDay={flight.arrivalDate !== flight.departureDate}
                alignRight
              />
            </div>

            {/* Times and duration are already on the route line, so phones skip those cells. */}
            <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 rounded-lg bg-primary-50/50 px-3 py-2 sm:grid-cols-4 sm:gap-x-4 sm:py-2.5">
              <Detail label="Date" value={ticketDate(flight.departureDate)} />
              <Detail label="Departure" value={flight.departureTime} className="hidden sm:block" />
              <Detail label="Arrival" value={`${flight.arrivalTime}${flight.arrivalDate !== flight.departureDate ? " (+1)" : ""}`} className="hidden sm:block" />
              <Detail label="Cabin" value={flight.cabinClass} />
              <Detail label="Airline" value={flight.airline.name} className="col-span-2 sm:col-span-1" wrap />
              <Detail label="Flight" value={flight.flightNumber} />
              <Detail
                label="Stops"
                value={
                  flight.layovers?.length
                    ? flight.layovers
                        .map((l) => `${l.airport.city} ${Math.floor(l.durationMinutes / 60)}h ${l.durationMinutes % 60}m`)
                        .join(", ")
                    : "Non-stop"
                }
              />
              <Detail label="Duration" value={formatDuration(flight.durationMinutes)} className="hidden sm:block" />
            </dl>
          </section>
        ))}

        <div className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-dashed border-neutral-200 pt-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
              Passenger{booking.passengers.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {booking.passengers.map((p, i) => (
                <li key={i} className="text-[13px] font-semibold text-ink">
                  {p.title} {p.firstName} {p.lastName}
                  {p.type !== "adult" && <span className="ml-1.5 text-[11px] font-normal text-ink-subtle">{passengerTypeLabel(p.type)}</span>}
                  {issued && booking.ticketNumbers[i] && (
                    <span className="ml-2 font-mono text-[11px] font-normal text-ink-muted">Ticket {booking.ticketNumbers[i]}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">Travellers</p>
            <p className="mt-0.5 text-[13px] font-semibold text-ink">{travellerSummary(booking)}</p>
          </div>
        </div>
      </div>

      {/* Detachable stub */}
      <aside
        aria-label="Booking details"
        className="relative border-t-2 border-dashed border-primary-200 bg-linear-to-b from-primary-50/80 to-white px-4 py-3 sm:p-5 md:border-l-2 md:border-t-0"
      >
        {/* Perforation notches, cut out in the page background colour. */}
        <span aria-hidden className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-primary-50 md:-left-2.5 md:-top-2.5" />
        <span aria-hidden className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-primary-50 md:-bottom-2.5 md:-left-2.5 md:right-auto md:top-auto" />

        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">Booking details</p>
        <p className="mt-1 font-mono text-sm font-bold tracking-wide text-ink">{booking.bookingId}</p>

        {/* On phones the stub sits under the itinerary, so the route and flight/date repeats are dropped. */}
        <div className="mt-3 hidden items-center justify-between gap-2 md:flex">
          <span className="text-2xl font-bold tracking-tight text-ink">{out.origin.code}</span>
          <Plane className="size-4 rotate-45 text-primary-600" aria-hidden />
          <span className="text-2xl font-bold tracking-tight text-ink">{out.destination.code}</span>
        </div>

        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 md:mt-3">
          <Detail label="Flight" value={out.flightNumber} className="hidden md:block" />
          <Detail label="Date" value={ticketDate(out.departureDate).toUpperCase()} className="hidden md:block" />
          <Detail
            label="Passenger"
            value={
              lead
                ? `${lead.firstName} ${lead.lastName}${booking.passengers.length > 1 ? ` +${booking.passengers.length - 1}` : ""}`
                : "—"
            }
            className="md:col-span-2"
          />
          <Detail label="Airline PNR" value={booking.pnr ?? "Awaiting airline"} mono={Boolean(booking.pnr)} className="md:col-span-2" />
          {booking.returnFlight && (
            <Detail
              label="Return"
              value={`${booking.returnFlight.flightNumber} · ${ticketDate(booking.returnFlight.departureDate).toUpperCase()}`}
              className="col-span-2"
            />
          )}
        </dl>

        <DecorativeBarcode />
        <p className="mt-1.5 text-balance text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
          Booking request · Not a boarding pass
        </p>
      </aside>
    </article>
  );
}

function Airport({
  label,
  code,
  city,
  time,
  nextDay,
  alignRight,
}: {
  label: string;
  code: string;
  city: string;
  time: string;
  nextDay?: boolean;
  alignRight?: boolean;
}) {
  return (
    <div className={cn("min-w-0", alignRight && "text-right")}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className="text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[28px]">{code}</p>
      <p className="truncate text-xs text-ink-muted">
        {city} · <span className="font-semibold text-ink">{time}</span>
        {nextDay && <sup className="ml-0.5 text-[10px] font-semibold text-accent">+1</sup>}
      </p>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  wrap,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  /** Let long values (airline names) wrap instead of truncating. */
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className={cn("text-[13px] font-semibold leading-snug text-ink", wrap ? "break-words" : "truncate", mono && "font-mono tracking-wider")} title={value}>
        {value}
      </dd>
    </div>
  );
}

/** Purely decorative bar pattern (fixed, encodes nothing) — the ticket look without a fake scannable code. */
const BARS = [2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 2, 1, 1, 3, 1, 1, 2, 1, 2, 3, 1, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1];

function DecorativeBarcode() {
  return (
    <div aria-hidden className="mt-3 flex h-8 items-stretch justify-center gap-[2px] opacity-70 md:mt-4 md:h-10">
      {BARS.map((w, i) => (
        <span key={i} className="bg-ink" style={{ width: `${w}px` }} />
      ))}
    </div>
  );
}

/** Compact fare lines, exactly as priced by the server. */
export function BookingFareSummary({ booking }: { booking: Booking }) {
  const paid = booking.paymentStatus === "paid";
  const roundTrip = Boolean(booking.returnFlight);
  return (
    <section aria-labelledby="fare-summary-title" className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 id="fare-summary-title" className="text-sm font-semibold text-ink">
        {paid ? "Fare summary" : "Quoted fare"}
      </h2>
      <dl className="mt-2 space-y-1.5 text-[13px] text-ink-muted">
        {booking.fareBreakdown?.map((line) => (
          <FareRow
            key={`${line.leg}-${line.passengerType}`}
            label={`${roundTrip ? (line.leg === "outbound" ? "Departing · " : "Return · ") : ""}${line.count} × ${passengerTypeLabel(line.passengerType, line.count)}`}
            value={formatINR(line.total)}
          />
        ))}
        <FareRow label="Base fare" value={formatINR(booking.fare.baseFare)} />
        <FareRow label="Taxes & airline fees" value={formatINR(booking.fare.taxes)} />
        {booking.seatCharges > 0 && <FareRow label="Seats" value={formatINR(booking.seatCharges)} />}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-2 text-sm font-bold text-ink">
          <dt>{paid ? "Total paid" : "Quoted total"}</dt>
          <dd className="tabular-nums">{formatINR(booking.totalAmount)}</dd>
        </div>
      </dl>
      {booking.payment?.status === "SUCCESS" && (
        <p className="mt-2 flex items-center justify-between gap-3 rounded-md bg-neutral-50 px-2.5 py-1.5 text-[11px] text-ink-muted">
          Payment reference
          <span className="font-mono text-ink">{booking.payment.transactionId}</span>
        </p>
      )}
    </section>
  );
}

function FareRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}

/** The next steps for this state, kept short. */
export function BookingNextSteps({ booking }: { booking: Booking }) {
  const steps = nextSteps(booking.state);
  if (!steps.length) return null;
  return (
    <section aria-labelledby="next-steps-title" className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 id="next-steps-title" className="text-sm font-semibold text-ink">
        What happens next
      </h2>
      <ol className="mt-2 space-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2 text-[13px] text-ink-muted">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-semibold text-primary-700">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </section>
  );
}
