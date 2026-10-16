"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FlaskConical, QrCode, ShieldCheck } from "lucide-react";
import { createBooking, payBooking } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { getPaymentConfig } from "@/lib/api/payments";
import { useBooking, type CheckoutState } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { FareSummaryCard } from "@/components/flights/fare-summary-card";
import { FlightRouteBar } from "@/components/flights/flight-route-bar";
import { Stepper } from "@/components/booking/stepper";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { formatINR } from "@/lib/format";
import { fareSummaryRows, priceTrip } from "@/lib/flights/pricing";
import { segmentsOf } from "@/lib/flights/segments";
import type { PaymentConfig, PaymentMethod } from "@/types";

type Tab = PaymentMethod;

const PAYMENT_TABS: { id: Tab; label: string }[] = [
  { id: "upi", label: "UPI" },
  { id: "qr", label: "QR Code" },
  { id: "card", label: "Card" },
];

function newCheckoutKey(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `co_${random.replace(/[^A-Za-z0-9]/g, "")}`.slice(0, 64);
}

export function PaymentView() {
  const router = useRouter();
  const {
    search,
    selectedFlight,
    selectedReturnFlight,
    passengers,
    contact,
    selectedSeats,
    seatCharges,
    checkout,
    setCheckout,
  } = useBooking();

  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [tab, setTab] = useState<Tab>("upi");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [qrCompleted, setQrCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState("");

  // Every adult and child needs a seat on every segment of every leg; infants sit on a lap.
  const seatsNeeded =
    passengers.filter((p) => p.type !== "infant").length *
    ((selectedFlight ? segmentsOf(selectedFlight).length : 0) +
      (selectedReturnFlight ? segmentsOf(selectedReturnFlight).length : 0));

  useEffect(() => {
    if (!selectedFlight || !search || passengers.length === 0 || selectedSeats.length !== seatsNeeded) {
      router.replace("/booking/seats");
    }
  }, [selectedFlight, search, passengers, selectedSeats, seatsNeeded, router]);

  useEffect(() => {
    let cancelled = false;
    getPaymentConfig()
      .then((value) => {
        if (!cancelled) setConfig(value);
      })
      .catch((err) => {
        if (!cancelled) setError(`Payments are unavailable right now: ${getErrorMessage(err)}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const price = useMemo(
    () => (selectedFlight && search ? priceTrip(selectedFlight, selectedReturnFlight, search) : null),
    [selectedFlight, selectedReturnFlight, search],
  );
  const totalPayable = (price?.total ?? 0) + seatCharges;

  // What gets booked; a change means a new checkout (and a new booking).
  const bookingPayload = useMemo(
    () =>
      selectedFlight
        ? {
            flightId: selectedFlight.id,
            returnFlightId: selectedReturnFlight?.id ?? null,
            passengers,
            contact,
            seats: selectedSeats,
          }
        : null,
    [selectedFlight, selectedReturnFlight, passengers, contact, selectedSeats],
  );
  const fingerprint = useMemo(() => JSON.stringify(bookingPayload), [bookingPayload]);
  const heldBooking = checkout?.fingerprint === fingerprint ? checkout : null;

  if (!selectedFlight || !search || !price || !bookingPayload) return null;

  function validate(): string | null {
    if (tab === "qr" && !qrCompleted) {
      return "Tick the box to confirm the test QR payment.";
    }
    if (tab === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      if (digits.length < 12 || digits.length > 19 || !/^\d+$/.test(digits)) {
        return "Enter a valid card number.";
      }
      if (!cardName.trim()) return "Enter the cardholder name.";
      if (!/^\d{2}\/\d{2}$/.test(expiry)) return "Expiry must be MM/YY.";
      if (!/^\d{3,4}$/.test(cvv)) return "Enter a valid CVV.";
    }
    return null;
  }

  /** The booking for this checkout, creating it (seats held, payment pending) once. */
  async function ensureBooking(): Promise<{ bookingId: string; accessToken: string }> {
    let current: CheckoutState = heldBooking ?? { key: newCheckoutKey(), fingerprint };
    if (current.bookingId && current.accessToken) {
      return { bookingId: current.bookingId, accessToken: current.accessToken };
    }
    setCheckout(current);
    const booking = await createBooking({ checkoutKey: current.key, ...bookingPayload! });
    current = { ...current, bookingId: booking.bookingId, accessToken: booking.accessToken };
    setCheckout(current);
    return { bookingId: booking.bookingId, accessToken: booking.accessToken };
  }

  async function handlePay(simulateFailure = false) {
    if (submitting || !config) return;
    const validationError = simulateFailure ? null : validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");
    setFailure("");
    try {
      const { bookingId, accessToken } = await ensureBooking();
      const booking = await payBooking(bookingId, accessToken, {
        method: tab,
        cardLast4: tab === "card" ? cardNumber.replace(/\s/g, "").slice(-4) : undefined,
        simulateFailure,
      });
      setCardNumber("");
      setCvv("");
      if (booking.paymentStatus === "paid") {
        router.push(`/booking/confirmation/${bookingId}?token=${encodeURIComponent(accessToken)}`);
        return;
      }
      setFailure(booking.payments.at(-1)?.failureReason ?? "The payment was declined.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const payLabel = failure ? `Try again · ${formatINR(totalPayable)}` : `Pay ${formatINR(totalPayable)}`;

  return (
    <Container className="pb-24 pt-6 lg:pb-8">
      <Stepper current="payment" variant="compact" className="lg:hidden" />
      <Stepper current="payment" className="hidden lg:block" />
      <FlightRouteBar
        flight={selectedFlight}
        returnFlight={selectedReturnFlight}
        counts={search}
        className="mb-4 mt-4"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold text-ink">Payment options</h1>
              <p className="text-xs text-ink-muted">
                {config?.testMode ? "Test checkout — no real money will be charged." : "Secure checkout."}
              </p>
            </div>
            {config?.testMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-warning-500 ring-1 ring-warning-500/30">
                <FlaskConical className="size-3.5" aria-hidden />
                Test payment
              </span>
            )}
          </div>

          {heldBooking?.bookingId && (
            <p className="mb-4 rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-800">
              Booking <strong className="font-mono">{heldBooking.bookingId}</strong> is held for you —{" "}
              <strong>payment pending</strong>.
            </p>
          )}

          <div
            role="tablist"
            aria-label="Payment method"
            className="mb-5 inline-flex w-full flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 sm:w-auto"
          >
            {PAYMENT_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => {
                  setTab(id);
                  setError("");
                }}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
                  tab === id ? "bg-white text-primary-700 shadow-xs" : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "upi" && (
            <div className="space-y-2">
              <Field label="Pay to UPI ID">
                <Input value={config?.payeeVpa ?? "Loading…"} readOnly aria-readonly className="bg-neutral-50 font-mono" />
              </Field>
              <p className="text-xs text-ink-muted">
                {config?.testMode
                  ? "Test mode: pressing Pay simulates a successful UPI payment to this ID. No request is sent to any UPI app and no money moves."
                  : "You'll be asked to approve the payment in your UPI app."}
              </p>
            </div>
          )}

          {tab === "qr" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50">
                <QrCode className="size-10 text-ink-subtle" aria-hidden />
                <p className="text-xs text-ink-subtle">Test QR placeholder</p>
                <p className="font-mono text-[11px] text-ink-muted">{config?.payeeVpa}</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={qrCompleted}
                  onChange={(e) => setQrCompleted(e.target.checked)}
                  className="size-4 rounded border-neutral-300 text-primary-600"
                />
                I have completed the test payment
              </label>
            </div>
          )}

          {tab === "card" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Card number" className="sm:col-span-2">
                <Input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4111 1111 1111 1111"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
              </Field>
              <Field label="Cardholder name" className="sm:col-span-2">
                <Input autoComplete="cc-name" value={cardName} onChange={(e) => setCardName(e.target.value)} />
              </Field>
              <Field label="Expiry (MM/YY)">
                <Input placeholder="08/28" autoComplete="cc-exp" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </Field>
              <Field label="CVV">
                <Input
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  type="password"
                  maxLength={4}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                />
              </Field>
              <p className="text-xs text-ink-subtle sm:col-span-2">
                Only the last 4 digits are sent to the server. Card number and CVV are never stored.
              </p>
            </div>
          )}

          {failure && (
            <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-50 p-3 text-sm text-danger-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                <strong className="font-semibold">Payment failed:</strong> {failure}. No money was taken — your
                booking is still held, so you can try again.
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-danger-700">
              {error}
            </p>
          )}

          {config?.canSimulateFailure && (
            <div className="mt-5 border-t border-dashed border-neutral-200 pt-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handlePay(true)}
                className="text-xs font-semibold text-ink-subtle underline-offset-2 hover:text-danger-700 hover:underline disabled:opacity-50"
              >
                TEST: Simulate a failed payment
              </button>
            </div>
          )}
        </Card>

        <FareSummaryCard
          title="Payment summary"
          rows={[
            ...fareSummaryRows(price, Boolean(selectedReturnFlight)),
            {
              label: "Seat charges",
              hint:
                selectedSeats
                  .filter((seat) => seat.price > 0)
                  .map((seat) =>
                    selectedReturnFlight ? `${seat.seatNumber} (${seat.leg === "outbound" ? "dep" : "ret"})` : seat.seatNumber,
                  )
                  .join(", ") || undefined,
              amount: seatCharges,
            },
          ]}
          total={totalPayable}
          totalLabel="Total payable"
          note={
            <span className="inline-flex items-start gap-1">
              {config?.testMode
                ? "Test payment gateway — the amount is calculated and confirmed by our server; no real money moves."
                : "The amount is calculated and confirmed by our server."}
            </span>
          }
        >
          <Button
            className="hidden w-full lg:inline-flex"
            size="lg"
            variant="accent"
            disabled={submitting || !config}
            onClick={() => void handlePay()}
          >
            <ShieldCheck className="size-4" aria-hidden />
            {submitting ? "Processing payment…" : payLabel}
          </Button>
        </FareSummaryCard>
      </div>
      <StickyActionBar
        total={formatINR(totalPayable)}
        ctaLabel={payLabel}
        loading={submitting}
        disabled={!config}
        onClick={() => void handlePay()}
      />
    </Container>
  );
}
