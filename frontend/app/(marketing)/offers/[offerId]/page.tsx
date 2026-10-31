import type { Metadata } from "next";
import { OfferDetailView } from "@/components/offers/offer-detail-view";

export const metadata: Metadata = {
  title: "Offer details",
};

export default function OfferDetailPage() {
  return <OfferDetailView />;
}
