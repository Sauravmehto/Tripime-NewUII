import { apiClient } from "./client";
import type { Booking, BookingDraftPayload, DocumentRequirements } from "@/types";

/** Travel documents the itinerary needs (public). */
export async function getDocumentRequirements(flightId: string, returnFlightId?: string | null): Promise<DocumentRequirements> {
  const { data } = await apiClient.get<DocumentRequirements>("/api/bookings/requirements", {
    params: { flightId, returnFlightId: returnFlightId || undefined },
  });
  return data;
}

/** Creates or updates this checkout's draft with traveller details (signed in). */
export async function saveBookingDraft(payload: BookingDraftPayload): Promise<Booking> {
  const { data } = await apiClient.post<Booking>("/api/bookings", payload);
  return data;
}

export async function reviewBooking(bookingId: string, expectedTotal: number): Promise<{ booking: Booking; priceChanged: boolean }> {
  const { data } = await apiClient.post<{ booking: Booking; priceChanged: boolean }>(
    `/api/bookings/${bookingId}/review`,
    { expectedTotal },
  );
  return data;
}

/** Submits the reviewed booking as a request. Takes no payment and issues no ticket. */
export async function submitBookingRequest(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.post<Booking>(`/api/bookings/${bookingId}/submit`, {});
  return data;
}

export async function getBooking(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.get<Booking>(`/api/bookings/${bookingId}`);
  return data;
}

export async function listMyBookings(): Promise<Booking[]> {
  const { data } = await apiClient.get<Booking[]>("/api/bookings");
  return data;
}

export type BookingDocument = "invoice" | "ticket";

const FILENAMES: Record<BookingDocument, string> = { invoice: "Invoice", ticket: "E-ticket" };

/** Client-only — downloads the signed-in customer's invoice/quote or issued e-ticket. */
export async function downloadBookingDocument(bookingId: string, document: BookingDocument): Promise<void> {
  const response = await apiClient.get(`/api/bookings/${bookingId}/${document}`, { responseType: "blob" });
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
