"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { processMockPayment } from "@/lib/api/payments";
import { useBooking } from "@/context/booking-provider";
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
import type { PaymentMethod } from "@/types";

type Tab = PaymentMethod;

const PAYMENT_TABS: { id: Tab; label: string }[] = [
  { id: "upi", label: "UPI" },
  { id: "qr", label: "QR Code" },
  { id: "card", label: "Card" },
];

export function PaymentView() {
  const router = useRouter();
  const {
    selectedFlight,
    passengers,
    contact,
    selectedSeats,
    seatCharges,
    setPayment,
  } = useBooking();

  const [tab, setTab] = useState<Tab>("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [qrCompleted, setQrCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedFlight || passengers.length === 0 || selectedSeats.length !== passengers.length) {
      router.replace("/booking/seats");
    }
  }, [selectedFlight, passengers, selectedSeats, router]);

  const flightFare = useMemo(() => {
    if (!selectedFlight) return 0;
    return selectedFlight.fare.totalFare * passengers.length;
  }, [selectedFlight, passengers.length]);

  const baseFare = selectedFlight ? selectedFlight.fare.baseFare * passengers.length : 0;
  const taxes = selectedFlight ? selectedFlight.fare.taxes * passengers.length : 0;
  const totalPayable = flightFare + seatCharges;

  if (!selectedFlight) return null;

  function validate(): string | null {
    if (tab === "upi" && (!upiId.trim() || !upiId.includes("@"))) {
      return "Enter a valid UPI ID (e.g. name@upi).";
    }
    if (tab === "qr" && !qrCompleted) {
      return "Confirm that you have completed the test QR payment.";
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

  async function handlePay() {
    if (submitting || !selectedFlight) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const digits = cardNumber.replace(/\s/g, "");
      const payment = await processMockPayment({
        amount: totalPayable,
        currency: "INR",
        method: tab,
        upiId: tab === "upi" ? upiId.trim() : undefined,
        cardLast4: tab === "card" ? digits.slice(-4) : undefined,
      });

      setPayment(payment);

      const booking = await createBooking({
        flightId: selectedFlight.id,
        passengers,
        contact,
        seats: selectedSeats,
        payment,
      });

      setCardNumber("");
      setCvv("");
      router.push(`/booking/confirmation/${booking.bookingId}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="pb-24 pt-6 lg:pb-8">
      <Stepper current="payment" variant="compact" className="lg:hidden" />
      <Stepper current="payment" className="hidden lg:block" />
      <FlightRouteBar
        flight={selectedFlight}
        passengers={passengers.length}
        className="mb-4 mt-4"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card>
          <div className="mb-4">
            <h1 className="text-lg font-bold text-ink">Payment options</h1>
            <p className="text-xs text-ink-muted">Mock checkout — no real money will be charged.</p>
          </div>
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
                  tab === id
                    ? "bg-white text-primary-700 shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "upi" && (
            <Field label="UPI ID">
              <Input
                placeholder="name@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </Field>
          )}

          {tab === "qr" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-48 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50">
                <p className="text-xs text-ink-subtle">Test QR placeholder</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={qrCompleted}
                  onChange={(e) => setQrCompleted(e.target.checked)}
                  className="size-4 rounded border-neutral-300 text-primary-600"
                />
                I have completed payment
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
                <Input
                  autoComplete="cc-name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </Field>
              <Field label="Expiry (MM/YY)">
                <Input
                  placeholder="08/28"
                  autoComplete="cc-exp"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
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
                Card number and CVV are never sent to or stored by the server.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-danger-700">
              {error}
            </p>
          )}
        </Card>

        <FareSummaryCard
          title="Payment summary"
          rows={[
            {
              label: "Base fare",
              hint: `${passengers.length} traveller${passengers.length > 1 ? "s" : ""}`,
              amount: baseFare,
            },
            { label: "Taxes and fees", amount: taxes },
            {
              label: "Seat charges",
              hint: selectedSeats.map((seat) => seat.seatNumber).join(", ") || undefined,
              amount: seatCharges,
            },
          ]}
          total={totalPayable}
          totalLabel="Total payable"
          note="Mock payment gateway — your card details are never stored."
        >
          <Button
            className="hidden w-full lg:inline-flex"
            size="lg"
            variant="accent"
            disabled={submitting}
            onClick={() => void handlePay()}
          >
            {submitting ? "Processing payment…" : `Pay ${formatINR(totalPayable)}`}
          </Button>
        </FareSummaryCard>
      </div>
      <StickyActionBar
        total={formatINR(totalPayable)}
        ctaLabel={`Pay ${formatINR(totalPayable)}`}
        loading={submitting}
        onClick={() => void handlePay()}
      />
    </Container>
  );
}
