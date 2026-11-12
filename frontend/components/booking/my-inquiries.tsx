"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, CircleCheck, MapPin, MessageCircle, Package as PackageIcon, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/pill";
import { formatDateTime, formatINR } from "@/lib/format";
import type { InquirySource, InquiryStatus, PackageInquiry } from "@/lib/api/my-bookings";

type Filter = "all" | InquiryStatus;

const STATUS: Record<InquiryStatus, { label: string; tone: "warning" | "primary" | "accent" | "success" | "neutral" | "danger"; hint: string }> = {
  new: {
    label: "New",
    tone: "warning",
    hint: "Saved. Opening WhatsApp doesn't tell us a message was sent, so we are still waiting to hear from you.",
  },
  contacted: { label: "Contacted", tone: "primary", hint: "A Tripime travel expert has been in touch." },
  follow_up_required: { label: "Follow-up required", tone: "warning", hint: "Our team will follow up with you soon." },
  quote_shared: { label: "Quote shared", tone: "accent", hint: "Your quote has been shared. Review it with your expert." },
  converted: { label: "Converted", tone: "success", hint: "Moved forward by our team. Your booking is confirmed only when the booking itself is confirmed." },
  not_interested: { label: "Not interested", tone: "neutral", hint: "Marked as not going ahead." },
  cancelled: { label: "Cancelled", tone: "danger", hint: "This inquiry is closed." },
};

const SOURCE_LABEL: Record<InquirySource, string> = {
  whatsapp: "WhatsApp",
  package_booking: "Booking request",
  brochure_request: "Brochure request",
  contact_form: "Contact form",
  custom_trip: "Custom trip",
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "follow_up_required", label: "Follow-up" },
  { id: "quote_shared", label: "Quote Shared" },
  { id: "converted", label: "Converted" },
  { id: "not_interested", label: "Not Interested" },
  { id: "cancelled", label: "Cancelled" },
];

function InquiryImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-linear-to-br from-primary-900 to-primary-600 sm:aspect-auto sm:w-44">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <PackageIcon className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white/70" aria-hidden />
      )}
    </div>
  );
}

function InquiryCard({ inquiry }: { inquiry: PackageInquiry }) {
  const status = STATUS[inquiry.inquiry_status];
  const confirmed = inquiry.booking_confirmation === "confirmed";
  const title = inquiry.package_name || "General inquiry";
  const updated = inquiry.updated_at !== inquiry.created_at;
  return (
    <li>
      <article className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs transition hover:shadow-soft sm:flex-row">
        <InquiryImage src={inquiry.image_url} alt={title} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">Inquiry · not a booking</Badge>
            <Badge tone={status.tone}>{status.label}</Badge>
            {confirmed ? (
              <Badge tone="success">
                <CircleCheck className="mr-1 size-3" aria-hidden />
                Booking confirmed
              </Badge>
            ) : null}
          </div>
          <div>
            <h3 className="text-base font-bold leading-snug text-ink">{title}</h3>
            {inquiry.destination ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {inquiry.destination}
              </p>
            ) : null}
          </div>
          {inquiry.package_price != null ? (
            <p className="text-sm text-ink-muted">
              Starting from <span className="text-base font-bold tabular-nums text-primary-800">{formatINR(inquiry.package_price)}</span>
              {inquiry.price_note ? <span className="text-xs"> · {inquiry.price_note}</span> : null}
            </p>
          ) : null}
          <dl className="grid gap-x-4 gap-y-1 text-xs text-ink-muted sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5 shrink-0 text-accent" aria-hidden />
              <dt className="sr-only">Inquiry date</dt>
              <dd>{formatDateTime(inquiry.created_at)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="size-3.5 shrink-0 text-accent" aria-hidden />
              <dt className="sr-only">Source</dt>
              <dd>{SOURCE_LABEL[inquiry.inquiry_source]}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCw className="size-3.5 shrink-0 text-accent" aria-hidden />
              <dt className="sr-only">Latest update</dt>
              <dd>{updated ? `Updated ${formatDateTime(inquiry.updated_at)}` : "No updates yet"}</dd>
            </div>
            {inquiry.package_id ? (
              <div className="min-w-0 truncate font-mono text-[11px] text-ink-subtle">
                <dt className="sr-only">Package ID</dt>
                <dd className="truncate" title={inquiry.package_id}>
                  {inquiry.package_id}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="text-xs leading-snug text-ink-muted">{status.hint}</p>
          <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            <span className="font-mono text-[11px] text-ink-subtle">{inquiry.id}</span>
            {inquiry.package_url ? (
              <Link
                href={inquiry.package_url}
                className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800"
              >
                View package
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
}

/** The customer's inquiries, kept clearly apart from bookings. */
export function MyInquiries({ inquiries }: { inquiries: PackageInquiry[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(() => {
    const map = new Map<Filter, number>([["all", inquiries.length]]);
    for (const item of inquiries) map.set(item.inquiry_status, (map.get(item.inquiry_status) ?? 0) + 1);
    return map;
  }, [inquiries]);
  const shown = filter === "all" ? inquiries : inquiries.filter((i) => i.inquiry_status === filter);

  return (
    <section aria-labelledby="my-inquiries-title" className="mt-2">
      <div className="mb-3">
        <h2 id="my-inquiries-title" className="text-lg font-bold text-ink">
          Travel inquiries
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Questions you have sent about packages. An inquiry is not a booking and is never confirmed automatically.
        </p>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <MessageCircle className="mx-auto size-8 text-accent" aria-hidden />
          <p className="mt-3 text-base font-semibold text-ink">No travel inquiries yet.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Explore our travel packages and start planning your next trip.
          </p>
          <Link href="/packages" className={buttonClasses({ variant: "accent", className: "mt-4" })}>
            Explore Packages
          </Link>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Filter inquiries by status" className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map(({ id, label }) => (
              <Chip key={id} scroll active={filter === id} onClick={() => setFilter(id)}>
                {label}
                <span className="ml-1.5 text-[11px] font-bold opacity-70">{counts.get(id) ?? 0}</span>
              </Chip>
            ))}
          </div>
          {shown.length === 0 ? (
            <p role="status" className="rounded-2xl border border-neutral-200 bg-white p-5 text-center text-sm text-ink-muted">
              No inquiries with this status.
            </p>
          ) : (
            <ul className="space-y-3">
              {shown.map((inquiry) => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
