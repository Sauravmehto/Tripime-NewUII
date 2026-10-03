import type { Metadata } from "next";
import { LegalDocView } from "@/components/legal/legal-doc-view";
import { PRIVACY_CONTENT } from "@/lib/legal/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Tripime collects, uses, and protects personal information for enquiries, bookings, and customer profiles. Card numbers are not stored on our servers.",
};

export default function PrivacyPage() {
  return <LegalDocView content={PRIVACY_CONTENT} />;
}
