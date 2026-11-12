import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { AboutPageView } from "@/components/about/about-page-view";

export const metadata: Metadata = {
  title: "About",
  description:
    "Tripime is a travel platform built to make holiday planning simple, transparent and affordable, with real travel experts a call or WhatsApp away.",
};

export default function AboutPage() {
  return (
    <PageTransition>
      <AboutPageView />
    </PageTransition>
  );
}
