"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useBooking, type BookingProgress } from "@/context/booking-provider";
import { useCustomerSession } from "@/context/customer-session-provider";
import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/card";
import { loginHref } from "@/lib/safe-redirect";
import { flightsHref } from "@/lib/flights/search-params";

/** Where to send someone who opens `path` before finishing the earlier steps (null = allowed). */
export function blockedRedirect(
  path: string,
  hasFlight: boolean,
  progress: BookingProgress,
): string | null {
  if (path.startsWith("/booking/confirmation")) return null;
  // A submitted request can't be edited here; show where it stands.
  if (progress.submittedId) return `/booking/confirmation?ref=${encodeURIComponent(progress.submittedId)}`;
  if (!hasFlight) return "/";
  if (path.startsWith("/booking/review") && !progress.passengersDone) return "/booking/passengers";
  if (path.startsWith("/booking/seats") && !progress.reviewed) return progress.passengersDone ? "/booking/review" : "/booking/passengers";
  if (path.startsWith("/booking/payment") && !progress.seatsDone) {
    return progress.reviewed ? "/booking/seats" : progress.passengersDone ? "/booking/review" : "/booking/passengers";
  }
  return null;
}

/**
 * Every booking page goes through here: sign-in is required (guests are sent to
 * /login and brought back with their selection intact), and steps can't be
 * skipped.
 */
export function BookingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/booking/passengers";
  const query = useSearchParams().toString();
  const { session } = useCustomerSession();
  const { hydrated, selectedFlight, search, progress } = useBooking();

  const ready = hydrated && session !== null;
  // A temporary password from support must be replaced first; the login page shows that step.
  const signedIn = Boolean(session?.authenticated && !session.mustChangePassword);
  const redirect = ready && signedIn ? blockedRedirect(pathname, Boolean(selectedFlight && search), progress) : null;

  useEffect(() => {
    if (!ready) return;
    if (!signedIn) {
      router.replace(loginHref(query ? `${pathname}?${query}` : pathname));
    } else if (redirect) {
      router.replace(redirect === "/" && search ? flightsHref(search) : redirect);
    }
  }, [ready, signedIn, redirect, pathname, query, router, search]);

  if (!ready || !signedIn || redirect) {
    return (
      <Container className="space-y-4 py-8" aria-busy>
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
        <p className="sr-only">Loading your booking…</p>
      </Container>
    );
  }
  return <>{children}</>;
}
