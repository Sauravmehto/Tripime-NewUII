"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getPromoBanners, type PromoBanner } from "@/lib/api/website";

let cached: Promise<PromoBanner[]> | null = null;

/**
 * The active "flight" banner from Admin → Websites → Promotional banner,
 * shown between search results. Renders nothing if none is active or the
 * request fails — a missing promo must never break the results list.
 */
export function FlightPromoBanner() {
  const [banner, setBanner] = useState<PromoBanner | null>(null);

  useEffect(() => {
    let cancelled = false;
    cached ??= getPromoBanners("flight").catch(() => {
      cached = null;
      return [];
    });
    cached.then((items) => {
      if (!cancelled) setBanner(items[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!banner) return null;

  const content = (
    <div className="group relative flex min-h-[96px] items-center overflow-hidden rounded-2xl bg-linear-to-r from-primary-900 via-primary-800 to-primary-600 shadow-soft">
      <div className="absolute inset-y-0 right-0 w-1/2 sm:w-2/5">
        {/* Admins can paste any image URL, so skip the optimiser's domain allow-list. */}
        <Image
          src={banner.imageUrl}
          alt=""
          fill
          unoptimized
          sizes="40vw"
          className="object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
        <div className="absolute inset-0 bg-linear-to-r from-primary-800 via-primary-800/40 to-transparent" />
      </div>
      <div className="relative flex w-full items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
            <Sparkles className="size-3.5 text-accent" aria-hidden />
            Tripime offer
          </p>
          <p className="mt-1 text-lg font-extrabold leading-tight text-white sm:text-xl">{banner.title}</p>
        </div>
        {banner.linkUrl && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-primary-800 shadow-soft">
            Book now <ArrowRight className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
    </div>
  );

  return banner.linkUrl ? (
    <Link href={banner.linkUrl} aria-label={`${banner.title} — Book now`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
      {content}
    </Link>
  ) : (
    content
  );
}
