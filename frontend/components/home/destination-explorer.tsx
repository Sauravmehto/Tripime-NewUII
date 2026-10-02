"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Carousel } from "@/components/travel/carousel";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { PopularRoutes } from "./popular-routes";
import { Badge } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  DESTINATION_CATEGORIES,
  EXPLORER_DESTINATIONS,
  type DestinationCategory,
  type ExplorerDestination,
} from "@/lib/home/home-data";

function DestinationCard({
  dest,
  featured = false,
  compact = false,
}: {
  dest: ExplorerDestination;
  featured?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link
        href={dest.href}
        className="group flex h-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs transition hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <div className="relative w-[38%] min-w-[110px] shrink-0 overflow-hidden">
          <Image
            src={dest.image}
            alt={`${dest.name}, ${dest.country}`}
            fill
            sizes="140px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center p-3">
          <Badge tone="neutral" className="w-fit capitalize">
            {dest.category}
          </Badge>
          <p className="mt-1.5 truncate text-sm font-bold text-ink">
            {dest.name}
            <span className="font-normal text-ink-muted"> · {dest.country}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">from {dest.startingPrice}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
            Explore
            <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={dest.href}
      className={cn(
        "group relative block overflow-hidden rounded-xl bg-ink shadow-soft transition hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
        featured ? "min-h-[280px] sm:min-h-[340px] lg:min-h-full" : "h-full",
      )}
    >
      <div className={cn("relative overflow-hidden", featured ? "absolute inset-0" : "aspect-[4/3]")}>
        <Image
          src={dest.image}
          alt={`${dest.name}, ${dest.country}`}
          fill
          sizes={
            featured
              ? "(max-width: 1024px) 100vw, 60vw"
              : "(max-width: 640px) 72vw, (max-width: 1024px) 40vw, 25vw"
          }
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-ink/25 to-transparent" />
      </div>
      <div
        className={cn(
          "relative z-[1] flex flex-col justify-end p-4 text-white",
          featured ? "absolute inset-0" : "absolute inset-x-0 bottom-0",
        )}
      >
        <Badge
          tone="neutral"
          className="mb-2 w-fit capitalize bg-white/15 text-white ring-1 ring-white/20"
        >
          {dest.category}
        </Badge>
        <p className={cn("font-bold", featured ? "text-2xl sm:text-3xl" : "text-sm")}>
          {dest.name}
          <span className={cn("font-normal text-white/75", featured ? "text-base" : "")}>
            {" "}
            · {dest.country}
          </span>
        </p>
        <p className={cn("mt-1 text-white/85", featured ? "text-sm" : "text-[11px]")}>
          from {dest.startingPrice}
        </p>
        {featured && (
          <p className="mt-2 max-w-md text-sm text-white/75">
            {dest.experiences.join(" · ")}
          </p>
        )}
        {!featured && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {dest.experiences.slice(0, 2).map((exp) => (
              <span
                key={exp}
                className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/85"
              >
                {exp}
              </span>
            ))}
          </div>
        )}
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1 font-semibold text-white",
            featured ? "text-sm" : "text-xs",
          )}
        >
          Explore
          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function DestinationExplorer() {
  const [active, setActive] = useState<DestinationCategory | "all">("all");

  const filtered = useMemo(
    () =>
      active === "all"
        ? EXPLORER_DESTINATIONS
        : EXPLORER_DESTINATIONS.filter((d) => d.category === active),
    [active],
  );

  const featured = filtered[0];
  const supporting = filtered.slice(1, 4);

  return (
    <Section id="explore" className="bg-canvas">
      <Reveal>
        <SectionHeading
          eyebrow="Destinations"
          title="Find your next escape"
          subtitle="Filter by mood — beach, mountains, city breaks, and more. Illustrative starting prices; enquire for live quotes."
        />
      </Reveal>

      <Reveal className="mt-5" delayMs={60}>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {DESTINATION_CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                "min-h-9 shrink-0 rounded-lg border px-3.5 py-2 text-xs font-semibold transition",
                active === id
                  ? "border-primary-600 bg-primary-700 text-white"
                  : "border-neutral-200 bg-white text-ink-muted hover:border-primary-200 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Reveal>

      {featured && (
        <div className="mt-6">
          {/* Desktop / tablet: featured + supporting grid */}
          <div className="hidden gap-3 sm:grid lg:grid-cols-[1.45fr_1fr] lg:items-stretch">
            <Reveal>
              <DestinationCard dest={featured} featured />
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {supporting.map((dest, i) => (
                <Reveal key={dest.id} delayMs={i * 50}>
                  <DestinationCard dest={dest} compact />
                </Reveal>
              ))}
            </div>
          </div>

          {/* Mobile: featured + horizontal carousel */}
          <div className="sm:hidden">
            <Reveal>
              <DestinationCard dest={featured} featured />
            </Reveal>
            {supporting.length > 0 && (
              <Reveal className="mt-3" delayMs={60}>
                <Carousel gapClassName="gap-3">
                  {supporting.map((dest) => (
                    <div
                      key={dest.id}
                      className="w-[72vw] shrink-0 snap-start"
                    >
                      <DestinationCard dest={dest} />
                    </div>
                  ))}
                </Carousel>
              </Reveal>
            )}
          </div>
        </div>
      )}

      {!featured && (
        <p className="mt-6 text-sm text-ink-muted">No destinations in this mood yet.</p>
      )}

      <Reveal className="mt-8 border-t border-neutral-200 pt-6" delayMs={80}>
        <PopularRoutes compact />
      </Reveal>

      <Reveal className="mt-4" delayMs={100}>
        <p className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
          <Sparkles className="size-3.5" aria-hidden />
          Package prices are indicative — connect with an expert for confirmed fares.
        </p>
      </Reveal>
    </Section>
  );
}
