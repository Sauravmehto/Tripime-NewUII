"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { Badge } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  DESTINATION_CATEGORIES,
  EXPLORER_DESTINATIONS,
  type DestinationCategory,
} from "@/lib/home/home-data";

export function DestinationExplorer() {
  const [active, setActive] = useState<DestinationCategory | "all">("all");

  const filtered = useMemo(
    () =>
      active === "all"
        ? EXPLORER_DESTINATIONS
        : EXPLORER_DESTINATIONS.filter((d) => d.category === active),
    [active],
  );

  return (
    <section id="explore" className="py-10 sm:py-14">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Destination explorer"
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
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((dest, i) => (
            <Reveal key={dest.id} delayMs={i * 50}>
              <Link
                href={dest.href}
                className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={dest.image}
                    alt={dest.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-ink/55 via-ink/10 to-transparent" />
                  <Badge tone="neutral" className="absolute left-2 top-2 capitalize">
                    {dest.category}
                  </Badge>
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="text-sm font-bold">
                      {dest.name}
                      <span className="font-normal text-white/75"> · {dest.country}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/80">
                      from {dest.startingPrice}
                    </p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {dest.experiences.slice(0, 2).map((exp) => (
                      <span
                        key={exp}
                        className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
                    Explore
                    <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-4" delayMs={100}>
          <p className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
            <Sparkles className="size-3.5" aria-hidden />
            Package prices are indicative — connect with an expert for confirmed fares.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
