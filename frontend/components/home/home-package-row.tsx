"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/card";
import { listPackages } from "@/lib/api/packages";
import { formatINR } from "@/lib/format";
import { durationLabel } from "@/lib/packages/package-display";
import type { TravelPackage } from "@/types";

/** Live packages from the catalogue, phones only. Desktop keeps the full trending section. */
export function HomePackageRow() {
  const [packages, setPackages] = useState<TravelPackage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPackages()
      .then((all) => {
        if (cancelled) return;
        const sorted = [...all].sort(
          (a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder,
        );
        setPackages(sorted.slice(0, 8));
      })
      .catch(() => !cancelled && setPackages([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (packages && packages.length === 0) return null;

  return (
    <section className="border-b border-neutral-200 bg-canvas py-5 lg:hidden" aria-labelledby="home-packages-title">
      <Container>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <h2 id="home-packages-title" className="text-lg font-bold text-ink">
              Holiday packages
            </h2>
            <p className="text-sm text-ink-muted">Starting prices, planned by real experts</p>
          </div>
          <Link
            href="/packages"
            className="inline-flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-semibold text-primary-700"
          >
            See all
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {packages === null
            ? Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="w-[68vw] max-w-64 shrink-0">
                  <Skeleton className="h-60 rounded-2xl" />
                </li>
              ))
            : packages.map((pkg) => (
                <li key={pkg.id} className="w-[68vw] max-w-64 shrink-0 snap-start">
                  <Link
                    href={`/packages/${pkg.id}`}
                    className="block h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs"
                  >
                    <div className="relative aspect-[4/3] bg-primary-900">
                      {pkg.imageUrl && (
                        <Image src={pkg.imageUrl} alt="" fill sizes="256px" className="object-cover" />
                      )}
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-ink/70 px-2 py-0.5 text-xs font-semibold text-white">
                        <Clock className="size-3" aria-hidden />
                        {durationLabel(pkg.duration)}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-base font-bold text-ink">{pkg.title}</p>
                      <p className="truncate text-xs text-ink-muted">{pkg.destination}</p>
                      <p className="mt-2 text-xs text-ink-subtle">Starting from</p>
                      <p className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-primary-800">{formatINR(pkg.price)}</span>
                        <span className="truncate text-xs text-ink-muted">{pkg.priceNote}</span>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
        </ul>
      </Container>
    </section>
  );
}
