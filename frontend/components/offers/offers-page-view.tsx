"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { CopyCode } from "@/components/ui/copy-code";
import { Skeleton } from "@/components/ui/card";
import { Chip } from "@/components/ui/pill";
import {
  BankMark,
  CategoryTag,
  DiscountBadge,
  ExpiryBadge,
  OfferActions,
  OfferCta,
  OfferFacts,
  OfferImage,
  StartingPrice,
} from "@/components/offers/offer-parts";
import {
  categoryLabel,
  filterOffersByCategory,
  OFFER_CATEGORIES,
  VISIBLE_OFFER_CATEGORIES,
  offersHref,
  parseOfferCategory,
  type OfferCategory,
  type OfferItem,
} from "@/lib/offers/offers";
import { useOffers } from "@/lib/offers/use-offers";
import { OffersHero } from "@/components/offers/offers-hero";
import { OffersContent } from "@/components/offers/offers-content";
import { whatsappLink } from "@/lib/contact";

const LOAD_ERROR = "We couldn’t load offers right now. Please try again.";

/** Fades and lifts a card in as it scrolls into view; skipped for reduced-motion visitors. */
function Reveal({ index, children }: { index: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="h-full"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.07 }}
      whileHover={reduce ? undefined : { y: -4 }}
    >
      {children}
    </motion.div>
  );
}

function OfferCard({ offer }: { offer: OfferItem }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs transition-shadow hover:shadow-medium">
      <OfferImage offer={offer} className="aspect-[16/9] shrink-0">
        <div className="absolute inset-0 bg-linear-to-t from-ink/50 via-transparent to-transparent" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <DiscountBadge text={offer.discountText} />
          <ExpiryBadge validUntil={offer.validUntil} className="ml-auto" />
        </div>
        <CategoryTag offer={offer} className="absolute bottom-3 left-3" />
      </OfferImage>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-bold leading-snug text-ink">{offer.title}</h3>
          {offer.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{offer.subtitle}</p> : null}
        </div>
        <StartingPrice offer={offer} />
        <OfferFacts offer={offer} />
        {offer.couponCode ? <CopyCode code={offer.couponCode} /> : null}
        <div className="flex-1" aria-hidden />
        <OfferActions offer={offer} />
      </div>
    </article>
  );
}

function BankOfferCard({ offer }: { offer: OfferItem }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-primary-200 bg-linear-to-br from-primary-50 via-white to-white shadow-xs transition-shadow hover:shadow-medium">
      <div className="flex items-center gap-3 border-b border-primary-100 bg-primary-50/70 px-4 py-3">
        <BankMark offer={offer} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{offer.bankName || "Bank offer"}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">Bank offer</p>
        </div>
        <ExpiryBadge validUntil={offer.validUntil} className="ml-auto shrink-0" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {offer.discountText ? (
          <p className="text-xl font-extrabold leading-tight text-accent">{offer.discountText}</p>
        ) : null}
        <div>
          <h3 className="text-base font-bold leading-snug text-ink">{offer.title}</h3>
          {offer.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{offer.subtitle}</p> : null}
        </div>
        <OfferFacts offer={offer} />
        {offer.couponCode ? <CopyCode code={offer.couponCode} /> : null}
        {offer.terms ? <p className="line-clamp-2 text-xs text-ink-muted">{offer.terms}</p> : null}
        <div className="flex-1" aria-hidden />
        <OfferActions offer={offer} />
      </div>
    </article>
  );
}

