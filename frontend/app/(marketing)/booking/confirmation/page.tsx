import { Suspense } from "react";
import type { Metadata } from "next";
import { ConfirmationView } from "@/components/booking/confirmation-view";

export const metadata: Metadata = { title: "Booking request", robots: { index: false } };

/** /booking/confirmation?ref=TRQ-… — request status (not a ticket unless issued). */
export default function ConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationView />
    </Suspense>
  );
}
