import type { Metadata } from "next";
import { Suspense } from "react";
import { OffersPageView } from "@/components/offers/offers-page-view";

export const metadata: Metadata = {
  title: "Offers Zone",
  description:
    "Discover Tripime travel offers across holidays, hotels, flights, buses, bank deals and activities.",
};

export default function OffersPage() {
  return (
    <Suspense fallback={null}>
      <OffersPageView />
    </Suspense>
  );
}
