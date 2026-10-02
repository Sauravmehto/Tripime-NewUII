"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, Star } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Carousel } from "@/components/travel/carousel";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/contact";
import { TRENDING_TRIPS, type TrendingTrip } from "@/lib/home/home-data";

const FEATURED = TRENDING_TRIPS[0]!;
const SUPPORTING = TRENDING_TRIPS.slice(1, 5);

function enquireMessage(trip: TrendingTrip) {
  return `Hi Tripime, I'm interested in ${trip.destination} (${trip.duration}). Please share a quote.`;
}

function SupportingTripCard({ trip }: { trip: TrendingTrip }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-medium">
      <Link href={trip.href} className="block">
        <div className="relative aspect-[5/4] overflow-hidden">
          <Image
            src={trip.image}
            alt={`${trip.destination}, ${trip.country}`}
            fill
            sizes="280px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink/55 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 text-white">
            <div>
              <p className="text-sm font-bold">{trip.destination}</p>
              <p className="text-[10px] text-white/80">{trip.country}</p>
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
              <Star className="size-3 fill-warning-500 text-warning-500" aria-hidden />
              {trip.rating}
            </span>
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 p-3">
        <div>
          <p className="text-[11px] text-ink-muted">{trip.duration}</p>
          <p className="text-sm font-bold text-ink">
            {trip.price}
            <span className="ml-1 text-[10px] font-medium text-ink-subtle">{trip.priceNote}</span>
          </p>
        </div>
        <a
          href={whatsappLink(enquireMessage(trip))}
          target="_blank"
          rel="noreferrer"
          className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700 transition hover:bg-primary-700 hover:text-white"
          aria-label={`Enquire about ${trip.destination} on WhatsApp`}
        >
          <MessageCircle className="size-4" />
        </a>
      </div>
    </article>
  );
}

export function TrendingTrips() {
  return (
    <Section className="border-y border-neutral-200 bg-white">
      <Reveal>
        <SectionHeading
          eyebrow="Trending now"
          title="Trips travellers are booking"
          subtitle="Curated picks with illustrative prices — enquire for a live quote from a travel expert."
        />
      </Reveal>

      {/* Featured trip */}
      <Reveal className="mt-6" delayMs={60}>
        <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-canvas shadow-soft lg:grid lg:grid-cols-[1.35fr_1fr]">
          <Link href={FEATURED.href} className="group relative block min-h-[240px] sm:min-h-[300px]">
            <Image
              src={FEATURED.image}
              alt={`${FEATURED.destination}, ${FEATURED.country}`}
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-ink/50 via-transparent to-transparent lg:bg-linear-to-r lg:from-transparent lg:to-ink/10" />
          </Link>
          <div className="flex flex-col justify-center p-5 sm:p-6 lg:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Featured trip
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {FEATURED.destination}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">{FEATURED.country}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-ink">{FEATURED.duration}</span>
              <span className="text-ink-subtle">·</span>
              <span className="inline-flex items-center gap-1 text-ink-muted">
                <Star className="size-3.5 fill-warning-500 text-warning-500" aria-hidden />
                {FEATURED.rating}
              </span>
            </div>
            <p className="mt-3 text-xl font-bold text-ink">
              {FEATURED.price}
              <span className="ml-1.5 text-sm font-medium text-ink-subtle">
                {FEATURED.priceNote}
              </span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={whatsappLink(enquireMessage(FEATURED))}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="accent" size="md">
                  <MessageCircle className="size-4" aria-hidden />
                  Enquire on WhatsApp
                </Button>
              </a>
              <Link href={FEATURED.href}>
                <Button variant="outline" size="md">
                  Browse packages
                  <ArrowRight className="size-3.5" aria-hidden />
                </Button>
              </Link>
            </div>
          </div>
        </article>
      </Reveal>

      {/* Supporting trips */}
      <Reveal className="mt-5" delayMs={100}>
        <Carousel gapClassName="gap-3">
          {SUPPORTING.map((trip) => (
            <div
              key={trip.id}
              className="w-[72vw] shrink-0 snap-start sm:w-[260px] md:w-[240px] lg:w-[calc((100%-2.25rem)/4)]"
            >
              <SupportingTripCard trip={trip} />
            </div>
          ))}
        </Carousel>
      </Reveal>
    </Section>
  );
}
