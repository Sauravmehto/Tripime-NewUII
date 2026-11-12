import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { HomeHero } from "@/components/home/home-hero";
// Hidden for now (Offers Zone strip and trust strip on the home page). Restore the imports and the JSX lines below to bring them back.
// import { OffersShortcut } from "@/components/home/offers-shortcut";
import { HomePackageRow } from "@/components/home/home-package-row";
// import { TrustStrip } from "@/components/home/trust-strip";
import { DestinationExplorer } from "@/components/home/destination-explorer";
import { TrendingTrips } from "@/components/home/trending-trips";
import { WhyTripime } from "@/components/home/why-tripime";
import { TravelMap } from "@/components/home/travel-map";
// import { ComingSoonServices } from "@/components/home/coming-soon-services"; // hidden for now ("What's next" band)
import { Testimonials } from "@/components/home/testimonials";
import { HomeFaqs } from "@/components/home/home-faqs";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  title: "Holiday Packages & Travel Experts",
  description:
    "Curated holiday packages on Tripime, planned by real travel experts with transparent pricing and support by call or WhatsApp.",
};

/**
 * Premium homepage: full-bleed hero, mood discovery, featured trips,
 * TravelMap, human proof, and a single conversion close.
 */
export default function HomePage() {
  return (
    <PageTransition>
      <HomeHero />
      {/* <OffersShortcut /> */}
      <HomePackageRow />
      {/* <TrustStrip /> */}
      <DestinationExplorer />
      {/* Phones get live packages from HomePackageRow instead, and a shorter page. */}
      <div className="hidden lg:block">
        <TrendingTrips />
      </div>
      {/* "Follow the journey" (desktop only) sits above "Why plan with Tripime". */}
      <div className="hidden lg:block">
        <TravelMap />
        {/* <ComingSoonServices /> */}
      </div>
      <WhyTripime />
      <Testimonials />
      <HomeFaqs />
      <FinalCta />
    </PageTransition>
  );
}
