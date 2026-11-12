"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { Bus, CalendarClock, Hotel, Landmark, Luggage, Plane, Sparkles, Ticket, type LucideIcon } from "lucide-react";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/cn";
import {
  categoryLabel,
  daysUntil,
  expiryBadge,
  formatIsoDate,
  VISIBLE_OFFER_CATEGORIES,
  type OfferCategory,
  type OfferItem,
} from "@/lib/offers/offers";

const TILE_ICONS: Record<Exclude<OfferCategory, "all">, LucideIcon> = {
  holidays: Luggage,
  hotels: Hotel,
  flights: Plane,
  bus: Bus,
  "bank-offers": Landmark,
  activities: Ticket,
};

function CountUp({ value, reduceMotion }: { value: number; reduceMotion: boolean }) {
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  useEffect(() => {
    if (reduceMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced motion: show the final number at once
      setShown(value);
      return;
    }
    const controls = animate(0, value, { duration: 0.9, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [value, reduceMotion]);
  return <span className="tabular-nums">{shown}</span>;
}

/** The soonest real end date among live offers, or null when none has one. */
function soonestExpiry(offers: OfferItem[]): { iso: string; urgent: string | null } | null {
  let best: string | null = null;
  for (const offer of offers) {
    if (!offer.validUntil || daysUntil(offer.validUntil) === null) continue;
    if (best === null || offer.validUntil < best) best = offer.validUntil;
  }
  return best ? { iso: best, urgent: expiryBadge(best) } : null;
}

interface OffersHeroProps {
  offers: OfferItem[] | null;
  category: OfferCategory;
  counts: Map<OfferCategory, number>;
  onSelect: (category: OfferCategory) => void;
}

export function OffersHero({ offers, category, counts, onSelect }: OffersHeroProps) {
  const reduceMotion = !!useReducedMotion();
  const live = offers?.length ?? 0;
  const categoriesWithOffers = VISIBLE_OFFER_CATEGORIES.filter((c) => c.id !== "all" && (counts.get(c.id) ?? 0) > 0).length;
  const soonest = offers ? soonestExpiry(offers) : null;

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="relative isolate overflow-hidden border-b border-neutral-200 bg-linear-to-br from-primary-900 via-primary-800 to-primary-700 text-white">
      {!reduceMotion && (
        <>
          <motion.span
            aria-hidden
            className="absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-accent/20 blur-2xl"
            animate={{ y: [0, 18, 0], x: [0, -12, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute -bottom-20 left-1/4 -z-10 size-72 rounded-full bg-white/10 blur-3xl"
            animate={{ y: [0, -16, 0], x: [0, 14, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <Container className="py-8 sm:py-10">
        <motion.p
          {...rise(0.05)}
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-white/25"
        >
          <Sparkles className="size-3.5" aria-hidden />
          Offers Zone
        </motion.p>
        <motion.h1 {...rise(0.1)} className="mt-3 text-2xl font-bold leading-tight sm:text-4xl">
          Travel offers, all in one place
        </motion.h1>
        <motion.p {...rise(0.16)} className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
          Browse current offers across holidays, hotels, flights, buses, bank deals and activities. Check what is
          included, how long it is valid, and copy the coupon code if one applies.
        </motion.p>

        {live > 0 && (
          <motion.dl {...rise(0.22)} className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-xl bg-white/12 px-4 py-2 ring-1 ring-white/20 backdrop-blur-sm">
              <dt className="text-[11px] font-medium text-white/75">Live offers</dt>
              <dd className="text-2xl font-bold">
                <CountUp value={live} reduceMotion={reduceMotion} />
              </dd>
            </div>
            <div className="rounded-xl bg-white/12 px-4 py-2 ring-1 ring-white/20 backdrop-blur-sm">
              <dt className="text-[11px] font-medium text-white/75">Categories</dt>
              <dd className="text-2xl font-bold">
                <CountUp value={categoriesWithOffers} reduceMotion={reduceMotion} />
              </dd>
            </div>
            {soonest && (
              <div className="rounded-xl bg-white/12 px-4 py-2 ring-1 ring-white/20 backdrop-blur-sm">
                <dt className="flex items-center gap-1 text-[11px] font-medium text-white/75">
                  <CalendarClock className="size-3" aria-hidden />
                  Next offer ends
                </dt>
                <dd className="text-sm font-bold leading-8">{soonest.urgent ?? formatIsoDate(soonest.iso)}</dd>
              </div>
            )}
          </motion.dl>
        )}

        <motion.div
          {...rise(0.28)}
          role="group"
          aria-label="Browse offers by category"
          className="no-scrollbar mt-6 flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5"
        >
          {VISIBLE_OFFER_CATEGORIES.filter((c) => c.id !== "all").map((item) => {
            const id = item.id as Exclude<OfferCategory, "all">;
            const Icon = TILE_ICONS[id];
            const count = counts.get(item.id) ?? 0;
            const active = category === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                aria-pressed={active}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => onSelect(active ? "all" : item.id)}
                className={cn(
                  "flex min-h-16 w-32 shrink-0 flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto",
                  active
                    ? "border-white bg-white text-primary-800 shadow-elevated"
                    : "border-white/25 bg-white/10 text-white hover:bg-white/18",
                )}
              >
                <span className="flex w-full items-center justify-between">
                  <Icon className="size-5" aria-hidden />
                  {offers && count > 0 ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[11px] font-bold",
                        active ? "bg-primary-100 text-primary-800" : "bg-white/20",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs font-semibold">{categoryLabel(item.id)}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </Container>
    </section>
  );
}
