"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Carousel } from "@/components/travel/carousel";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { TRENDING_TRIPS } from "@/lib/home/home-data";

export function TrendingTrips() {
  return (
    <Section className="border-y border-neutral-200 bg-white">
        <Reveal>
          <SectionHeading
            eyebrow="Trending now"
            title="Trips travellers are booking"
            subtitle="Curated picks — structured for future API integration. Tap to browse packages."
          />
        </Reveal>

        <Reveal className="mt-6" delayMs={80}>
          <Carousel gapClassName="gap-3">
            {TRENDING_TRIPS.map((trip) => (
              <Link
                key={trip.id}
                href={trip.href}
                className="group w-[72vw] shrink-0 snap-start sm:w-[280px] md:w-[240px] lg:w-[220px] xl:w-[calc((100%-3rem)/4)]"
              >
                <article className="overflow-hidden rounded-xl border border-neutral-200 bg-canvas shadow-xs transition hover:-translate-y-0.5 hover:shadow-medium">
                  <div className="relative aspect-[5/4] overflow-hidden">
                    <Image
                      src={trip.image}
                      alt={trip.destination}
                      fill
                      sizes="280px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-ink/50 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 text-white">
                      <div>
                        <p className="text-sm font-bold">{trip.destination}</p>
                        <p className="text-[10px] text-white/80">{trip.country}</p>
                      </div>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
                        <Star className="size-3 fill-warning-500 text-warning-500" />
                        {trip.rating}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div>
                      <p className="text-[11px] text-ink-muted">{trip.duration}</p>
                      <p className="text-sm font-bold text-ink">
                        {trip.price}
                        <span className="ml-1 text-[10px] font-medium text-ink-subtle">
                          {trip.priceNote}
                        </span>
                      </p>
                    </div>
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-50 text-primary-700 transition group-hover:bg-primary-700 group-hover:text-white">
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </Carousel>
        </Reveal>
    </Section>
  );
}
