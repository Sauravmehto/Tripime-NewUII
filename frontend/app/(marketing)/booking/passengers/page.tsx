import type { Metadata } from "next";
import { PassengersView } from "@/components/booking/passengers-view";

export const metadata: Metadata = { title: "Passenger details" };

export default function PassengersPage() {
  return <PassengersView />;
}
