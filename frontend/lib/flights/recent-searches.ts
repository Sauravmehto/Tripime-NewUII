"use client";

import { useSyncExternalStore } from "react";
import type { SearchParams } from "@/types";

// Per-viewer convenience only — losing it (private mode, cleared storage) is harmless.
const KEY = "tripime_recent_flight_searches";
const LIMIT = 4;
const EMPTY: SearchParams[] = [];

let cacheRaw: string | null = null;
let cacheValue: SearchParams[] = EMPTY;
const listeners = new Set<() => void>();

function read(): SearchParams[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      cacheValue = Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      cacheValue = EMPTY;
    }
  }
  return cacheValue;
}

function sameTrip(a: SearchParams, b: SearchParams) {
  return (
    a.origin === b.origin &&
    a.destination === b.destination &&
    a.date === b.date &&
    a.returnDate === b.returnDate
  );
}

export function saveRecentSearch(search: SearchParams) {
  const next = [search, ...read().filter((s) => !sameTrip(s, search))].slice(0, LIMIT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — nothing to do
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

/** Recent searches whose departure is still bookable. */
export function useRecentSearches(minDate: string | undefined): SearchParams[] {
  const all = useSyncExternalStore(subscribe, read, () => EMPTY);
  return minDate ? all.filter((s) => s.date >= minDate) : EMPTY;
}
