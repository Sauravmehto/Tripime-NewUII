import type { Metadata } from "next";
import { VisaPageView } from "@/components/visa/visa-page-view";

export const metadata: Metadata = {
  title: "Visa assistance",
  description:
    "Get visa help from a Tripime expert — tourist, business, and transit. Online applications launching soon; enquire by WhatsApp or call today.",
};

export default function VisaPage() {
  return <VisaPageView />;
}
