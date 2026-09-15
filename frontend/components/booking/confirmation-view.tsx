"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { downloadInvoice, getBooking } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { BookingSummaryCard } from "@/components/booking/booking-summary-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import type { Booking } from "@/types";

export function ConfirmationView() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const { reset } = useBooking();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!bookingId) return;
      setLoading(true);
      try {
        const data = await getBooking(bookingId);
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
  }, [bookingId, reset]);

  async function handleDownload() {
    if (!bookingId) return;
    setDownloading(true);
    setError("");
    try {
      await downloadInvoice(bookingId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

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
              <Button size="lg" disabled={downloading} onClick={() => void handleDownload()}>
                {downloading ? "Preparing PDF…" : "Download invoice"}
              </Button>
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
