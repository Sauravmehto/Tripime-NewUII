"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import type { PackageCategory, TravelPackage } from "@/types";

type OfferChip =
  | "all"
  | "holidays"
  | "offer"
  | "upcoming_event"
  | "flight"
  | "hotel"
  | "bus"
  | "rajasthan";

const CHIP_META: { id: OfferChip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "flight", label: "Flights" },
  { id: "hotel", label: "Hotels" },
  { id: "holidays", label: "Holidays" },
  { id: "bus", label: "Buses" },
  { id: "rajasthan", label: "Rajasthan" },
  { id: "offer", label: "Offers" },
  { id: "upcoming_event", label: "Events" },
];

const SERVICE_CHIPS: Partial<
  Record<OfferChip, { href: string; title: string; body: string; cta: string }>
> = {
  flight: {
    href: "/flights",
    title: "Flight deals live on search",
    body: "Compare domestic and international fares, then enquire with a Tripime expert.",
    cta: "Search flights",
  },
  hotel: {
    href: "/hotels",
    title: "Hotel stays on request",
    body: "Tell us the city and dates — we confirm stays that fit the itinerary.",
    cta: "Enquire for hotels",
  },
  bus: {
    href: "/buses",
    title: "Bus tickets on request",
    body: "Intercity coaches can be added to any holiday plan. Send an enquiry to start.",
    cta: "Enquire for buses",
  },
};

const PROMO_CATEGORIES: PackageCategory[] = ["offer", "upcoming_event"];
const HOLIDAY_CATEGORIES: PackageCategory[] = ["domestic", "international"];

function isPromo(pkg: TravelPackage) {
  return PROMO_CATEGORIES.includes(pkg.category);
}

function matchesRajasthan(pkg: TravelPackage) {
  return /rajasthan|jaipur|udaipur|jodhpur|jaisalmer|bundi/i.test(
    `${pkg.title} ${pkg.destination} ${pkg.tagline} ${pkg.highlights.join(" ")}`,
  );
}

function matchesChip(pkg: TravelPackage, chip: OfferChip) {
  if (chip === "all") return isPromo(pkg);
  if (chip === "holidays") return HOLIDAY_CATEGORIES.includes(pkg.category);
  if (chip === "rajasthan") return matchesRajasthan(pkg);
  if (chip === "flight" || chip === "hotel" || chip === "bus") return false;
  return pkg.category === chip;
}

function categoryPill(category: PackageCategory) {
  if (category === "offer") return "Offer";
  if (category === "upcoming_event") return "Event";
  if (category === "international") return "Intl";
  return "India";
}

interface PackagesSpecialOffersProps {
  packages: TravelPackage[];
  onViewAllOffers: () => void;
  onExploreRajasthan?: () => void;
}

export function PackagesSpecialOffers({
  packages,
  onViewAllOffers,
  onExploreRajasthan,
}: PackagesSpecialOffersProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [chip, setChip] = useState<OfferChip>("all");

  const slides = useMemo(
    () => packages.filter((pkg) => matchesChip(pkg, chip)),
    [packages, chip],
  );

  function slide(dir: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  }

  if (packages.length === 0) return null;

  const serviceEmpty = SERVICE_CHIPS[chip];

  return (
    <section
      aria-label="Special offers"
      className="border-b border-neutral-200 bg-white py-7 sm:py-9"
    >
      <Container>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
            Special offers
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => slide(-1)}
              aria-label="Previous offers"
              className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-muted shadow-xs transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => slide(1)}
              aria-label="Next offers"
              className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-muted shadow-xs transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Offer categories">
          {CHIP_META.map(({ id, label }) => {
            const active = chip === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setChip(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                  active
                    ? "bg-primary-700 text-white shadow-xs"
                    : "border border-neutral-200 bg-white text-ink-muted hover:border-primary-200 hover:text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div
          ref={scrollerRef}
          className="mt-4 flex min-h-[11.5rem] snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {serviceEmpty ? (
            <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center">
              <p className="font-semibold text-ink">{serviceEmpty.title}</p>
              <p className="mt-1 max-w-md text-sm text-ink-muted">{serviceEmpty.body}</p>
              <Link
                href={serviceEmpty.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                {serviceEmpty.cta}
                <ChevronRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          ) : slides.length === 0 ? (
            <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center">
              <p className="text-sm text-ink-muted">No packages in this category yet.</p>
              {chip === "rajasthan" && onExploreRajasthan && (
                <button
                  type="button"
                  onClick={onExploreRajasthan}
                  className="mt-3 text-sm font-semibold text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  Browse the full catalog
                </button>
              )}
            </div>
          ) : (
            slides.map((pkg) => (
              <article
                key={pkg.id}
                className="flex w-[min(100%,22rem)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white sm:w-[26rem] sm:flex-row"
              >
                <div className="relative h-36 shrink-0 overflow-hidden sm:h-auto sm:w-[40%] sm:rounded-r-[4rem]">
                  {pkg.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pkg.imageUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-linear-to-br from-primary-900 to-primary-600" />
                  )}
                  <span className="absolute left-2 top-2 rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-800">
                    {categoryPill(pkg.category)}
                  </span>
                </div>

                <div className="flex min-h-[8.5rem] flex-1 flex-col justify-between gap-2 p-3.5 sm:min-h-[11.5rem]">
                  <div>
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink">
                      {pkg.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">
                      {pkg.tagline || pkg.priceNote}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-[15px] font-bold tabular-nums text-primary-800">
                        {formatINR(pkg.price)}
                      </span>
                      {pkg.negotiable && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-accent">
                          neg.
                        </span>
                      )}
                    </p>
                    {pkg.priceNote && (
                      <p className="truncate text-[10px] text-ink-subtle">{pkg.priceNote}</p>
                    )}
                    <Link
                      href={`/packages/${pkg.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 transition hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    >
                      View details
                      <ChevronRight className="size-3" aria-hidden />
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onViewAllOffers}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 transition hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            View all offers
            <ArrowUpRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </Container>
    </section>
  );
}
