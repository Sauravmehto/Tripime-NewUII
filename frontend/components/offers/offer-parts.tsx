"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Landmark, Percent, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { categoryLabel, expiryBadge, formatIsoDate, type OfferItem } from "@/lib/offers/offers";

/** Offer photo, or a neutral brand panel when no image is set. Never substitutes a stock photo. */
export function OfferImage({
  offer,
  className,
  children,
}: {
  offer: OfferItem;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-linear-to-br from-primary-900 to-primary-600", className)}>
      {offer.imageUrl ? (
        // CMS image URLs can be any host; a native img avoids locking offers to next/image remote patterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={offer.imageUrl}
          alt={offer.title}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      {children}
    </div>
  );
}

export function DiscountBadge({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md bg-accent-dark px-2 py-1 text-[11px] font-bold text-white shadow-xs",
        className,
      )}
    >
      <Percent className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{text}</span>
    </span>
  );
}

export function ExpiryBadge({ validUntil, className }: { validUntil: string; className?: string }) {
  const label = expiryBadge(validUntil);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-danger-50 px-2 py-1 text-[11px] font-bold text-danger-700 ring-1 ring-danger-500/30",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function CategoryTag({ offer, className }: { offer: OfferItem; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-primary-800",
        className,
      )}
    >
      {categoryLabel(offer.category)}
    </span>
  );
}

/** Validity, event date, minimum booking amount and starting price. Renders nothing for empty fields. */
export function OfferFacts({ offer, className }: { offer: OfferItem; className?: string }) {
  const rows: { icon: typeof Tag; text: string }[] = [];
  if (offer.validUntil) rows.push({ icon: CalendarDays, text: `Valid till ${formatIsoDate(offer.validUntil)}` });
  if (offer.eventDate) rows.push({ icon: CalendarDays, text: `Event date ${offer.eventDate}` });
  if (offer.minBookingValue > 0) rows.push({ icon: Tag, text: `Minimum booking ${formatINR(offer.minBookingValue)}` });
  if (rows.length === 0) return null;
  return (
    <ul className={cn("grid gap-1.5 text-xs text-ink-muted", className)}>
      {rows.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-1.5">
          <Icon className="size-3.5 shrink-0 text-primary-600" aria-hidden />
          {text}
        </li>
      ))}
    </ul>
  );
}

export function StartingPrice({ offer }: { offer: OfferItem }) {
  if (offer.priceFrom <= 0) return null;
  return (
    <p className="text-sm text-ink-muted">
      From <span className="text-lg font-bold tabular-nums text-primary-800">{formatINR(offer.priceFrom)}</span>
      {offer.priceNote ? <span className="text-xs"> · {offer.priceNote}</span> : null}
    </p>
  );
}

export function BankMark({ offer, size = "md" }: { offer: OfferItem; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-14" : "size-11";
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary-200 bg-white", box)}>
      {offer.bankLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={offer.bankLogoUrl} alt={`${offer.bankName || "Bank"} logo`} className="size-full object-contain p-1.5" />
      ) : (
        <Landmark className="size-5 text-primary-700" aria-hidden />
      )}
    </span>
  );
}

const primaryBtn =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-primary-700 px-3 text-sm font-semibold text-white transition hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";
const secondaryBtn =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-ink transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";

/** "Details" always; the booking/enquiry CTA only when the offer actually links somewhere. */
export function OfferActions({ offer, className }: { offer: OfferItem; className?: string }) {
  return (
    <div className={cn("flex gap-2", className)}>
      <Link href={`/offers/${offer.id}`} className={secondaryBtn}>
        Details
      </Link>
      {offer.ctaHref ? <OfferCta offer={offer} /> : null}
    </div>
  );
}

export function OfferCta({ offer, className }: { offer: OfferItem; className?: string }) {
  if (!offer.ctaHref) return null;
  const content = (
    <>
      {offer.ctaLabel}
      <ArrowUpRight className="size-4" aria-hidden />
    </>
  );
  return offer.ctaExternal ? (
    <a href={offer.ctaHref} target="_blank" rel="noopener noreferrer" className={cn(primaryBtn, className)}>
      {content}
    </a>
  ) : (
    <Link href={offer.ctaHref} className={cn(primaryBtn, className)}>
      {content}
    </Link>
  );
}
