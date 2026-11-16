"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Atmosphere } from "@/components/home/section-atmosphere";
import { Reveal } from "@/components/motion/reveal";
import { PackageCard } from "@/components/packages/package-card";
import { SectionHeading } from "@/components/home/section-heading";
import { listPackages, listPackageThemes } from "@/lib/api/packages";
import type { PackageTheme, TravelPackage } from "@/types";

export function TrendingHolidayPackages() {
  const [packages, setPackages] = useState<TravelPackage[] | null>(null);
  const [themes, setThemes] = useState<PackageTheme[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([listPackages(), listPackageThemes()])
      .then(([items, themeItems]) => {
        if (!active) return;
        const sorted = [...items].sort(
          (a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder,
        );
        setPackages(sorted.slice(0, 6));
        setThemes(themeItems);
      })
      .catch(() => {
        if (active) setPackages([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const themeNames = Object.fromEntries(themes.map((item) => [item.id, item.name]));

  return (
    <Section className="relative isolate overflow-hidden tp-grad-trending">
      <Atmosphere variant="glow" />
      <Reveal>
        <SectionHeading
          eyebrow="Trending holiday packages"
          title="Handpicked journeys travelers are booking now"
          subtitle="Live packages from our catalogue with transparent starting prices."
        />
      </Reveal>

      <div id="all-packages" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {packages === null
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-[360px] animate-pulse rounded-2xl bg-neutral-100" />
            ))
          : packages.map((pkg, index) => (
              <Reveal key={pkg.id} delayMs={index * 60}>
                <PackageCard pkg={pkg} themeName={pkg.themeId ? (themeNames[pkg.themeId] ?? undefined) : undefined} />
              </Reveal>
            ))}
      </div>

      <Reveal className="mt-6" delayMs={100}>
        <Link
          href="/packages"
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50"
        >
          View all holiday packages
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Reveal>
    </Section>
  );
}
