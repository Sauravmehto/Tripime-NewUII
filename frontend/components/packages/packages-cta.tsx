"use client";

import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { HELPLINE_DISPLAY, telLink, whatsappLink } from "@/lib/contact";

export function PackagesCta() {
  return (
    <section className="border-t border-neutral-200 bg-ink py-10 text-white sm:py-12">
      <Container>
        <Reveal>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                Still deciding?
              </p>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">
                Talk it through with a Tripime expert
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Share budget, dates, and who&apos;s travelling — get an itinerary you can react to.
                No obligation. Packages are enquiry-based so pricing fits your group.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={telLink()}>
                <Button variant="secondary" size="lg" className="bg-white text-ink hover:bg-neutral-100">
                  <Phone className="size-4" aria-hidden />
                  {HELPLINE_DISPLAY}
                </Button>
              </a>
              <a
                href={whatsappLink("Hi Tripime, I'd like help planning a holiday package.")}
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </Button>
              </a>
              <Link href="/flights?origin=DEL&destination=BOM&date=2026-08-20&passengers=1">
                <Button variant="ghost" size="lg" className="text-white/90 hover:bg-white/10">
                  Search flights
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
