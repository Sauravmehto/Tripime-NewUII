"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getPackage } from "@/lib/api/packages";
import { getErrorMessage } from "@/lib/api/client";
import { Container } from "@/components/layout/container";
import { EnquiryModal } from "@/components/packages/enquiry-modal";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { HELPLINE_DISPLAY, HELPLINE_NUMBER, whatsappLink } from "@/lib/contact";
import { formatINR } from "@/lib/format";
import { PACKAGE_BROCHURES } from "@/lib/packages/package-brochures";
import type { TravelPackage } from "@/types";

const CATEGORY_LABEL: Record<string, string> = {
  domestic: "Domestic",
  international: "International",
  offer: "Offer",
  upcoming_event: "Upcoming event",
};

export function PackageDetailView() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId;

  const [pkg, setPkg] = useState<TravelPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enquiryOpen, setEnquiryOpen] = useState(false);

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

  return (
    <Container className="py-8 pb-24 lg:pb-8">
      <div className="mb-6">
        <Link
          href="/packages"
          className="text-xs font-semibold text-primary-700 hover:text-primary-800"
        >
          ← Back to packages
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">{pkg?.title ?? "Package details"}</h1>
        {pkg && <p className="mt-1 text-sm text-ink-muted">{pkg.tagline}</p>}
      </div>

      {loading && (
        <Card>
          <Skeleton className="h-64" />
          <Skeleton className="mt-4 h-24" />
        </Card>
      )}

      {error && (
        <Card className="border-danger-500/30 bg-danger-50 text-danger-700">
          <p>{error}</p>
          <Link href="/packages" className="mt-3 inline-block text-sm font-semibold text-primary-700">
            Browse all packages
          </Link>
        </Card>
      )}

      {pkg && !loading && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 shadow-xs sm:aspect-[21/9] lg:aspect-auto lg:h-[380px]">
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
              <div className="absolute inset-0 bg-linear-to-t from-[rgba(7,29,77,0.65)] to-[rgba(7,29,77,0.15)]" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                  {CATEGORY_LABEL[pkg.category] ?? pkg.category}
                </p>
                <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{pkg.destination}</h2>
              </div>
            </div>

            {PACKAGE_BROCHURES[pkg.id]?.length ? (
              <Card>
                <h2 className="font-semibold text-ink">Package brochure</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Full itinerary, hotel, flights and price — tap an image to view it larger.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {PACKAGE_BROCHURES[pkg.id].map((item) => (
                    <a
                      key={item.src}
                      href={item.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.src}
                        alt={item.alt}
                        className="h-auto w-full object-cover object-top"
                      />
                    </a>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card>
              <h2 className="font-semibold text-ink">Trip overview</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-subtle">Duration</dt>
                  <dd className="mt-1 font-semibold text-ink">{pkg.duration}</dd>
                </div>
                {pkg.stays && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-subtle">Stays</dt>
                    <dd className="mt-1 font-semibold text-ink">{pkg.stays}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-subtle">Guests</dt>
                  <dd className="mt-1 font-semibold text-ink">{pkg.guests}</dd>
                </div>
                {pkg.eventDate && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-subtle">Event date</dt>
                    <dd className="mt-1 font-semibold text-ink">{pkg.eventDate}</dd>
                  </div>
                )}
              </dl>
            </Card>

            {pkg.highlights.length > 0 && (
              <Card>
                <h2 className="font-semibold text-ink">Highlights</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {pkg.highlights.map((h) => (
                    <li
                      key={h}
                      className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-primary-800"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {pkg.itinerary.length > 0 && (
              <Card>
                <h2 className="font-semibold text-ink">Day-by-day itinerary</h2>
                <ol className="mt-4 space-y-3">
                  {pkg.itinerary.map((day, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3 text-sm text-ink-muted"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-800 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{day}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>

          <Card className="h-fit rounded-2xl shadow-elevated lg:sticky lg:top-24">
            <h2 className="font-semibold text-ink">Pricing</h2>
            {pkg.negotiable && (
              <span className="mt-2 inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
                Price negotiable
              </span>
            )}
            <p className="mt-3 text-3xl font-bold text-primary-800">{formatINR(pkg.price)}</p>
            <p className="mt-1 text-sm text-ink-muted">{pkg.priceNote}</p>

            <div className="mt-6 space-y-2">
              <Button
                size="lg"
                className="hidden w-full lg:inline-flex"
                onClick={() => setEnquiryOpen(true)}
              >
                Enquire now
              </Button>
              <a href={`tel:${HELPLINE_NUMBER}`} className="block">
                <Button size="lg" variant="outline" className="w-full">
                  Call {HELPLINE_DISPLAY}
                </Button>
              </a>
              <a
                href={whatsappLink(`Hi Tripime, I'm interested in the "${pkg.title}" package.`)}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button size="lg" variant="secondary" className="w-full">
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp us
                </Button>
              </a>
              {pkg.pdfUrl && (
                <a href={pkg.pdfUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button size="lg" variant="outline" className="w-full">
                    View itinerary PDF
                  </Button>
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
      )}

      {pkg && !loading && (
        <StickyActionBar
          totalLabel="Starting from"
          total={formatINR(pkg.price)}
          ctaLabel="Enquire now"
          onClick={() => setEnquiryOpen(true)}
        />
      )}

      {pkg && enquiryOpen && (
        <EnquiryModal pkg={pkg} onClose={() => setEnquiryOpen(false)} />
      )}
    </Container>
  );
}
