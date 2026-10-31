"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { CopyCode } from "@/components/ui/copy-code";
import {
  BankMark,
  DiscountBadge,
  ExpiryBadge,
  OfferCta,
  OfferFacts,
  OfferImage,
  StartingPrice,
} from "@/components/offers/offer-parts";
import { categoryLabel, offersHref } from "@/lib/offers/offers";
import { useOffers } from "@/lib/offers/use-offers";

const LOAD_ERROR = "We couldn’t load this offer right now. Please try again.";

export function OfferDetailView() {
  const params = useParams<{ offerId: string }>();
  const offerId = params.offerId;
  const { offers, error, retry } = useOffers(LOAD_ERROR);

  const offer = useMemo(() => offers?.find((item) => item.id === offerId) ?? null, [offers, offerId]);

  if (error) {
    return (
      <Container className="py-8">
        <div role="alert" className="rounded-2xl border border-danger-500/30 bg-danger-50 p-5 text-center">
          <p className="text-sm font-medium text-danger-700">{error}</p>
          <Button className="mt-3" variant="outline" onClick={retry}>
            Try again
          </Button>
        </div>
      </Container>
    );
  }

  if (!offers) {
    return (
      <Container className="py-8">
        <div aria-busy="true" aria-label="Loading offer">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-72 rounded-2xl" />
        </div>
      </Container>
    );
  }

  if (!offer) {
    return (
      <Container className="py-8">
        <Card className="mx-auto max-w-lg text-center">
          <p className="font-semibold text-ink">This offer isn’t available any more.</p>
          <p className="mt-1 text-sm text-ink-muted">It may have ended or been removed.</p>
          <Link
            href="/offers"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white transition hover:bg-primary-800"
          >
            See current offers
          </Link>
        </Card>
      </Container>
    );
  }

  const isBank = offer.category === "bank-offers";

  return (
    <Container className="py-6 sm:py-8">
      <Link
        href={offersHref(offer.category)}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to {categoryLabel(offer.category)}
      </Link>

      <article className="mt-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-soft">
        <OfferImage offer={offer} className="aspect-[16/9] sm:aspect-[16/6]">
          <div className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <DiscountBadge text={offer.discountText} />
              <ExpiryBadge validUntil={offer.validUntil} />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{offer.title}</h1>
            {offer.subtitle ? <p className="mt-1 text-sm text-white/90">{offer.subtitle}</p> : null}
          </div>
        </OfferImage>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            {isBank ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 p-3">
                <BankMark offer={offer} size="lg" />
                <div>
                  <p className="text-sm font-bold text-ink">{offer.bankName || "Bank offer"}</p>
                  <p className="text-xs text-ink-muted">Applies to payments made with this bank.</p>
                </div>
              </div>
            ) : null}

            {offer.description ? (
              <section>
                <h2 className="text-lg font-bold text-ink">About this offer</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{offer.description}</p>
              </section>
            ) : null}

            <section>
              <h2 className="text-lg font-bold text-ink">Offer details</h2>
              <div className="mt-2 space-y-3">
                <StartingPrice offer={offer} />
                <OfferFacts offer={offer} className="text-sm" />
              </div>
            </section>

            {offer.terms ? (
              <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <h2 className="text-sm font-semibold text-ink">Terms &amp; conditions</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{offer.terms}</p>
              </section>
            ) : null}
          </div>

          <aside className="h-fit space-y-3 rounded-xl border border-neutral-200 p-4">
            {offer.couponCode ? (
              <CopyCode code={offer.couponCode} />
            ) : (
              <p className="text-sm text-ink-muted">No coupon code is needed for this offer.</p>
            )}
            {offer.ctaHref ? (
              <OfferCta offer={offer} className="w-full flex-none" />
            ) : (
              <Link
                href="/contact"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary-700 px-3 text-sm font-semibold text-white transition hover:bg-primary-800"
              >
                Ask an expert
              </Link>
            )}
          </aside>
        </div>
      </article>
    </Container>
  );
}
