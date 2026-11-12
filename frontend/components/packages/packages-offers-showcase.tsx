"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Chip } from "@/components/ui/pill";
import { CopyCode } from "@/components/ui/copy-code";
import {
  VISIBLE_OFFER_CATEGORIES,
  filterOffersByCategory,
  offersHref,
  type OfferCategory,
  type OfferItem,
} from "@/lib/offers/offers";

interface PackagesOffersShowcaseProps {
  offers: OfferItem[];
}

export function PackagesOffersShowcase({ offers }: PackagesOffersShowcaseProps) {
  const [category, setCategory] = useState<OfferCategory>("holidays");
  const visible = useMemo(() => filterOffersByCategory(offers, category).slice(0, 6), [offers, category]);

  if (offers.length === 0) return null;

  return (
    <section id="offers-zone" className="bg-canvas py-4 sm:py-6">
      <Container>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">Offers</h2>
              <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {VISIBLE_OFFER_CATEGORIES.map((item) => (
                  <Chip
                    key={item.id}
                    active={category === item.id}
                    onClick={() => setCategory(item.id)}
                    className="!min-h-9 text-[11px]"
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>
            <Link
              href={offersHref(category)}
              className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-primary-700 hover:text-primary-800"
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {visible.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center text-sm text-ink-muted">
              No live offers in this category right now.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((offer) => (
                <article
                  key={offer.id}
                  className="flex h-full min-h-[168px] items-stretch gap-3 rounded-xl border border-neutral-200 bg-white p-3"
                >
                  <div className="relative w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={offer.imageUrl} alt="" className="size-full object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">T&amp;Cs apply</p>
                    <h3 className="mt-0.5 line-clamp-2 text-base font-bold leading-tight text-ink">{offer.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                      {offer.subtitle || offer.description || "Exclusive pricing from Tripime partners"}
                    </p>
                    {offer.couponCode ? <CopyCode code={offer.couponCode} className="mt-2" /> : null}
                    <div className="mt-auto pt-2">
                      <Link
                        href={offer.ctaHref || offersHref(category)}
                        className="text-sm font-bold uppercase tracking-wide text-primary-700 hover:text-primary-800"
                      >
                        {offer.ctaLabel || "Book now"}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

