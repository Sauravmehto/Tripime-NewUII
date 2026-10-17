"use client";

import { useState } from "react";
import { FileText, Ticket } from "lucide-react";
import { downloadBookingDocument, type BookingDocument } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/types";

/** Quote/invoice and (only once issued) e-ticket downloads for the signed-in owner. */
export function BookingDocumentButtons({ booking }: { booking: Booking }) {
  const [busy, setBusy] = useState<BookingDocument | null>(null);
  const [error, setError] = useState("");
  const issued = booking.state === "TICKET_ISSUED";
  const paid = booking.paymentStatus === "paid";

  async function download(document: BookingDocument) {
    setBusy(document);
    setError("");
    try {
      await downloadBookingDocument(booking.bookingId, document);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {issued && (
        <Button size="lg" disabled={busy !== null} onClick={() => void download("ticket")}>
          <Ticket className="size-4" aria-hidden />
          {busy === "ticket" ? "Preparing PDF…" : "Download e-ticket"}
        </Button>
      )}
      <Button size="lg" variant="outline" disabled={busy !== null} onClick={() => void download("invoice")}>
        <FileText className="size-4" aria-hidden />
        {busy === "invoice" ? "Preparing PDF…" : paid ? "Download invoice" : "Download quote"}
      </Button>
      {error && (
        <p role="alert" className="basis-full text-sm text-danger-700">
          {error}
        </p>
      )}
    </>
  );
}
