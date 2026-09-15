import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { HomeHero } from "@/components/home/home-hero";
import { TrustStrip } from "@/components/home/trust-strip";
import { HomeFeatures } from "@/components/home/home-features";
import { PopularRoutes } from "@/components/home/popular-routes";
import { TrendingTrips } from "@/components/home/trending-trips";
import { WhyTripime } from "@/components/home/why-tripime";
import { BuildYourTrip } from "@/components/home/build-your-trip";
import { TravelMap } from "@/components/home/travel-map";
import { ComingSoonServices } from "@/components/home/coming-soon-services";
import { AirlinesStrip } from "@/components/home/airlines-strip";
import { InspirationGrid } from "@/components/home/inspiration-grid";
import { Testimonials } from "@/components/home/testimonials";
import { HomeFaqs } from "@/components/home/home-faqs";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  title: "Book Domestic Flights & Holiday Packages",
  description:
    "Search and book domestic flights and curated holiday packages on Tripime, with transparent pricing and real human support by call or WhatsApp.",
};

/**
 * Homepage blends live-site (tripimee.netlify.app) content sections
 * with the new premium Next.js visual system.
 */
export default function HomePage() {
  return (
    <PageTransition>
      <HomeHero />
      <TrustStrip />
      <HomeFeatures />
      <PopularRoutes />
      <TrendingTrips />
      <WhyTripime />
      <BuildYourTrip />
      <TravelMap />
      <ComingSoonServices />
      <AirlinesStrip />
      <InspirationGrid />
      <Testimonials />
      <HomeFaqs />
      <FinalCta />
    </PageTransition>
  );
}
