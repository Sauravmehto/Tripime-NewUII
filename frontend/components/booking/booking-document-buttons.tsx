"use client";

import { useState } from "react";
import { FileText, Ticket } from "lucide-react";
import { downloadBookingDocument, type BookingDocument } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/types";

/** E-ticket and invoice downloads for a booking the customer has the token for. */
export function BookingDocumentButtons({ booking }: { booking: Booking }) {
  const [busy, setBusy] = useState<BookingDocument | null>(null);
  const [error, setError] = useState("");
  const ticketReady = booking.paymentStatus === "paid" && booking.bookingStatus === "confirmed";

  async function download(document: BookingDocument) {
    setBusy(document);
    setError("");
    try {
      await downloadBookingDocument(booking.bookingId, booking.accessToken, document);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button size="lg" disabled={busy !== null} onClick={() => void download("ticket")}>
        <Ticket className="size-4" aria-hidden />
        {busy === "ticket" ? "Preparing PDF…" : ticketReady ? "Download e-ticket" : "Download booking confirmation"}
      </Button>
      <Button size="lg" variant="outline" disabled={busy !== null} onClick={() => void download("invoice")}>
        <FileText className="size-4" aria-hidden />
        {busy === "invoice" ? "Preparing PDF…" : "Download invoice"}
      </Button>
      {error && (
        <p role="alert" className="basis-full text-sm text-danger-700">
          {error}
        </p>
      )}
    </>
  );
}
