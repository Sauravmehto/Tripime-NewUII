import { apiClient } from "./client";
import type { Booking, BookingCreatePayload, BookingPayPayload } from "@/types";

/** Creates the booking awaiting payment (seats held). Same checkoutKey → same booking. */
export async function createBooking(payload: BookingCreatePayload): Promise<Booking> {
  const { data } = await apiClient.post<Booking>("/api/bookings", payload);
  return data;
}

/** Asks the server to take payment for the booking's own total. */
export async function payBooking(bookingId: string, token: string, payload: BookingPayPayload): Promise<Booking> {
  const { data } = await apiClient.post<Booking>(`/api/bookings/${bookingId}/pay`, payload, {
    params: { token },
  });
  return data;
}

export async function getBooking(bookingId: string, token: string): Promise<Booking> {
  const { data } = await apiClient.get<Booking>(`/api/bookings/${bookingId}`, { params: { token } });
  return data;
}

export async function lookupBooking(reference: string, contact: string): Promise<Booking> {
  const { data } = await apiClient.post<Booking>("/api/bookings/lookup", { reference, contact });
  return data;
}

export type BookingDocument = "invoice" | "ticket";

const FILENAMES: Record<BookingDocument, string> = { invoice: "Invoice", ticket: "E-ticket" };

/** Client-only — downloads the booking's invoice or e-ticket PDF. */
export async function downloadBookingDocument(
  bookingId: string,
  token: string,
  document: BookingDocument,
): Promise<void> {
  const response = await apiClient.get(`/api/bookings/${bookingId}/${document}`, {
    params: { token },
    responseType: "blob",
  });
  saveBlob(response.data, `${FILENAMES[document]}-${bookingId}.pdf`);
}

export function saveBlob(data: BlobPart, filename: string) {
  const blob = new Blob([data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

