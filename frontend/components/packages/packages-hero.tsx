"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/card";
import { HERO_IMAGE } from "@/lib/packages/package-landing-data";
import { HolidaySearchWizard } from "@/components/packages/holiday-search-wizard";
import type { HolidaySearch } from "@/lib/packages/search-options";

interface PackagesHeroProps {
  onSearch: (search: HolidaySearch) => void;
}

interface DiscoveryTab {
  label: string;
  href: string;
  active?: boolean;
}

const DISCOVERY_TABS: DiscoveryTab[] = [
  { label: "Search", href: "#top", active: true },
  { label: "Last Minute Deals", href: "#deals-strip" },
  { label: "Honeymoon", href: "#honeymoon-row" },
  { label: "Offer Zone", href: "#offers-zone" },
  { label: "Pilgrimage", href: "#pilgrimage-row" },
];

export function PackagesHero({ onSearch }: PackagesHeroProps) {
  const reduceMotion = useReducedMotion();

  const fade = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section id="top" className="relative isolate overflow-hidden border-b border-neutral-200/70">
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-br from-ink/82 via-ink/70 to-primary-900/65" />
      </div>

      <Container className="relative py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fade(0.05)}>
            <Badge tone="accent" className="bg-white/15 text-white ring-1 ring-white/25">
              Tripime Holidays
            </Badge>
          </motion.div>
          <motion.h1
            {...fade(0.1)}
            className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-[1.1]"
          >
            Plan your perfect holiday package
          </motion.h1>
          <motion.p
            {...fade(0.16)}
            className="mt-2.5 max-w-2xl text-sm leading-relaxed text-white/85"
          >
            Compare destinations, offers, and curated itineraries in one place. Final pricing and
            availability are always confirmed by a real Tripime expert.
          </motion.p>
          <motion.div
            {...fade(0.22)}
            className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-white/80"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-accent" aria-hidden />
              No payment until the plan is final
            </span>
          </motion.div>

          <motion.div {...fade(0.24)} className="mt-4">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {DISCOVERY_TABS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition ${
                    item.active
                      ? "border-primary-200 bg-white text-primary-700"
                      : "border-white/25 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fade(0.28)}
            className="mt-4 rounded-2xl border border-white/30 bg-white/72 p-3.5 shadow-elevated backdrop-blur-md sm:p-4"
          >
            <HolidaySearchWizard onSearch={onSearch} />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
