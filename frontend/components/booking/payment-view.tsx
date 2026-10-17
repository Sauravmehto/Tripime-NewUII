"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardCheck, Info, Send } from "lucide-react";
import { submitBookingRequest } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { getPaymentConfig } from "@/lib/api/payments";
import { Container } from "@/components/layout/container";
import { FlightRouteBar } from "@/components/flights/flight-route-bar";
import { BookingPriceSummary } from "@/components/booking/booking-price-summary";
import { Stepper } from "@/components/booking/stepper";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { formatDate, formatINR } from "@/lib/format";
import { travellersLabel } from "@/lib/flights/search-params";
import { useDraftBooking } from "@/lib/flights/use-draft-booking";
import type { PaymentConfig } from "@/types";

/**
 * No payment gateway is integrated, so nothing is charged here. The action
 * submits a booking request; the team verifies availability and price, then
 * arranges payment, which an admin verifies before anything is confirmed.
 */
export function PaymentView() {
  const router = useRouter();
  const { booking, error: loadError, apply } = useDraftBooking();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getPaymentConfig()
      .then((value) => !cancelled && setConfig(value))
      .catch(() => {
        // Only used for wording; the submit itself doesn't depend on it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    if (!booking || submitting) return;
    if (!understood) {
      setError("Please confirm you understand this is a booking request, not a confirmed ticket.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const submitted = await submitBookingRequest(booking.bookingId);
      apply(submitted);
      router.push(`/booking/confirmation?ref=${encodeURIComponent(submitted.bookingId)}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Container className="py-8">
        <p role="alert" className="rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700">
          {loadError}
        </p>
      </Container>
    );
  }
  if (!booking) {
    return (
      <Container className="space-y-4 py-8" aria-busy>
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </Container>
    );
  }

  const gateway = config?.gatewayConfigured ?? false;
  const cta = gateway ? `Pay ${formatINR(booking.totalAmount)}` : "Submit Booking Request";

  return (
    <Container className="pb-24 pt-6 lg:pb-8">
      <Stepper current="payment" variant="compact" className="lg:hidden" />
      <Stepper current="payment" className="hidden lg:block" />
      <FlightRouteBar flight={booking.flight} returnFlight={booking.returnFlight} counts={booking} className="mb-4 mt-4" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          <Card padded={false} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold text-ink">Submit your booking request</h1>
                <p className="text-sm text-ink-muted">
                  {booking.flight.origin.city} → {booking.flight.destination.city} · {formatDate(booking.flight.departureDate)}
                  {booking.returnFlight ? ` – ${formatDate(booking.returnFlight.departureDate)}` : ""} · {travellersLabel(booking)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-700">
                <ClipboardCheck className="size-3.5" aria-hidden /> Booking request
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/60 p-4 text-sm text-ink">
              <p className="flex items-center gap-2 font-semibold">
                <Info className="size-4 text-primary-600" aria-hidden /> How payment works right now
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-muted">
                <li>Submitting sends your request to the Tripime team. <strong className="text-ink">Nothing is charged now.</strong></li>
                <li>We check seat availability and the final price with the airline and contact you.</li>
                <li>Only after that do you pay; our team verifies the payment.</li>
                <li>Your booking is confirmed when you receive the airline PNR, and your e-ticket when tickets are issued.</li>
              </ol>
              {config?.upiId && (
                <p className="mt-3 text-xs text-ink-muted">
                  When we ask you to pay, our UPI ID will be <span className="font-mono text-ink">{config.upiId}</span>.
                  Please don&apos;t pay before our team confirms the booking and amount with you. Never share your UPI PIN
                  or card details with anyone, including us.
                </p>
              )}
            </div>

            <label className="mt-4 flex items-start gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => {
                  setUnderstood(e.target.checked);
                  setError("");
                }}
                className="mt-0.5 size-4 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              I understand this is a booking request: it isn&apos;t paid or confirmed, and no ticket is issued until the
              Tripime team confirms it with the airline.
            </label>

            {error && (
              <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-danger-700">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="accent" className="hidden lg:inline-flex" disabled={submitting} onClick={() => void handleSubmit()}>
                <Send className="size-4" aria-hidden />
                {submitting ? "Submitting…" : cta}
              </Button>
              <Link href="/booking/review" className="text-sm font-semibold text-primary-700">
                Back to review
              </Link>
            </div>
          </Card>
        </div>
        <BookingPriceSummary
          booking={booking}
          title="Quote summary"
          totalLabel="Quoted total"
          note="This is a quote from current fares. Our team confirms the final price before you pay."
        />
      </div>
      <StickyActionBar total={formatINR(booking.totalAmount)} ctaLabel={submitting ? "Submitting…" : cta} loading={submitting} onClick={() => void handleSubmit()} />
    </Container>
  );
}
