import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { HomeHero } from "@/components/home/home-hero";
import { TrustStrip } from "@/components/home/trust-strip";
import { DestinationExplorer } from "@/components/home/destination-explorer";
import { TrendingTrips } from "@/components/home/trending-trips";
import { WhyTripime } from "@/components/home/why-tripime";
import { TravelMap } from "@/components/home/travel-map";
import { ComingSoonServices } from "@/components/home/coming-soon-services";
import { Testimonials } from "@/components/home/testimonials";
import { HomeFaqs } from "@/components/home/home-faqs";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  title: "Book Domestic Flights & Holiday Packages",
  description:
    "Search and book domestic flights and curated holiday packages on Tripime, with transparent pricing and real human support by call or WhatsApp.",
};

/**
 * Premium homepage: full-bleed hero, mood discovery, featured trips,
 * TravelMap, human proof, and a single conversion close.
 */
export default function HomePage() {
  return (
    <PageTransition>
      <HomeHero />
      <TrustStrip />
      <DestinationExplorer />
      <TrendingTrips />
      <WhyTripime />
      <TravelMap />
      <ComingSoonServices />
      <Testimonials />
      <HomeFaqs />
      <FinalCta />
    </PageTransition>
  );
}
