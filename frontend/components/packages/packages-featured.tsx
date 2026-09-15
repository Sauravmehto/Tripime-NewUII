"use client";

import { PackageCard } from "./package-card";
import { SectionHeading } from "@/components/home/section-heading";
import { Reveal } from "@/components/motion/reveal";
import type { TravelPackage } from "@/types";

interface PackagesFeaturedProps {
  packages: TravelPackage[];
  themeNames?: Record<string, string>;
}

export function PackagesFeatured({ packages, themeNames = {} }: PackagesFeaturedProps) {
  const featured = packages.filter((p) => p.featured).slice(0, 4);
  const list =
    featured.length > 0
      ? featured
      : [...packages].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 4);

  if (list.length === 0) return null;

  return (
    <section className="border-b border-neutral-200 bg-white py-7 sm:py-9">
      <Reveal>
        <SectionHeading
          eyebrow="Handpicked"
          title="Featured packages"
          subtitle="Expert-curated trips — enquire for live dates and pricing."
        />
      </Reveal>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((pkg, i) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            featured
            index={i}
            themeName={pkg.themeId ? themeNames[pkg.themeId] : undefined}
          />
        ))}
      </div>
    </section>
  );
}
