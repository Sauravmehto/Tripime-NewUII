"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Atmosphere } from "@/components/home/section-atmosphere";
import { Carousel } from "@/components/travel/carousel";
import { Reveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/cn";
import { EXPLORER_DESTINATIONS } from "@/lib/home/home-data";

type DestinationGroup = "india" | "international" | "weekend" | "trending";

const GROUPS: { id: DestinationGroup; label: string }[] = [
  { id: "india", label: "Popular in India" },
  { id: "international", label: "International" },
  { id: "weekend", label: "Weekend Getaways" },
  { id: "trending", label: "Trending Destinations" },
];

const WEEKEND_IDS = new Set(["goa", "manali", "kerala", "kashmir"]);
const TRENDING_IDS = new Set(["bali", "dubai", "maldives", "singapore", "kashmir"]);

function itemsFor(group: DestinationGroup) {
  if (group === "weekend") return EXPLORER_DESTINATIONS.filter((item) => WEEKEND_IDS.has(item.id));
  if (group === "trending") return EXPLORER_DESTINATIONS.filter((item) => TRENDING_IDS.has(item.id));
  if (group === "india") return EXPLORER_DESTINATIONS.filter((item) => item.country === "India");
  return EXPLORER_DESTINATIONS.filter((item) => item.country !== "India");
}

function DestinationEditorialCard({
  name,
  country,
  image,
  startingPrice,
  href,
  caption,
}: {
  name: string;
  country: string;
  image: string;
  startingPrice: string;
  href: string;
  caption: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-soft transition hover:shadow-medium">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={image}
            alt={`${name}, ${country}`}
            fill
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 40vw, 28vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <p className="text-xl font-bold tracking-tight">{name}</p>
            <p className="text-xs text-white/80">{country}</p>
            <p className="mt-2 text-xs text-white/90">{caption}</p>
            <p className="mt-2 text-xs font-semibold text-accent">From {startingPrice}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function DestinationExplorer() {
  const [active, setActive] = useState<DestinationGroup>("india");

  const filtered = useMemo(() => itemsFor(active), [active]);

  return (
    <Section id="destinations" className="relative isolate overflow-hidden bg-canvas">
      <Atmosphere variant="mist" />
      <Reveal>
        <SectionHeading
          eyebrow="Destinations"
          title="Discover destinations by travel intent"
          subtitle="Explore India favorites, global hotspots, weekend escapes and trending picks curated for every kind of traveler."
        />
      </Reveal>

      <Reveal className="mt-5" delayMs={60}>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {GROUPS.map(({ id, label }) => (
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

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">No destinations in this mood yet.</p>
      ) : (
        <>
          <Reveal className="mt-6 hidden sm:block">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.slice(0, 8).map((dest, i) => (
                <Reveal key={dest.id} delayMs={i * 50}>
                  <DestinationEditorialCard
                    name={dest.name}
                    country={dest.country}
                    image={dest.image}
                    startingPrice={dest.startingPrice}
                    href={dest.href}
                    caption={dest.experiences.join(" · ")}
                  />
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-5 sm:hidden">
            <Carousel gapClassName="gap-3">
              {filtered.slice(0, 8).map((dest) => (
                <div key={dest.id} className="w-[72vw] shrink-0 snap-start">
                  <DestinationEditorialCard
                    name={dest.name}
                    country={dest.country}
                    image={dest.image}
                    startingPrice={dest.startingPrice}
                    href={dest.href}
                    caption={dest.experiences.join(" · ")}
                  />
                </div>
              ))}
            </Carousel>
          </Reveal>
        </>
      )}

      <Reveal className="mt-6" delayMs={120}>
        <Link
          href="/packages"
          className={buttonClasses({ variant: "outline", size: "md", className: "inline-flex" })}
        >
          Explore all destinations
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Reveal>
    </Section>
  );
}
