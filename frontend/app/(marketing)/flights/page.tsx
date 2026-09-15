import type { Metadata } from "next";
import { FlightsPageClient } from "@/components/flights/flights-page-client";

export const metadata: Metadata = { title: "Flight search" };

export default function FlightsPage() {
  return <FlightsPageClient />;
}
