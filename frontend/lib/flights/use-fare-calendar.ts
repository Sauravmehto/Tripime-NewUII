"use client";

import { useEffect, useState } from "react";
import { getFareCalendar } from "@/lib/api/flights";
import type { CabinClass } from "@/types";

type Fares = Record<string, number>;

const cache = new Map<string, Promise<Fares>>();

function loadMonth(origin: string, destination: string, month: string, cabin: CabinClass) {
  const key = `${origin}-${destination}-${month}-${cabin}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = getFareCalendar(origin, destination, month, cabin)
      .then((res) => Object.fromEntries(res.days.map((d) => [d.date, d.lowestFare])))
      .catch((err) => {
        cache.delete(key); // allow a retry on the next open
        throw err;
      });
    cache.set(key, pending);
  }
  return pending;
}

/** Lowest adult fare per date across `months` for one direction. Missing dates have no flights. */
export function useFareCalendar(
  origin: string,
  destination: string,
  months: string[],
  cabin: CabinClass,
  enabled: boolean,
) {
  const [state, setState] = useState<{ key: string; fares: Fares; loading: boolean }>({
    key: "",
    fares: {},
    loading: false,
  });
  const ready = enabled && Boolean(origin && destination) && origin !== destination;
  const key = ready ? `${origin}-${destination}-${cabin}-${months.join(",")}` : "";

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    Promise.allSettled(months.map((m) => loadMonth(origin, destination, m, cabin))).then(
      (results) => {
        if (cancelled) return;
        const fares: Fares = {};
        for (const r of results) if (r.status === "fulfilled") Object.assign(fares, r.value);
        setState({ key, fares, loading: false });
      },
    );
    return () => {
      cancelled = true;
    };
    // `key` already encodes origin/destination/months/cabin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state.key === key;
  return { fares: current ? state.fares : {}, loading: Boolean(key) && !current };
}
