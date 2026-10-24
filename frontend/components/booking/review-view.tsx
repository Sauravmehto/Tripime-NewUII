"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Armchair, Luggage, Mail, Pencil, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { FlightItineraryCard } from "@/components/flights/flight-itinerary-card";
import { FlightRouteBar } from "@/components/flights/flight-route-bar";
import { BookingPriceSummary } from "@/components/booking/booking-price-summary";
import { Stepper } from "@/components/booking/stepper";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { reviewBooking } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { formatINR } from "@/lib/format";
import { passengerTypeLabel } from "@/lib/flights/pricing";
import { flightsHref, travellersLabel } from "@/lib/flights/search-params";
import { useDraftBooking } from "@/lib/flights/use-draft-booking";

export function ReviewView() {
  const router = useRouter();
  const { search } = useBooking();
  const { booking, error: loadError, apply } = useDraftBooking();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [priceNotice, setPriceNotice] = useState<string | null>(null);

  async function handleContinue() {
    if (!booking || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await reviewBooking(booking.bookingId, booking.totalAmount);
      apply(result.booking);
      if (result.priceChanged) {
        // Show the new fare and ask again — never move on with a stale price.
        setPriceNotice(
          `The fare changed from ${formatINR(booking.totalAmount)} to ${formatINR(result.booking.totalAmount)}. Please check the new total and continue again.`,
        );
        return;
      }
      setPriceNotice(null);
      router.push("/booking/seats");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <Container className="py-8">
        <p role="alert" className="rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700">
          Couldn&apos;t load your booking: {loadError}{" "}
          <Link href="/booking/passengers" className="font-semibold underline">
            Back to traveller details
          </Link>
        </p>
      </Container>
    );
  }
  if (!booking || !search) {
    return (
      <Container className="space-y-4 py-8" aria-busy>
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </Container>
    );
  }

  const roundTrip = Boolean(booking.returnFlight);
  const legs = [booking.flight, ...(booking.returnFlight ? [booking.returnFlight] : [])];

  return (
    <Container className="pb-8 pt-6">
      <Stepper current="review" variant="compact" className="lg:hidden" />
      <Stepper current="review" className="hidden lg:block" />
      <FlightRouteBar
        flight={booking.flight}
        returnFlight={booking.returnFlight}
        counts={booking}
        changeFlightTo={flightsHref(search)}
        className="mb-4 mt-4"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          <h1 className="text-lg font-bold text-ink">Review your booking</h1>
          {priceNotice && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-500" aria-hidden />
              {priceNotice}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </p>
          )}
          <FlightItineraryCard flight={booking.flight} title={roundTrip ? "Departing flight" : undefined} />
          {booking.returnFlight && <FlightItineraryCard flight={booking.returnFlight} title="Return flight" />}

          <Card padded={false} className="p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <UserRound className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink">Travellers</h2>
                  <p className="text-xs text-ink-muted">{travellersLabel(booking)}</p>
                </div>
              </div>
              <Link href="/booking/passengers">
                <Button variant="outline" size="sm">
                  <Pencil className="size-3.5" aria-hidden />
                  Edit passenger details
                </Button>
              </Link>
            </div>
            <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {booking.passengers.map((p, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <span className="min-w-0 font-medium text-ink">
                    {p.title} {p.firstName} {p.lastName}
                    <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700">
                      {passengerTypeLabel(p.type)}
                    </span>
                  </span>
                  <span className="text-right text-xs text-ink-muted">
                    Born {p.dateOfBirth}
                    {p.passportNumber && <span className="block font-mono">Passport ending {p.passportNumber.slice(-4)}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <p className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-ink-muted">
                <Mail className="size-3.5 text-ink-subtle" aria-hidden />
                <span className="truncate">{booking.contact.email}</span>
              </p>
              <p className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-ink-muted">
                <Phone className="size-3.5 text-ink-subtle" aria-hidden />
                <span className="truncate">
                  {booking.contact.countryCode} {booking.contact.phone}
                </span>
              </p>
            </div>
          </Card>

          <Card padded={false} className="p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Baggage &amp; fare conditions</h2>
            <ul className="space-y-2 text-sm text-ink-muted">
              {legs.map((f) => (
                <li key={f.id} className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="font-semibold text-ink">
                    {f.origin.code} → {f.destination.code} · {f.flightNumber} · {f.cabinClass}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Luggage className="size-3.5" aria-hidden /> Cabin {f.baggage.cabin} · Check-in {f.baggage.checkIn} per traveller
                    </span>
                    <span className={`inline-flex items-center gap-1 ${f.refundable ? "text-success-700" : "text-danger-700"}`}>
                      <ShieldCheck className="size-3.5" aria-hidden />
                      {f.refundable ? "Refundable (airline & Tripime fees apply)" : "Non-refundable fare"}
                    </span>
                  </p>
                </li>
              ))}
              <li className="flex items-start gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-xs">
                <Armchair className="mt-px size-3.5 shrink-0" aria-hidden />
                Seats aren&apos;t selected online yet — the airline assigns them at check-in.
              </li>
            </ul>
          </Card>
        </div>

        <BookingPriceSummary booking={booking} note="Priced by our server from current fares. No fees are added later.">
          <Button size="lg" variant="accent" className="hidden w-full lg:inline-flex" disabled={busy} onClick={() => void handleContinue()}>
            {busy ? "Checking the fare…" : priceNotice ? "Accept new fare & continue" : "Confirm & continue"}
          </Button>
          <Link href={flightsHref(search)} className="hidden text-center text-xs font-semibold text-primary-700 lg:block">
            Change flight
          </Link>
        </BookingPriceSummary>
      </div>
      <StickyActionBar
        total={formatINR(booking.totalAmount)}
        ctaLabel={priceNotice ? "Accept new fare" : "Confirm & continue"}
        loading={busy}
        onClick={() => void handleContinue()}
      />
    </Container>
  );
}
