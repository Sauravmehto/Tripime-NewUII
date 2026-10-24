"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Armchair, ArrowLeft, Info } from "lucide-react";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { FlightRouteBar } from "@/components/flights/flight-route-bar";
import { BookingPriceSummary } from "@/components/booking/booking-price-summary";
import { Stepper } from "@/components/booking/stepper";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { useDraftBooking } from "@/lib/flights/use-draft-booking";

/**
 * No airline seat-map integration exists, so we don't show a seat map or
 * claim any seat is reserved. Travellers acknowledge and continue.
 */
export function SeatsView() {
  const router = useRouter();
  const { setSeatsAcknowledged } = useBooking();
  const { booking } = useDraftBooking();

  function next() {
    setSeatsAcknowledged(true);
    router.push("/booking/payment");
  }

  if (!booking) {
    return (
      <Container className="space-y-4 py-8" aria-busy>
        <Skeleton className="h-16" />
        <Skeleton className="h-48" />
      </Container>
    );
  }

  return (
    <Container className="pb-8 pt-6">
      <Stepper current="seats" variant="compact" className="lg:hidden" />
      <Stepper current="seats" className="hidden lg:block" />
      <FlightRouteBar flight={booking.flight} returnFlight={booking.returnFlight} counts={booking} className="mb-4 mt-4" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card padded={false} className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Armchair className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-bold text-ink">Seats are assigned at check-in</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Online seat selection isn&apos;t available yet, so no seats are reserved or charged now. The airline
                assigns seats when you check in. If you need seats together or have a special request, mention it
                when our team contacts you.
              </p>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 text-xs text-ink-muted">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            Infants travel on an adult&apos;s lap and don&apos;t need a seat.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/booking/review">
              <Button variant="outline">
                <ArrowLeft className="size-4" aria-hidden /> Back to review
              </Button>
            </Link>
            <Button variant="accent" className="hidden lg:inline-flex" onClick={next}>
              Continue to payment
            </Button>
          </div>
        </Card>
        <BookingPriceSummary booking={booking} note="No seat charges — seats are assigned by the airline." />
      </div>
      <StickyActionBar total={formatINR(booking.totalAmount)} ctaLabel="Continue to payment" onClick={next} />
    </Container>
  );
}
