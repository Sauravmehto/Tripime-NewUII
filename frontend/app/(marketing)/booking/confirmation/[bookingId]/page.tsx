import { Suspense } from "react";
import type { Metadata } from "next";
import { ConfirmationView } from "@/components/booking/confirmation-view";

export const metadata: Metadata = { title: "Your booking" };

export default function ConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationView />
    </Suspense>
  );
}
