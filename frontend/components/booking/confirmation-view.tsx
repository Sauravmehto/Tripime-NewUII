"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { getBooking } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { BookingSummaryCard } from "@/components/booking/booking-summary-card";
import { BookingDocumentButtons } from "@/components/booking/booking-document-buttons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import type { Booking } from "@/types";

export function ConfirmationView() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const token = useSearchParams().get("token") ?? "";
  const { reset } = useBooking();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!bookingId) return;
      if (!token) {
        setError("This confirmation link is incomplete. Use My Booking with your booking ID and email to find it.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getBooking(bookingId, token);
        if (!cancelled) {
          setBooking(data);
          reset();
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [bookingId, token, reset]);

  return (
    <Container className="py-8">
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-danger-700">
          {error}
        </div>
      )}
      {booking && (
        <BookingSummaryCard
          booking={booking}
          footer={
            <>
              <BookingDocumentButtons booking={booking} />
              <Link href="/my-booking">
                <Button variant="outline" size="lg">
                  Find this booking later
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="lg">
                  Back to home
                </Button>
              </Link>
            </>
          }
        />
      )}
    </Container>
  );
}
