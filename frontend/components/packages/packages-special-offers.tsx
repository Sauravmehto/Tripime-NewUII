"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import type { PackageCategory, TravelPackage } from "@/types";

const AUTOPLAY_MS = 2000;

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

const HOLIDAY_CATEGORIES: PackageCategory[] = ["domestic", "international"];

function matchesRajasthan(pkg: TravelPackage) {
  return /rajasthan|jaipur|udaipur|jodhpur|jaisalmer|bundi/i.test(
    `${pkg.title} ${pkg.destination} ${pkg.tagline} ${pkg.highlights.join(" ")}`,
  );
}

function matchesChip(pkg: TravelPackage, chip: OfferChip) {
  if (chip === "all") return true;
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
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const rafRef = useRef(0);
  const [chip, setChip] = useState<OfferChip>("all");
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useMemo(
    () => packages.filter((pkg) => matchesChip(pkg, chip)),
    [packages, chip],
  );

  // Cards are rendered twice so the strip can keep sliding past the last
  // card into a copy of the first; once it settles there we jump back.
  const loop = slides.length > 1;
  const displayed = useMemo(() => (loop ? [...slides, ...slides] : slides), [loop, slides]);
  const settleRef = useRef(0);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(rafRef.current);
      window.clearTimeout(settleRef.current);
    },
    [],
  );

  const activeIndexRef = useRef(0);
  const pausedRef = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  function scrollToIndex(index: number) {
    const scroller = scrollerRef.current;
    const card = cardRefs.current[index];
    if (!scroller || !card) return;
    scroller.scrollTo({
      left: card.offsetLeft,
      behavior: "smooth",
    });
  }

  // Autoplay: advance every AUTOPLAY_MS, looping back to the first card.
  // Paused while hovered/focused/touched, when the tab is hidden, or under
  // prefers-reduced-motion.
  useEffect(() => {
    if (reduceMotion || slides.length < 2 || SERVICE_CHIPS[chip]) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      scrollToIndex((activeIndexRef.current + 1) % displayed.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, slides.length, displayed.length, chip]);

  function slide(dir: -1 | 1) {
    scrollToIndex(Math.min(displayed.length - 1, Math.max(0, activeIndex + dir)));
  }

  // The active card is whichever one sits closest to the scroller's left edge.
  function handleScroll() {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      const scroller = scrollerRef.current;
      if (!scroller) return;
      let best = 0;
      let bestDist = Infinity;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const dist = Math.abs(card.offsetLeft - scroller.scrollLeft);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActiveIndex(best);
    });

    if (!loop) return;
    window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      let best = 0;
      let bestDist = Infinity;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const dist = Math.abs(card.offsetLeft - scroller.scrollLeft);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      const n = slides.length;
      const target = cardRefs.current[best - n];
      if (best < n || !target) return;
      scroller.style.scrollSnapType = 'none';
      scroller.scrollLeft = target.offsetLeft;
      setActiveIndex(best - n);
      window.requestAnimationFrame(() => {
        scroller.style.scrollSnapType = '';
      });
    }, 150);
  }

  function selectChip(id: OfferChip) {
    setChip(id);
    setActiveIndex(0);
    scrollerRef.current?.scrollTo({ left: 0 });
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
                onClick={() => selectChip(id)}
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
          className="relative mt-4"
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onFocus={() => (pausedRef.current = true)}
          onBlur={() => (pausedRef.current = false)}
          onTouchStart={() => (pausedRef.current = true)}
          onTouchEnd={() => (pausedRef.current = false)}
        >
          {!serviceEmpty && slides.length > 1 && (
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 hidden items-center justify-between md:flex">
              <button
                type="button"
                onClick={() => slide(-1)}
                disabled={activeIndex === 0}
                aria-label="Previous offer"
                className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink shadow-medium transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-40"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => slide(1)}
                disabled={!loop && activeIndex === slides.length - 1}
                aria-label="Next offer"
                className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink shadow-medium transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-40"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </div>
          )}

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="relative flex snap-x snap-mandatory items-center gap-3 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
            displayed.map((pkg, i) => {
              const isActive = i === activeIndex;
              return (
                <article
                  key={`${pkg.id}-${i}`}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  onClick={() => {
                    if (!isActive) scrollToIndex(i);
                  }}
                  className={cn(
                    "group relative flex w-[min(80vw,22rem)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-500 ease-out motion-reduce:transition-none",
                    isActive
                      ? "border-neutral-200 shadow-elevated"
                      : "cursor-pointer border-neutral-200",
                  )}
                >
                  <div className="relative aspect-[400/270] overflow-hidden bg-neutral-100">
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
                    <span
                      className={cn(
                        "absolute left-0 top-0 rounded-br-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white",
                        pkg.category === "international" && "bg-accent",
                        pkg.category === "domestic" && "bg-orange-500",
                        pkg.category === "offer" && "bg-warning-500",
                        pkg.category === "upcoming_event" && "bg-primary-600",
                      )}
                    >
                      {categoryPill(pkg.category)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 p-4">
                    <div
                      className={cn(
                        "overflow-hidden transition-[max-height] duration-500 ease-out motion-reduce:transition-none",
                        isActive ? "max-h-14" : "max-h-0",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold tabular-nums text-primary-800">
                            {formatINR(pkg.price)}
                          </span>
                          {pkg.negotiable && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-accent">
                              neg.
                            </span>
                          )}
                        </p>
                        {pkg.priceNote && (
                          <p className="truncate text-[11px] text-ink-subtle">{pkg.priceNote}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink">
                        {pkg.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                        {pkg.tagline || pkg.priceNote}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "overflow-hidden transition-[max-height] duration-500 ease-out motion-reduce:transition-none",
                        isActive ? "max-h-10" : "max-h-0",
                      )}
                    >
                      <Link
                        href={`/packages/${pkg.id}`}
                        tabIndex={isActive ? 0 : -1}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 transition hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      >
                        View details
                        <ArrowUpRight
                          className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
        </div>

        {!serviceEmpty && slides.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {slides.map((pkg, i) => (
              <button
                key={pkg.id}
                type="button"
                aria-label={`Go to ${pkg.title}`}
                aria-current={i === activeIndex % slides.length}
                onClick={() => scrollToIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 motion-reduce:transition-none",
                  i === activeIndex % slides.length ? "w-7 bg-primary-700" : "w-2 bg-neutral-300 hover:bg-neutral-400",
                )}
              />
            ))}
          </div>
        )}

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
