import type { Metadata } from "next";
import { SeatsView } from "@/components/booking/seats-view";

export const metadata: Metadata = { title: "Select seats" };

export default function SeatsPage() {
  return <SeatsView />;
}
