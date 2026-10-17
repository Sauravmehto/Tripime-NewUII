"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { getBooking } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { getPaymentConfig } from "@/lib/api/payments";
import { telLink } from "@/lib/contact";
import { bookingWhatsAppLink } from "@/lib/whatsapp-booking";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { BookingSummaryCard } from "@/components/booking/booking-summary-card";
import { BookingDocumentButtons } from "@/components/booking/booking-document-buttons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import type { Booking } from "@/types";

export function ConfirmationView({ reference }: { reference?: string }) {
  const params = useSearchParams();
  const bookingId = reference ?? params.get("ref") ?? "";
  const { reset } = useBooking();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!bookingId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- invalid link, nothing to load
      setError("This link is missing the booking reference. Open My Booking to see your requests.");
      return;
    }
    getBooking(bookingId)
      .then((data) => {
        if (cancelled) return;
        setBooking(data);
        // The checkout is finished once submitted — clear the draft so a new search starts fresh.
        if (data.state !== "DRAFT" && data.state !== "PASSENGERS_COMPLETED" && data.state !== "REVIEWED") reset();
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    getPaymentConfig()
      .then((c) => !cancelled && setWhatsapp(c.whatsappNumber))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookingId, reset]);

  return (
    <Container className="py-8">
      {!booking && !error && (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-danger-700">
          {error}{" "}
          <Link href="/my-booking" className="font-semibold underline">
            My bookings
          </Link>
        </div>
      )}
      {booking && (
        <BookingSummaryCard
          booking={booking}
          footer={
            <>
              <BookingDocumentButtons booking={booking} />
              {whatsapp && (
                <a href={bookingWhatsAppLink(whatsapp, booking)} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="lg" className="w-full">
                    <MessageCircle className="size-4" aria-hidden />
                    Message us on WhatsApp
                  </Button>
                </a>
              )}
              <a href={telLink()}>
                <Button variant="ghost" size="lg" className="w-full">
                  <Phone className="size-4" aria-hidden /> Call support
                </Button>
              </a>
              <Link href="/my-booking">
                <Button variant="ghost" size="lg" className="w-full">
                  View my bookings
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="lg" className="w-full">
                  Back to home
                </Button>
              </Link>
            </>
          }
        />
      )}
      {booking && whatsapp && (
        <p className="mt-3 text-xs text-ink-subtle">
          The WhatsApp button opens a message for you to send yourself; it includes only your request reference and
          trip summary. We don&apos;t send automated WhatsApp messages.
        </p>
      )}
    </Container>
  );
}
