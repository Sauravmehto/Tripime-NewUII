"use client";

import { useCallback, useEffect, useState } from "react";
import { getBooking } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { useBooking } from "@/context/booking-provider";
import type { Booking } from "@/types";

/** The current checkout's booking as stored (and priced) by the server. */
export function useDraftBooking() {
  const { checkout, setCheckout } = useBooking();
  const bookingId = checkout?.bookingId;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!bookingId) return;
    setError("");
    try {
      setBooking(await getBooking(bookingId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [bookingId]);

  useEffect(() => {
    let cancelled = false;
    if (!bookingId) return;
    getBooking(bookingId)
      .then((b) => !cancelled && setBooking(b))
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  /** Keep local state and the step guard in sync with a server response. */
  const apply = useCallback(
    (next: Booking) => {
      setBooking(next);
      if (checkout) setCheckout({ ...checkout, bookingId: next.bookingId, state: next.state });
    },
    [checkout, setCheckout],
  );

  return { booking, error, reload: load, apply };
}
