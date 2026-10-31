"use client";

import { useCallback, useEffect, useState } from "react";
import { listOffers, type OfferItem } from "@/lib/offers/offers";

/** Loads live offers. `offers` is null while loading; `retry` re-fetches after a failure. */
export function useOffers(failureMessage: string) {
  const [offers, setOffers] = useState<OfferItem[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    listOffers()
      .then((items) => {
        if (active) setOffers(items);
      })
      .catch(() => {
        if (active) setError(failureMessage);
      });
    return () => {
      active = false;
    };
  }, [attempt, failureMessage]);

  const retry = useCallback(() => {
    setError("");
    setOffers(null);
    setAttempt((value) => value + 1);
  }, []);

  return { offers, error, retry };
}
