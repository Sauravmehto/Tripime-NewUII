"use client";

import { OfficialTourismCarousel } from "@/components/packages/official-tourism-carousel";
import { TOURISM_STATES } from "@/lib/packages/tourism-states";

interface PackagesPromoBannerProps {
  onExploreState: (state: string) => void;
}

export function PackagesPromoBanner({ onExploreState }: PackagesPromoBannerProps) {
  return <OfficialTourismCarousel states={TOURISM_STATES} onExploreState={onExploreState} />;
}
