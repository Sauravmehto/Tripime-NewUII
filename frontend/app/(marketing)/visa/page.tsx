import type { Metadata } from "next";
import { VisaPageView } from "@/components/visa/visa-page-view";

export const metadata: Metadata = {
  title: "Visa assistance",
  description:
    "Online visa applications on Tripime are launching soon. Call or WhatsApp our team for help today.",
};

export default function VisaPage() {
  return <VisaPageView />;
}
