"use client";

import { useEffect, useState } from "react";
import { getFlightCatalog } from "@/lib/api/flights";
import { getErrorMessage } from "@/lib/api/client";
import type { CatalogAirport, FlightCatalog } from "@/types";

// One request per page load, shared by every search form on the page.
let cached: FlightCatalog | null = null;
let inflight: Promise<FlightCatalog> | null = null;

function loadCatalog(): Promise<FlightCatalog> {
  if (cached) return Promise.resolve(cached);
  inflight ??= getFlightCatalog()
    .then((catalog) => {
      cached = catalog;
      return catalog;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export interface FlightCatalogState {
  catalog: FlightCatalog | null;
  error: string;
  airportByCode: (code: string) => CatalogAirport | undefined;
}

export function useFlightCatalog(): FlightCatalogState {
  const [catalog, setCatalog] = useState<FlightCatalog | null>(cached);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    loadCatalog()
      .then((result) => {
        if (!cancelled) setCatalog(result);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    catalog,
    error,
    airportByCode: (code) => catalog?.airports.find((a) => a.code === code),
  };
}

