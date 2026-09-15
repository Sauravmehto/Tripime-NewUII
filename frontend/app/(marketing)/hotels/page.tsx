import type { Metadata } from "next";
import { HotelsPageView } from "@/components/coming-soon/product-page";

export const metadata: Metadata = {
  title: "Hotels",
  description:
    "Hotel booking on Tripime is launching soon. Call or WhatsApp our travel experts to book stays today.",
};

export default function HotelsPage() {
  return <HotelsPageView />;
}
