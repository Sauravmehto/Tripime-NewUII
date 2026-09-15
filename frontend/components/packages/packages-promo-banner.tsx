"use client";

import { ArrowUpRight, Landmark } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

const OBMS_URL = "https://obms-tourist.rajasthan.gov.in/";

interface PackagesPromoBannerProps {
  onExploreRajasthan: () => void;
}

export function PackagesPromoBanner({ onExploreRajasthan }: PackagesPromoBannerProps) {
  return (
    <section aria-label="Rajasthan monuments" className="bg-canvas pb-6 pt-1 sm:pb-8">
      <Container>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-linear-to-br from-primary-900 via-primary-800 to-accent/70 text-white shadow-xs">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                <Landmark className="size-3.5" aria-hidden />
                Official monument tickets
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                Skip the line at Rajasthan&apos;s iconic sites
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                Book forts, palaces, museums and wildlife tickets on the Rajasthan government
                portal. Pair it with a Tripime holiday if you want stays and transfers planned
                for you.
              </p>
              <p className="mt-3 text-[11px] font-medium text-white/65">
                Forts &amp; palaces · Wildlife · Museums · Light &amp; sound · Composite tickets
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={OBMS_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="accent" size="md">
                    Book on OBMS
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="md"
                  onClick={onExploreRajasthan}
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  See Rajasthan holidays
                </Button>
              </div>
            </div>
            <div className="hidden rounded-lg border border-white/15 bg-white/10 p-4 text-sm leading-relaxed text-white/85 lg:block">
              <p className="font-semibold text-white">Plan the trip around the tickets</p>
              <p className="mt-1.5">
                Jaipur, Udaipur, Jodhpur and wildlife circuits work best when monument slots
                and hotel nights are booked together. Share dates and we&apos;ll build the rest.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
