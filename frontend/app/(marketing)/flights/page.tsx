import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FLIGHTS_ENABLED } from "@/lib/features";
import { FlightsPageClient } from "@/components/flights/flights-page-client";

export const metadata: Metadata = { title: "Flight search" };

export default function FlightsPage() {
  if (!FLIGHTS_ENABLED) {
    redirect("/packages");
  }
  return <FlightsPageClient />;
}
