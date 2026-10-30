"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { getPackage, listPackages } from "@/lib/api/packages";
import { getErrorMessage } from "@/lib/api/client";
import { Container } from "@/components/layout/container";
import { PackageBookingSheet } from "@/components/packages/package-booking-sheet";
import { PackageCard } from "@/components/packages/package-card";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { HELPLINE_DISPLAY, telLink, whatsappLink } from "@/lib/contact";
import { formatINR } from "@/lib/format";
import { PACKAGE_BROCHURES } from "@/lib/packages/package-brochures";
import { CATEGORY_LABEL, durationLabel, splitItineraryDay } from "@/lib/packages/package-display";
import type { TravelPackage } from "@/types";

export function PackageDetailView() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId;

  const [pkg, setPkg] = useState<TravelPackage | null>(null);
  const [similar, setSimilar] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);

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

  const whatsappMessage = pkg ? `Hi Tripime, I'm interested in the "${pkg.title}" package.` : "";

  return (
    <Container className="pb-8 pt-2 lg:py-8">
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
          <div className="mt-1 grid gap-6 lg:mt-2 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="min-w-0 space-y-6">
              <div className="relative -mx-4 aspect-[4/3] overflow-hidden bg-primary-900 sm:mx-0 sm:aspect-[21/9] sm:rounded-2xl sm:border sm:border-neutral-200 lg:aspect-auto lg:h-[380px]">
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
                <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
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
                <p className="flex items-center gap-1 text-sm font-medium text-ink-muted">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  {pkg.destination}
                </p>
                <h1 className="mt-1 text-2xl font-bold leading-tight text-ink lg:text-3xl">{pkg.title}</h1>
                {pkg.tagline && <p className="mt-1.5 text-base text-ink-muted">{pkg.tagline}</p>}

                <dl className="mt-4 grid grid-cols-3 gap-2">
                  <Fact icon={<Clock className="size-4" aria-hidden />} label="Duration" value={durationLabel(pkg.duration)} />
                  {pkg.stays && <Fact icon={<BedDouble className="size-4" aria-hidden />} label="Stays" value={pkg.stays} />}
                  {pkg.guests && <Fact icon={<UsersRound className="size-4" aria-hidden />} label="Priced for" value={pkg.guests} />}
                  {pkg.eventDate && (
                    <Fact icon={<CalendarDays className="size-4" aria-hidden />} label="Event date" value={pkg.eventDate} />
                  )}
                </dl>

                <div className="mt-4 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 lg:hidden">
                  <p className="text-xs text-ink-muted">Starting from</p>
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-2xl font-bold text-primary-800">{formatINR(pkg.price)}</span>
                    <span className="text-sm text-ink-muted">{pkg.priceNote}</span>
                  </p>
                  {pkg.negotiable && <p className="mt-0.5 text-xs font-semibold text-accent">Price negotiable</p>}
                  <p className="mt-2 text-xs text-ink-muted">
                    Your expert confirms the final price for your dates and group before you pay anything.
                  </p>
                </div>
              </div>

              {pkg.highlights.length > 0 && (
                <DetailSection title="Highlights">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {pkg.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm text-ink">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-700">
                          <Check className="size-3.5" aria-hidden />
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              )}

              {pkg.itinerary.length > 0 && <Itinerary days={pkg.itinerary} />}

              {PACKAGE_BROCHURES[pkg.id]?.length ? (
                <Collapsible
                  title="Package brochure"
                  subtitle="Full itinerary, hotels and pricing as images"
                  icon={<FileText className="size-4" aria-hidden />}
                >
                  <div className="grid gap-3">
                    {PACKAGE_BROCHURES[pkg.id].map((item) => (
                      <a
                        key={item.src}
                        href={item.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.src} alt={item.alt} loading="lazy" className="h-auto w-full object-cover object-top" />
                      </a>
                    ))}
                  </div>
                </Collapsible>
              ) : null}

              <DetailSection title="How booking works">
                <ol className="space-y-3">
                  {[
                    ["Send a booking request", "Pick a month and tell us who's travelling. It takes a minute and costs nothing."],
                    ["Get your final quote", "A travel expert checks availability and confirms hotels, dates and the final price with you."],
                    ["Confirm and pay", "Your trip is booked once you approve the quote and your payment is received."],
                  ].map(([title, body], i) => (
                    <li key={title} className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{title}</p>
                        <p className="text-sm text-ink-muted">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </DetailSection>

              <DetailSection title="Questions">
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

              <div className="rounded-2xl border border-neutral-200 bg-white p-4 lg:hidden">
                <p className="text-sm font-semibold text-ink">Prefer to talk it through?</p>
                <p className="mt-0.5 text-sm text-ink-muted">Our travel experts reply on call and WhatsApp.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={telLink()} className={buttonClasses({ variant: "outline", size: "xl", className: "w-full text-sm" })}>
                    <Phone className="size-4" aria-hidden />
                    Call
                  </a>
                  <a
                    href={whatsappLink(whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClasses({ variant: "secondary", size: "xl", className: "w-full text-sm" })}
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    WhatsApp
                  </a>
                </div>
                {pkg.pdfUrl && (
                  <a
                    href={pkg.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-primary-700"
                  >
                    <FileText className="size-4" aria-hidden />
                    Download itinerary PDF
                  </a>
                )}
              </div>
            </div>

            <Card className="hidden h-fit rounded-2xl shadow-elevated lg:sticky lg:top-24 lg:block">
              <p className="text-xs text-ink-muted">Starting from</p>
              <p className="mt-1 text-3xl font-bold text-primary-800">{formatINR(pkg.price)}</p>
              <p className="mt-1 text-sm text-ink-muted">{pkg.priceNote}</p>
              {pkg.negotiable && (
                <span className="mt-2 inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
                  Price negotiable
                </span>
              )}

              <div className="mt-6 space-y-2">
                <Button size="lg" variant="accent" className="w-full" onClick={() => setBookingOpen(true)}>
                  Book now
                </Button>
                <p className="pb-1 text-center text-xs text-ink-muted">No payment now · Expert confirms the final price</p>
                <a href={telLink()} className={buttonClasses({ size: "lg", variant: "outline", className: "w-full" })}>
                  Call {HELPLINE_DISPLAY}
                </a>
                <a
                  href={whatsappLink(whatsappMessage)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ size: "lg", variant: "secondary", className: "w-full" })}
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp us
                </a>
                {pkg.pdfUrl && (
                  <a
                    href={pkg.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({ size: "lg", variant: "outline", className: "w-full" })}
                  >
                    View itinerary PDF
                  </a>
                )}
                <Link href="/packages" className="block">
                  <Button size="lg" variant="ghost" className="w-full">
                    Browse more packages
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-xs text-ink-subtle">
                Our travel experts will customise dates, hotels and inclusions for your group.
              </p>
            </Card>
          </div>

          {similar.length > 0 && (
            <section className="mt-10 border-t border-neutral-200 pt-6" aria-labelledby="similar-title">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="similar-title" className="text-lg font-bold text-ink">
                  Compare similar holidays
                </h2>
                <Link href="/packages" className="text-sm font-semibold text-primary-700">
                  See all
                </Link>
              </div>
              <div className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                {similar.map((p, i) => (
                  <PackageCard key={p.id} pkg={p} index={i} className="w-[80vw] max-w-[320px] shrink-0 snap-start sm:w-auto sm:max-w-none" />
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
    <div className="rounded-xl border border-neutral-200 bg-white p-2.5">
      <dt className="flex items-center gap-1 text-xs text-ink-muted">
        <span className="text-primary-600">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold leading-snug text-ink">{value}</dd>
    </div>
  );
}

function DetailSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Itinerary({ days }: { days: string[] }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const allOpen = open.size === days.length;

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <DetailSection
      title="Day-by-day itinerary"
      action={
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(days.map((_, i) => i)))}
          className="min-h-11 rounded-lg px-2 text-sm font-semibold text-primary-700"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      }
    >
      <ol className="relative space-y-2 before:absolute before:bottom-4 before:left-[0.9rem] before:top-4 before:w-px before:bg-neutral-200">
        {days.map((day, i) => {
          const { title, detail } = splitItineraryDay(day);
          const isOpen = open.has(i);
          const panelId = `itinerary-day-${i}`;
          return (
            <li key={i} className="relative">
              <button
                type="button"
                aria-expanded={detail ? isOpen : undefined}
                aria-controls={detail ? panelId : undefined}
                onClick={() => detail && toggle(i)}
                className="flex w-full items-start gap-3 rounded-xl py-1.5 text-left"
              >
                <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white ring-4 ring-canvas">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-ink-subtle">Day {i + 1}</span>
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                </span>
                {detail && (
                  <ChevronDown
                    className={cn("mt-2 size-4 shrink-0 text-ink-muted transition", isOpen && "rotate-180")}
                    aria-hidden
                  />
                )}
              </button>
              <AnimatePresence initial={false}>
                {detail && isOpen && (
                  <motion.p
                    id={panelId}
                    className="ml-10 overflow-hidden pb-1 text-sm text-ink-muted"
                    initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                    animate={reduceMotion ? { height: "auto", opacity: 1 } : { height: "auto", opacity: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {detail}
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </DetailSection>
  );
}

function Collapsible({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-neutral-200 bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        {icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">{icon}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {subtitle && <span className="block text-xs text-ink-muted">{subtitle}</span>}
        </span>
        <ChevronDown className="size-4 shrink-0 text-ink-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {q}
        <ChevronDown className="size-4 shrink-0 text-ink-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <p className="px-4 pb-4 text-sm text-ink-muted">{children}</p>
    </details>
  );
}
