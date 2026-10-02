"use client";

import { MessageCircle } from "lucide-react";
import { Carousel } from "@/components/travel/carousel";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/contact";
import { TESTIMONIALS } from "@/lib/home/home-data";

const HIGHLIGHTS = TESTIMONIALS.slice(0, 3);

export function Testimonials() {
  return (
    <Section className="bg-canvas">
      <Reveal>
        <SectionHeading
          eyebrow="Traveller stories"
          title="Real people. Real trips."
          subtitle="What travellers say about booking flights and packages with Tripime."
          align="center"
        />
      </Reveal>

      <Reveal className="mt-6" delayMs={80}>
        <Carousel gapClassName="gap-4">
          {HIGHLIGHTS.map((item) => (
            <blockquote
              key={item.id}
              className="w-[85vw] shrink-0 snap-start border-l-2 border-accent pl-4 sm:w-[340px] md:w-[320px]"
            >
              <p className="text-sm leading-relaxed text-ink">&ldquo;{item.quote}&rdquo;</p>
              <footer className="mt-4">
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-[11px] text-ink-muted">
                  {item.location} · {item.trip}
                </p>
              </footer>
            </blockquote>
          ))}
        </Carousel>
      </Reveal>

      <Reveal className="mt-8 text-center" delayMs={120}>
        <a
          href={whatsappLink("Hi Tripime, I'd like help planning a trip.")}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline" size="md">
            <MessageCircle className="size-4" aria-hidden />
            Talk to a travel expert
          </Button>
        </a>
      </Reveal>
    </Section>
  );
}
