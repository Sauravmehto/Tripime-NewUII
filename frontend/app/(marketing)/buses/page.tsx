import type { Metadata } from "next";
import { BusesPageView } from "@/components/coming-soon/product-page";

export const metadata: Metadata = {
  title: "Buses",
  description:
    "Bus booking on Tripime is launching soon. Call or WhatsApp our travel experts to book coaches today.",
};

export default function BusesPage() {
  return <BusesPageView />;
}
