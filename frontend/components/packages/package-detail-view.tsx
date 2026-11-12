"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Clock,
  MapPin,
  Phone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { getPackage, listPackages } from "@/lib/api/packages";
import { getErrorMessage } from "@/lib/api/client";
import { Container } from "@/components/layout/container";
import { PackageBookingSheet } from "@/components/packages/package-booking-sheet";
import { PackageCard } from "@/components/packages/package-card";
import { BookingStepsGrid } from "@/components/packages/detail/booking-steps-grid";
import { DetailSection } from "@/components/packages/detail/detail-section";
import { ItineraryGrid } from "@/components/packages/detail/itinerary-grid";
import { PackageBrochureCard } from "@/components/packages/detail/package-brochure-card";
import { PackageHighlightsGrid } from "@/components/packages/detail/package-highlights-grid";
import {
  WhatsappInquiryButton,
  WhatsappInquiryStatus,
  useWhatsappInquiry,
} from "@/components/packages/detail/whatsapp-inquiry";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { HELPLINE_DISPLAY, telLink } from "@/lib/contact";
import { formatINR } from "@/lib/format";
import { CATEGORY_LABEL, durationLabel } from "@/lib/packages/package-display";
import type { TravelPackage } from "@/types";

export function PackageDetailView() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId;

  const [pkg, setPkg] = useState<TravelPackage | null>(null);
  const [similar, setSimilar] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const inquiry = useWhatsappInquiry(packageId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!packageId) return;
      setLoading(true);
      setError("");
      try {
        const data = await getPackage(packageId);
        if (!cancelled) setPkg(data);
      } catch (err) {
        if (!cancelled) {
          setPkg(null);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [packageId]);

  // Other packages to compare against; the page works without them.
  useEffect(() => {
    if (!pkg) return;
    let cancelled = false;
    listPackages()
      .then((all) => {
        if (cancelled) return;
        const others = all.filter((p) => p.id !== pkg.id && p.active !== false);
        const sameKind = others.filter((p) => p.category === pkg.category);
        setSimilar([...sameKind, ...others.filter((p) => p.category !== pkg.category)].slice(0, 3));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pkg]);

  return (
    <Container className="pb-6 pt-1 lg:py-5">
      <Link
        href="/packages"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
      >
        <ChevronLeft className="size-4" aria-hidden />
        All packages
      </Link>

      {loading && (
        <div className="mt-2 space-y-4" aria-busy>
          <Skeleton className="-mx-4 h-64 rounded-none sm:mx-0 sm:rounded-2xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-20" />
        </div>
      )}

      {error && !loading && (
        <Card className="mt-2 border-danger-500/30 bg-danger-50 text-danger-700">
          <p role="alert">{error}</p>
          <Link href="/packages" className="mt-3 inline-block text-sm font-semibold text-primary-700">
            Browse all packages
          </Link>
        </Card>
      )}

      {pkg && !loading && (
        <>
          <div className="mt-1 grid gap-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-5">
            <div className="min-w-0 space-y-4 lg:col-span-8 lg:col-start-1 lg:row-start-1">
              <div className="relative -mx-4 aspect-[2/1] overflow-hidden bg-primary-900 sm:mx-0 sm:aspect-[4/1] sm:rounded-2xl sm:border sm:border-neutral-200 lg:aspect-auto lg:h-[170px]">
                {pkg.imageUrl ? (
                  <Image
                    src={pkg.imageUrl}
                    alt={`${pkg.destination} — ${pkg.title}`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-br from-primary-900 to-primary-600" />
                )}
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-semibold text-primary-800">
                    {CATEGORY_LABEL[pkg.category] ?? pkg.category}
                  </span>
                  {pkg.featured && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-white">
                      <Sparkles className="size-3" aria-hidden />
                      Featured
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="flex items-center gap-1 text-xs font-medium text-ink-muted">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {pkg.destination}
                </p>
                <h1 className="mt-1 text-lg font-bold leading-tight text-ink lg:text-xl">{pkg.title}</h1>
                {pkg.tagline && <p className="mt-0.5 text-[13px] text-ink-muted">{pkg.tagline}</p>}

                <dl className="mt-2.5 grid grid-cols-3 gap-1.5">
                  <Fact icon={<Clock className="size-3.5" aria-hidden />} label="Duration" value={durationLabel(pkg.duration)} />
                  {pkg.stays && <Fact icon={<BedDouble className="size-3.5" aria-hidden />} label="Stays" value={pkg.stays} />}
                  {pkg.guests && <Fact icon={<UsersRound className="size-3.5" aria-hidden />} label="Priced for" value={pkg.guests} />}
                  {pkg.eventDate && (
                    <Fact icon={<CalendarDays className="size-4" aria-hidden />} label="Event date" value={pkg.eventDate} />
                  )}
                </dl>

                <div className="mt-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-3 lg:hidden">
                  <p className="text-xs text-ink-muted">Starting from</p>
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xl font-bold text-primary-800">{formatINR(pkg.price)}</span>
                    <span className="text-xs text-ink-muted">{pkg.priceNote}</span>
                  </p>
                  {pkg.negotiable && <p className="mt-0.5 text-xs font-semibold text-accent">Price negotiable</p>}
                  <p className="mt-2 text-xs text-ink-muted">
                    Your expert confirms the final price for your dates and group before you pay anything.
                  </p>
                </div>
              </div>
            </div>

            {/* Right column on desktop; on phones this sits right under the overview. */}
            <aside className="min-w-0 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
              <div className="space-y-4 lg:sticky lg:top-16">
                <Card className="hidden h-fit rounded-xl p-3.5 shadow-elevated lg:block">
              <p className="text-xs text-ink-muted">Starting from</p>
              <p className="text-xl font-bold leading-tight text-primary-800">{formatINR(pkg.price)}</p>
              <p className="text-[11px] text-ink-muted">{pkg.priceNote}</p>
              {pkg.negotiable && (
                <span className="mt-2 inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
                  Price negotiable
                </span>
              )}

              <div className="mt-2.5 space-y-1.5">
                <Button size="sm" variant="accent" className="w-full" onClick={() => setBookingOpen(true)}>
                  Book now
                </Button>
                <p className="text-center text-[11px] text-ink-muted">No payment now · Expert confirms the final price</p>
                <a href={telLink()} className={buttonClasses({ size: "sm", variant: "outline", className: "w-full" })}>
                  Call {HELPLINE_DISPLAY}
                </a>
                <WhatsappInquiryButton inquiry={inquiry} size="sm" compactIcon />
                <WhatsappInquiryStatus inquiry={inquiry} />
                <Link href="/packages" className="block">
                  <Button size="sm" variant="ghost" className="w-full">
                    Browse more packages
                  </Button>
                </Link>
              </div>

              <p className="mt-2 text-[11px] leading-snug text-ink-muted">
                Our travel experts will customise dates, hotels and inclusions for your group.
              </p>
            </Card>
                <PackageBrochureCard pkg={pkg} />
              </div>
            </aside>

            <div className="min-w-0 space-y-7 lg:col-span-8 lg:col-start-1 lg:row-start-2">
              <PackageHighlightsGrid highlights={pkg.highlights} />

              <ItineraryGrid days={pkg.itinerary} />

              <BookingStepsGrid />

              <DetailSection id="package-faq-title" title="Questions">
                <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
                  <Faq q="What does the price cover?">
                    The starting price is {formatINR(pkg.price)} {pkg.priceNote}. Your quote lists exactly what&apos;s
                    included for your dates, hotels and group size.
                  </Faq>
                  <Faq q="Can I change the dates, hotels or plan?">
                    Yes. Tell us what you&apos;d like in your request and your travel expert will tailor the itinerary
                    and quote.
                  </Faq>
                  <Faq q="When do I pay?">
                    Only after you approve the final quote. Sending a booking request is free and doesn&apos;t
                    commit you to anything.
                  </Faq>
                  <Faq q="What if I need to cancel?">
                    Cancellation terms depend on the hotels and services in your final quote, and are shared with it.
                    See our{" "}
                    <Link href="/refund-policy" className="font-semibold text-primary-700 underline">
                      refund &amp; cancellation policy
                    </Link>
                    .
                  </Faq>
                </div>
              </DetailSection>

              <div className="rounded-2xl border border-neutral-200 bg-white p-3 lg:hidden">
                <p className="text-sm font-semibold text-ink">Prefer to talk it through?</p>
                <p className="mt-0.5 text-sm text-ink-muted">Our travel experts reply on call and WhatsApp.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={telLink()} className={buttonClasses({ variant: "outline", size: "xl", className: "w-full text-sm" })}>
                    <Phone className="size-4" aria-hidden />
                    Call
                  </a>
                  <WhatsappInquiryButton inquiry={inquiry} size="xl" className="text-sm" />
                </div>
                <WhatsappInquiryStatus inquiry={inquiry} className="mt-2" />
              </div>
            </div>

          </div>

          {similar.length > 0 && (
            <section className="mt-6 border-t border-neutral-200 pt-4" aria-labelledby="similar-title">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="similar-title" className="text-sm font-bold text-ink">
                  Compare similar holidays
                </h2>
                <Link href="/packages" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-700">
                  See all
                </Link>
              </div>
              <div className="no-scrollbar -mx-4 mt-1 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                {similar.map((p, i) => (
                  <PackageCard key={p.id} pkg={p} index={i} compact className="w-[64vw] max-w-[250px] shrink-0 snap-start sm:w-auto sm:max-w-none" />
                ))}
              </div>
            </section>
          )}

          <StickyActionBar
            totalLabel="Starting from"
            total={formatINR(pkg.price)}
            extra={<p className="truncate text-xs text-ink-muted">{pkg.priceNote}</p>}
            ctaLabel="Book now"
            onClick={() => setBookingOpen(true)}
          />
        </>
      )}

      {pkg && bookingOpen && <PackageBookingSheet pkg={pkg} onClose={() => setBookingOpen(false)} />}
    </Container>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5">
      <dt className="flex items-center gap-1 text-[11px] text-ink-muted">
        <span className="text-primary-600">{icon}</span>
        {label}
      </dt>
      <dd className="text-xs font-semibold leading-snug text-ink">{value}</dd>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {q}
        <ChevronDown className="size-4 shrink-0 text-ink-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <p className="px-3 pb-2.5 text-xs text-ink-muted">{children}</p>
    </details>
  );
}
