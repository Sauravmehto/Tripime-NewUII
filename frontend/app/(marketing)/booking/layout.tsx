import { Suspense, type ReactNode } from "react";
import { BookingGate } from "@/components/booking/booking-gate";

/** All /booking/* pages require sign-in and completed earlier steps. */
export default function BookingLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <BookingGate>{children}</BookingGate>
    </Suspense>
  );
}
