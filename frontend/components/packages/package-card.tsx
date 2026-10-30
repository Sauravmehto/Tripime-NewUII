"use client";

import Image from "next/image";
import Link from "next/link";
import { BedDouble, Check, ChevronRight, Clock, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { whatsappLink } from "@/lib/contact";
import { CATEGORY_LABEL, durationLabel } from "@/lib/packages/package-display";
import type { TravelPackage } from "@/types";

interface PackageCardProps {
  pkg: TravelPackage;
  featured?: boolean;
  index?: number;
  className?: string;
  themeName?: string;
}

export function PackageCard({
  pkg,
  featured = false,
  index = 0,
  className,
  themeName,
}: PackageCardProps) {
  const reduceMotion = useReducedMotion();
  const highlights = pkg.highlights.slice(0, 3);
  const extra = pkg.highlights.length - highlights.length;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.995 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-xs transition-[border-color,box-shadow] duration-300 hover:border-primary-200 hover:shadow-medium",
        featured && "ring-1 ring-primary-100",
        className,
      )}
    >
      <div className="relative isolate aspect-[16/10] shrink-0 overflow-hidden bg-primary-900">
        {pkg.imageUrl ? (
          <Image
            src={pkg.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 320px, (min-width: 640px) 45vw, 92vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-primary-900 to-primary-600" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-ink/55 via-ink/10 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-semibold text-primary-800">
            {CATEGORY_LABEL[pkg.category]}
          </span>
          {themeName && (
            <span className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink">
              {themeName}
            </span>
          )}
          {pkg.featured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-white">
              <Sparkles className="size-3" aria-hidden />
              Featured
            </span>
          )}
        </div>

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-ink/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          <Clock className="size-3" aria-hidden />
          {durationLabel(pkg.duration)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 text-xs font-medium text-ink-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{pkg.destination}</span>
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-ink">{pkg.title}</h3>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {durationLabel(pkg.duration)}
          </span>
          {pkg.stays && (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="size-3.5" aria-hidden />
              {pkg.stays}
            </span>
          )}
        </p>

        {highlights.length > 0 && (
          <ul className="mt-3 space-y-1" aria-label="Highlights">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-1.5 text-sm text-ink">
                <Check className="size-3.5 shrink-0 text-success-700" aria-hidden />
                <span className="truncate">{h}</span>
              </li>
            ))}
            {extra > 0 && (
              <li className="pl-5 text-xs font-semibold text-ink-subtle">+{extra} more</li>
            )}
          </ul>
        )}

        <div className="flex-1" aria-hidden />
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-neutral-100 pt-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-subtle">Starting from</p>
            <p className="text-lg font-bold leading-tight tabular-nums text-primary-800">
              {formatINR(pkg.price)}
            </p>
            <p className="truncate text-xs text-ink-muted">
              {pkg.priceNote}
              {pkg.negotiable && <span className="font-semibold text-accent"> · Negotiable</span>}
            </p>
          </div>

          <div className="relative z-20 flex shrink-0 items-center gap-1.5">
            <a
              href={whatsappLink(`Hi Tripime, I'm interested in the "${pkg.title}" package.`)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Ask about ${pkg.title} on WhatsApp`}
              className="flex size-11 items-center justify-center rounded-xl border border-neutral-200 text-success-700 transition hover:border-success-200 hover:bg-success-50 active:scale-95"
            >
              <MessageCircle className="size-4" aria-hidden />
            </a>
            <span
              className="flex h-11 items-center gap-0.5 rounded-xl bg-primary-600 pl-3.5 pr-2.5 text-sm font-semibold text-white transition group-hover:bg-primary-700 group-active:scale-[0.98]"
              aria-hidden
            >
              Details
              <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>

      <Link
        href={`/packages/${pkg.id}`}
        aria-label={`View ${pkg.title}, ${durationLabel(pkg.duration)}, from ${formatINR(pkg.price)} ${pkg.priceNote}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      />
    </motion.article>
  );
}