function FeaturedOffer({ offer }: { offer: OfferItem }) {
  return (
    <article className="group grid overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-soft md:grid-cols-2">
      <OfferImage offer={offer} className="aspect-[16/10] md:aspect-auto md:min-h-[300px]">
        <div className="absolute inset-0 bg-linear-to-t from-ink/40 via-transparent to-transparent md:hidden" />
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <DiscountBadge text={offer.discountText} />
          <ExpiryBadge validUntil={offer.validUntil} />
        </div>
      </OfferImage>
      <div className="flex flex-col justify-center gap-4 p-5 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">
          Featured · {categoryLabel(offer.category)}
        </p>
        <div>
          <h2 className="text-xl font-bold leading-snug text-ink sm:text-2xl">{offer.title}</h2>
          {offer.subtitle ? <p className="mt-2 text-sm text-ink-muted sm:text-base">{offer.subtitle}</p> : null}
        </div>
        <StartingPrice offer={offer} />
        <OfferFacts offer={offer} />
        {offer.couponCode ? <CopyCode code={offer.couponCode} className="max-w-sm" /> : null}
        <div className="flex flex-wrap gap-2">
          <OfferCta offer={offer} className="max-w-52 flex-none" />
          <Link
            href={`/offers/${offer.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-ink transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Details &amp; terms
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ category }: { category: OfferCategory }) {
  const label = categoryLabel(category).toLowerCase();
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-base font-semibold text-ink">
        {category === "all" ? "No offers are live right now" : `No ${label} right now`}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
        We add new offers regularly. Meanwhile, explore our holiday packages or ask an expert for the best current price.
      </p>
      <Link
        href="/packages"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white transition hover:bg-primary-800"
      >
        Explore packages
      </Link>
      <a
        href={whatsappLink("Hi Tripime, which travel offers are live right now? I'd like the best current price.")}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-ink transition hover:bg-neutral-50"
      >
        Ask an expert on WhatsApp
      </a>
    </div>
  );
}

export function OffersPageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = parseOfferCategory(searchParams.get("category"));

  const { offers, error, retry } = useOffers(LOAD_ERROR);

  const selectCategory = useCallback(
    (next: OfferCategory) => router.replace(offersHref(next), { scroll: false }),
    [router],
  );

  const filtered = useMemo(() => (offers ? filterOffersByCategory(offers, category) : []), [offers, category]);
  const counts = useMemo(() => {
    const map = new Map<OfferCategory, number>();
    for (const item of OFFER_CATEGORIES) {
      map.set(item.id, offers ? filterOffersByCategory(offers, item.id).length : 0);
    }
    return map;
  }, [offers]);

  const featured = filtered.find((offer) => offer.category !== "bank-offers" && offer.imageUrl);
  const rest = filtered.filter((offer) => offer !== featured);
  const loading = offers === null && !error;

  return (
    <div className="bg-canvas">
      <OffersHero offers={offers} category={category} counts={counts} onSelect={selectCategory} />

      <div className="sticky top-14 z-30 border-b border-neutral-200 bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
        <Container>
          <div
            role="group"
            aria-label="Offer categories"
            className="no-scrollbar flex gap-2 overflow-x-auto py-2.5 sm:flex-wrap sm:overflow-visible"
          >
            {VISIBLE_OFFER_CATEGORIES.map((item) => {
              const count = counts.get(item.id) ?? 0;
              return (
                <Chip key={item.id} scroll active={category === item.id} onClick={() => selectCategory(item.id)}>
                  {item.label}
                  {offers && count > 0 ? (
                    <span className="ml-1.5 text-[11px] font-bold opacity-70">{count}</span>
                  ) : null}
                </Chip>
              );
            })}
          </div>
        </Container>
      </div>

      <Container className="py-6 sm:py-8">
        {error ? (
          <div role="alert" className="rounded-2xl border border-danger-500/30 bg-danger-50 p-5 text-center">
            <p className="text-sm font-medium text-danger-700">{error}</p>
            <Button className="mt-3" variant="outline" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div aria-busy="true" aria-label="Loading offers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[340px] rounded-2xl" />
            ))}
          </div>
        ) : null}

        {offers && filtered.length === 0 ? <EmptyState category={category} /> : null}

        {featured ? (
          <Reveal key={`${category}-featured`} index={0}>
            <FeaturedOffer offer={featured} />
          </Reveal>
        ) : null}

        {rest.length > 0 ? (
          <section key={category} className={featured ? "mt-8" : undefined} aria-label={`${categoryLabel(category)} list`}>
            {featured ? <h2 className="mb-3 text-lg font-bold text-ink">More offers</h2> : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((offer, i) => (
                <Reveal key={offer.id} index={i}>
                  {offer.category === "bank-offers" ? <BankOfferCard offer={offer} /> : <OfferCard offer={offer} />}
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}
      </Container>

      <OffersContent />
    </div>
  );
}
