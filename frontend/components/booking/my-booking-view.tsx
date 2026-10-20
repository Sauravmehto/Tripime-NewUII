"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Plane } from "lucide-react";
import { listMyBookings } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { STATE_INFO } from "@/lib/booking-status";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { HELPLINE_DISPLAY, telLink } from "@/lib/contact";
import { loginHref } from "@/lib/safe-redirect";
import { useCustomerSession } from "@/context/customer-session-provider";
import { Container } from "@/components/layout/container";
import { Badge, Card, Skeleton } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import type { Booking } from "@/types";

/** Signed-in customer's bookings. Bookings are private: no lookup by reference alone. */
export function MyBookingView() {
  const { session } = useCustomerSession();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.authenticated) return;
    let cancelled = false;
    listMyBookings()
      .then((list) => !cancelled && setBookings(list))
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [session?.authenticated]);

  const submitted = (bookings ?? []).filter((b) => !["DRAFT", "PASSENGERS_COMPLETED", "REVIEWED"].includes(b.state));

  return (
    <Container narrow className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">My bookings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Booking requests and tickets for {session?.authenticated ? <strong className="text-ink">{session.email}</strong> : "your account"}.
        </p>
      </div>

      {session === null && <Skeleton className="h-32" />}

      {session && !session.authenticated && (
        <Card className="text-center">
          <Lock className="mx-auto size-8 text-primary-600" aria-hidden />
          <p className="mt-3 font-semibold text-ink">Sign in to see your bookings</p>
          <p className="mt-1 text-sm text-ink-muted">Sign in with your email and password to see your booking requests.</p>
          <Link href={loginHref("/my-booking")} className={buttonClasses({ variant: "accent", className: "mt-4" })}>
            Sign in
          </Link>
        </Card>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700">
          {error}
        </p>
      )}

      {session?.authenticated && bookings === null && !error && (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {bookings && submitted.length === 0 && (
        <Card className="text-center">
          <Plane className="mx-auto size-8 text-ink-subtle" aria-hidden />
          <p className="mt-3 font-semibold text-ink">No bookings yet</p>
          <p className="mt-1 text-sm text-ink-muted">Search flights to start a booking request.</p>
          <Link href="/flights" className={buttonClasses({ className: "mt-4" })}>
            Search flights
          </Link>
        </Card>
      )}

      <ul className="space-y-3">
        {submitted.map((b) => {
          const info = STATE_INFO[b.state];
          return (
            <li key={b.bookingId}>
              <Link
                href={`/booking/confirmation?ref=${encodeURIComponent(b.bookingId)}`}
                className="group flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs transition hover:border-primary-300 hover:shadow-soft"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                    {b.flight.origin.code} {b.returnFlight ? "⇄" : "→"} {b.flight.destination.code}
                    <Badge tone={info.tone}>{info.label}</Badge>
                    {b.legacy && <Badge>Legacy test</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {formatDate(b.flight.departureDate)}
                    {b.returnFlight ? ` – ${formatDate(b.returnFlight.departureDate)}` : ""} · {b.passengerCount} traveller
                    {b.passengerCount === 1 ? "" : "s"} · {formatINR(b.totalAmount)}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-subtle">
                    {b.bookingId}
                    {b.pnr ? ` · PNR ${b.pnr}` : ""} · {formatDateTime(b.submittedAt ?? b.createdAt)}
                  </p>
                </div>
                <ArrowRight className="size-4 text-primary-600 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-sm text-ink-muted">
        Can&apos;t find a booking? Call us at{" "}
        <a href={telLink()} className="font-semibold text-primary-700">
          {HELPLINE_DISPLAY}
        </a>
        .
      </p>
    </Container>
  );
}
