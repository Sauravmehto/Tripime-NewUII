"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Pencil, Phone, UserRound } from "lucide-react";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { FareSummaryCard } from "@/components/flights/fare-summary-card";
import { FlightItineraryCard } from "@/components/flights/flight-itinerary-card";
import { FlightRouteBar } from "@/components/flights/flight-route-bar";
import { Stepper } from "@/components/booking/stepper";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { fareSummaryRows, passengerTypeLabel, priceTrip } from "@/lib/flights/pricing";
import { flightsHref, travellersLabel } from "@/lib/flights/search-params";

export function ReviewView() {
  const router = useRouter();
  const { search, selectedFlight, selectedReturnFlight, passengers, contact } = useBooking();

  useEffect(() => {
    if (!selectedFlight || !search || passengers.length === 0 || !contact.email) {
      router.replace("/");
    }
  }, [selectedFlight, search, passengers, contact, router]);

  if (!selectedFlight || !search) return null;

  const roundTrip = Boolean(selectedReturnFlight);
  const price = priceTrip(selectedFlight, selectedReturnFlight, search);
  const total = price.total;

  return (
    <Container className="pb-24 pt-6 lg:pb-8">
      <Stepper current="review" variant="compact" className="lg:hidden" />
      <Stepper current="review" className="hidden lg:block" />
      <FlightRouteBar
        flight={selectedFlight}
        returnFlight={selectedReturnFlight}
        counts={search}
        changeFlightTo={flightsHref(search)}
        className="mb-4 mt-4"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          <FlightItineraryCard flight={selectedFlight} title={roundTrip ? "Departing flight" : undefined} />
          {selectedReturnFlight && <FlightItineraryCard flight={selectedReturnFlight} title="Return flight" />}
          <Card padded={false} className="p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <UserRound className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink">Travellers</h2>
                  <p className="text-xs text-ink-muted">
                    {travellersLabel(search)} on this booking
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push("/booking/passengers")}>
                <Pencil className="size-3.5" aria-hidden />
                Edit
              </Button>
            </div>
            <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {passengers.map((passenger, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 font-medium text-ink">
                    {passenger.title} {passenger.firstName} {passenger.lastName}
                    <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700">
                      {passengerTypeLabel(passenger.type)}
                    </span>
                  </span>
                  <span className="text-right text-xs text-ink-muted">
                    {passenger.gender} · {passenger.dateOfBirth}
                    {passenger.passportNumber && (
                      <span className="block font-mono">Passport {passenger.passportNumber}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <p className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-ink-muted">
                <Mail className="size-3.5 text-ink-subtle" aria-hidden />
                <span className="truncate">{contact.email}</span>
              </p>
              <p className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-ink-muted">
                <Phone className="size-3.5 text-ink-subtle" aria-hidden />
                <span className="truncate">{contact.phone}</span>
              </p>
            </div>
          </Card>
        </div>
        <FareSummaryCard
          rows={fareSummaryRows(price, roundTrip)}
          total={total}
          note="No booking is created until payment is completed."
        >
          <Button
            size="lg"
            variant="accent"
            className="hidden w-full lg:inline-flex"
            onClick={() => router.push("/booking/seats")}
          >
            Confirm &amp; continue
          </Button>
        </FareSummaryCard>
      </div>
      <StickyActionBar
        total={formatINR(total)}
        ctaLabel="Confirm & continue"
        onClick={() => router.push("/booking/seats")}
      />
    </Container>
  );
}
