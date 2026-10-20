"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { House, ListChecks, MessageCircle, Phone, Plane } from "lucide-react";
import { getBooking } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { getPaymentConfig } from "@/lib/api/payments";
import { telLink } from "@/lib/contact";
import { bookingWhatsAppLink } from "@/lib/whatsapp-booking";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import {
  BookingFareSummary,
  BookingNextSteps,
  BookingStatusHeader,
  BookingTicket,
} from "@/components/booking/booking-ticket";
import { BookingDocumentButtons } from "@/components/booking/booking-document-buttons";
import { buttonClasses } from "@/components/ui/button";
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

  const secondary = buttonClasses({ variant: "outline", size: "md", className: "gap-1.5 whitespace-nowrap" });
  const quiet = buttonClasses({ variant: "ghost", size: "md", className: "gap-1.5" });

  return (
    <div className="relative overflow-hidden bg-primary-50">
      {/* Faint aviation motif behind the ticket. */}
      <Plane
        aria-hidden
        className="pointer-events-none absolute -right-10 top-6 size-64 rotate-45 text-primary-100/70"
        strokeWidth={0.75}
      />
      <Container narrow className="relative space-y-4 py-5 sm:py-6">
        {!booking && !error && (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-12 w-80" />
            <Skeleton className="h-64" />
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700">
            {error}{" "}
            <Link href="/my-booking" className="font-semibold underline">
              My bookings
            </Link>
          </div>
        )}

        {booking && (
          <>
            <BookingStatusHeader booking={booking} />
            <BookingTicket booking={booking} />

            <div className="grid gap-4 md:grid-cols-2">
              <BookingFareSummary booking={booking} />
              <BookingNextSteps booking={booking} />
            </div>

            <nav
              aria-label="Booking actions"
              className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-white p-3 sm:flex sm:flex-wrap sm:items-center"
            >
              <div className="col-span-2 flex flex-wrap gap-2 sm:contents [&>button]:flex-1 [&>button]:whitespace-nowrap sm:[&>button]:flex-none">
                <BookingDocumentButtons booking={booking} size="md" />
              </div>
              {whatsapp && (
                <a
                  href={bookingWhatsAppLink(whatsapp, booking)}
                  target="_blank"
                  rel="noreferrer"
                  className={`${secondary} col-span-2 sm:col-auto`}
                >
                  <MessageCircle className="size-4 text-success-700" aria-hidden />
                  Message us on WhatsApp
                </a>
              )}
              <a href={telLink()} className={secondary}>
                <Phone className="size-4" aria-hidden />
                Call support
              </a>
              <Link href="/my-booking" className={secondary}>
                <ListChecks className="size-4" aria-hidden />
                <span className="sm:hidden">My bookings</span>
                <span className="hidden sm:inline">View my bookings</span>
              </Link>
              <Link href="/" className={`${quiet} col-span-2 sm:col-auto sm:ml-auto`}>
                <House className="size-4" aria-hidden />
                Back to home
              </Link>
            </nav>

            {whatsapp && (
              <p className="text-[11px] text-ink-subtle">
                The WhatsApp button opens a message for you to send yourself; it includes only your request reference and
                trip summary. We don&apos;t send automated WhatsApp messages.
              </p>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
