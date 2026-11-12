"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nearestCity } from "@/lib/packages/search-options";

export type CityStatus = "idle" | "locating" | "found" | "outside" | "denied" | "unavailable";

/**
 * Finds the nearest departure city from the browser's location. The coordinates stay on the device:
 * they are matched against a built-in city list and never sent anywhere.
 *
 * The prompt only appears when `locate()` is called (a tap). If the visitor already allowed location for
 * this site, detection also runs once on load, silently.
 */
export function useCurrentCity(onFound: (city: string) => void) {
  const [status, setStatus] = useState<CityStatus>("idle");
  const [city, setCity] = useState<string | null>(null);
  const onFoundRef = useRef(onFound);
  const alive = useRef(true);

  useEffect(() => {
    onFoundRef.current = onFound;
  });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!alive.current) return;
        const hit = nearestCity(position.coords.latitude, position.coords.longitude);
        if (hit) {
          setCity(hit.city.name);
          setStatus("found");
          onFoundRef.current(hit.city.name);
        } else {
          setStatus("outside");
        }
      },
      (error) => {
        if (!alive.current) return;
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (!cancelled && result.state === "granted") locate();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [locate]);

  return { status, city, locate };
}
