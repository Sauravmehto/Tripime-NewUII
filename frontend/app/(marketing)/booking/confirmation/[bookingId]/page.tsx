import type { Metadata } from "next";
import { ConfirmationView } from "@/components/booking/confirmation-view";

export const metadata: Metadata = { title: "Booking confirmed" };

export default function ConfirmationPage() {
  return <ConfirmationView />;
}
