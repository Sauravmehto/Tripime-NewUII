"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, TicketPercent } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Atmosphere } from "@/components/home/section-atmosphere";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { useOffers } from "@/lib/offers/use-offers";
import { expiryBadge, formatIsoDate } from "@/lib/offers/offers";

export function SpecialOffersSection() {
  const { offers } = useOffers("We could not load offers right now.");
  const visible = (offers ?? []).slice(0, 4);

  if (offers !== null && visible.length === 0) return null;

  return (
    <Section className="relative isolate overflow-hidden bg-white">
      <Atmosphere variant="deal" />
      <Reveal>
        <SectionHeading
          eyebrow="Special offers"
          title="Limited-time travel deals"
          subtitle="Only currently active offers are shown. Final fare and availability are confirmed by our team."
        />
      </Reveal>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {offers === null
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl bg-neutral-100" />
            ))
          : visible.map((offer, index) => (
              <Reveal key={offer.id} delayMs={index * 45}>
                <article className="h-full overflow-hidden rounded-2xl border border-neutral-200 bg-canvas shadow-xs">
                  <div className="relative aspect-[4/3]">
                    {offer.imageUrl ? (
                      <Image
                        src={offer.imageUrl}
                        alt={offer.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-linear-to-br from-primary-700 to-primary-900" />
                    )}
                    <div className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-primary-800">
                      {offer.category.replace("-", " ")}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-bold text-ink">{offer.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{offer.subtitle || offer.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {offer.discountText ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-dark">
                          <TicketPercent className="size-3" />
                          {offer.discountText}
                        </span>
                      ) : null}
                      {offer.validUntil ? (
                        <span className="text-[10px] text-ink-subtle">Valid till {formatIsoDate(offer.validUntil)}</span>
                      ) : null}
                      {offer.validUntil && expiryBadge(offer.validUntil) ? (
                        <span className="rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          {expiryBadge(offer.validUntil)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <Link
                        href={offer.ctaHref ?? "/offers"}
                        target={offer.ctaExternal ? "_blank" : undefined}
                        rel={offer.ctaExternal ? "noreferrer" : undefined}
                        className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50"
                      >
                        {offer.ctaLabel || "View offer"}
                        <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
      </div>
    </Section>
  );
}
