import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { HomeHero } from "@/components/home/home-hero";
import { DestinationExplorer } from "@/components/home/destination-explorer";
import { TrendingHolidayPackages } from "@/components/home/trending-holiday-packages";
import { TravelCategories } from "@/components/home/travel-categories";
import { SpecialOffersSection } from "@/components/home/special-offers-section";
import { WhyTripime } from "@/components/home/why-tripime";
import { Testimonials } from "@/components/home/testimonials";
import { InspirationGrid } from "@/components/home/inspiration-grid";
import { HomeFaqs } from "@/components/home/home-faqs";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  title: "Discover More. Travel Better.",
  description:
    "Explore premium destinations, curated holiday packages, and expert-led travel planning on Tripime.",
};

export default function HomePage() {
  return (
    <PageTransition>
      <HomeHero />
      <DestinationExplorer />
      <TrendingHolidayPackages />
      <TravelCategories />
      <SpecialOffersSection />
      <WhyTripime />
      <Testimonials />
      <InspirationGrid />
      <HomeFaqs />
      <FinalCta />
    </PageTransition>
  );
}
