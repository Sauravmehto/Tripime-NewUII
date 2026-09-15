"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, MessageCircle, Sparkles, Star } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { whatsappLink } from "@/lib/contact";
import type { TravelPackage } from "@/types";

const CATEGORY_LABEL: Record<TravelPackage["category"], string> = {
  domestic: "India",
  international: "Intl",
  offer: "Offer",
  upcoming_event: "Event",
};

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
  const highlights = pkg.highlights.slice(0, featured ? 3 : 2);
  const extra = pkg.highlights.length - highlights.length;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-xs transition-[border-color,box-shadow] duration-300 hover:border-primary-200 hover:shadow-medium",
        featured && "ring-1 ring-primary-100",
        className,
      )}
    >
      <div
        className={cn(
          "relative isolate aspect-[4/3] shrink-0 overflow-hidden",
          featured && "sm:aspect-[16/10]",
        )}
      >
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
        <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/15 to-transparent" />

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <span className="rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-800">
            {CATEGORY_LABEL[pkg.category]}
          </span>
          {themeName && (
            <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink">
              {themeName}
            </span>
          )}
          {pkg.featured && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              <Sparkles className="size-2.5" aria-hidden />
              Featured
            </span>
          )}
        </div>

        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-ink/65 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <Clock className="size-2.5" aria-hidden />
          {pkg.duration}
        </span>

        <div className="absolute inset-x-2.5 bottom-2">
          <p className="flex items-center gap-1 text-[10px] font-medium text-white/80">
            <MapPin className="size-2.5 shrink-0" aria-hidden />
            <span className="truncate">{pkg.destination}</span>
          </p>
          <h3 className="mt-0.5 truncate text-sm font-bold leading-tight text-white">
            {pkg.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        {pkg.tagline && (
          <p className="line-clamp-1 text-[11px] leading-snug text-ink-muted">{pkg.tagline}</p>
        )}

        {highlights.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {highlights.map((h) => (
              <li
                key={h}
                className="max-w-[9rem] truncate rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted"
              >
                {h}
              </li>
            ))}
            {extra > 0 && (
              <li className="px-0.5 py-0.5 text-[10px] font-semibold text-ink-subtle">+{extra}</li>
            )}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-neutral-100 pt-2">
          <div className="min-w-0">
            <p className="flex items-baseline gap-1">
              <span className="text-[15px] font-bold tabular-nums text-primary-800">
                {formatINR(pkg.price)}
              </span>
              {pkg.negotiable && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-accent">
                  neg.
                </span>
              )}
            </p>
            <p className="truncate text-[10px] text-ink-subtle">{pkg.priceNote}</p>
          </div>

          <div className="relative z-20 flex shrink-0 items-center gap-1">
            <a
              href={whatsappLink(`Hi Tripime, I'm interested in the "${pkg.title}" package.`)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Ask about ${pkg.title} on WhatsApp`}
              className="flex size-7 items-center justify-center rounded-lg border border-neutral-200 text-success-700 transition hover:border-success-200 hover:bg-success-50"
            >
              <MessageCircle className="size-3.5" aria-hidden />
            </a>
            <span
              className="flex h-7 items-center gap-1 rounded-lg bg-primary-600 px-2 text-[11px] font-semibold text-white transition group-hover:bg-primary-700"
              aria-hidden
            >
              View
              <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>

        {(pkg.guests || pkg.stays) && (
          <p className="flex items-center gap-1 text-[10px] text-ink-subtle">
            <Star className="size-2.5 text-warning-500" aria-hidden />
            {[pkg.guests, pkg.stays].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <Link
        href={`/packages/${pkg.id}`}
        aria-label={`View ${pkg.title}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      />
    </motion.article>
  );
}
