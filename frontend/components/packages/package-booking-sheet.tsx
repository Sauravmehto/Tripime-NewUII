"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { CalendarDays, CheckCircle2, Loader2, Minus, MessageCircle, Plus, UsersRound } from "lucide-react";
import { createEnquiry } from "@/lib/api/enquiries";
import { getErrorMessage } from "@/lib/api/client";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { whatsappLink } from "@/lib/contact";
import { durationLabel } from "@/lib/packages/package-display";
import { useCustomerProfileOptional } from "@/context/customer-profile-provider";
import type { Enquiry, TravelPackage } from "@/types";

const MAX_TRAVELLERS = 20; // backend limit for an enquiry
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Draft {
  month: string;
  adults: number;
  children: number;
  name: string;
  phone: string;
  email: string;
  note: string;
}

type Errors = Partial<Record<"month" | "name" | "phone" | "email", string>>;

const EMPTY: Draft = { month: "", adults: 2, children: 0, name: "", phone: "", email: "", note: "" };

function draftKey(packageId: string) {
  return `tripime_package_request_${packageId}`;
}

function readDraft(packageId: string): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey(packageId));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : null;
  } catch {
    return null;
  }
}

function dateValueToLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function normalizeStoredDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function currentDateValue() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nationalFromE164(mobile: string, countryCode?: string): string {
  const digits = mobile.replace(/\D/g, "");
  const cc = (countryCode || "+91").replace(/\D/g, "");
  return cc && digits.startsWith(cc) ? digits.slice(cc.length) : digits;
}

function validate(d: Draft): Errors {
  const errors: Errors = {};
  if (!d.month) errors.month = "Pick a preferred travel date";
  if (d.name.trim().length < 2) errors.name = "Enter your full name";
  const digits = d.phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) errors.phone = "Enter a valid mobile number";
  if (!EMAIL_RE.test(d.email.trim())) errors.email = d.email.trim() ? "Enter a valid email address" : "Enter your email";
  return errors;
}

interface PackageBookingSheetProps {
  pkg: TravelPackage;
  onClose: () => void;
}

/**
 * Packages have no online checkout: this sends a booking request (an enquiry) that a
 * travel expert confirms on price and availability before any payment is taken.
 */
export function PackageBookingSheet({ pkg, onClose }: PackageBookingSheetProps) {
  const profile = useCustomerProfileOptional();
  const formRef = useRef<HTMLFormElement>(null);
  const dateMin = useMemo(() => currentDateValue(), []);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const canPersistRef = useRef(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [sent, setSent] = useState<Enquiry | null>(null);

  useEffect(() => {
    // Avoid persisting stale/empty state while restoring from storage.
    canPersistRef.current = false;
    const saved = readDraft(pkg.id);
    const customer = profile?.customer;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage / lead profile
    setDraft((prev) => {
      const base = saved ?? prev;
      return {
        ...base,
        month: normalizeStoredDate(base.month),
        name: base.name || customer?.name || "",
        email: base.email || customer?.email || "",
        phone: base.phone || (customer ? nationalFromE164(customer.mobile, customer.countryCode) : ""),
      };
    });
    // Enable persistence only after the restore pass has committed.
    window.setTimeout(() => {
      canPersistRef.current = true;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg.id]);

  useEffect(() => {
    if (!canPersistRef.current || sent) return;
    try {
      window.sessionStorage.setItem(draftKey(pkg.id), JSON.stringify(draft));
    } catch {
      // Private mode: the form still works, it just isn't kept.
    }
  }, [draft, sent, pkg.id]);

  function update(patch: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch)) delete next[key as keyof Errors];
      return next;
    });
    setServerError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      window.setTimeout(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 0);
      return;
    }
    setSubmitting(true);
    setServerError("");
    const party = `Adults: ${draft.adults} · Children: ${draft.children}`;
    try {
      const enquiry = await createEnquiry({
        source: "package",
        packageId: pkg.id,
        packageTitle: pkg.title,
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        travelMonth: dateValueToLabel(draft.month),
        travelers: draft.adults + draft.children,
        message: draft.note.trim() ? `${party}\n${draft.note.trim()}` : party,
      });
      try {
        window.sessionStorage.removeItem(draftKey(pkg.id));
      } catch {
        // ignore
      }
      (window as Window & { dataLayer?: unknown[] }).dataLayer?.push({
        event: "package_booking_request",
        package_id: pkg.id,
        travellers: draft.adults + draft.children,
      });
      setSent(enquiry);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    const travelWhen = dateValueToLabel(draft.month);
    const message = [
      `Hi Tripime, I just sent a booking request (ref ${sent.id}).`,
      `*Package:* ${pkg.title}`,
      `*When:* ${travelWhen}`,
      `*Travellers:* ${draft.adults} adult${draft.adults === 1 ? "" : "s"}${draft.children ? `, ${draft.children} child${draft.children === 1 ? "" : "ren"}` : ""}`,
    ].join("\n");
    return (
      <Modal open onClose={onClose} title="Booking request sent" className="sm:max-w-lg">
        <div className="flex flex-col items-center pb-1 pt-2 text-center" role="status">
          <CheckCircle2 className="size-10 text-success-500" aria-hidden />
          <p className="mt-2.5 text-base font-semibold text-ink sm:text-lg">
            Thanks, {draft.name.trim().split(" ")[0]}!
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            We&apos;ve received your request for <strong className="text-ink">{pkg.title}</strong>.
          </p>
          <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-1.5 font-mono text-xs text-ink sm:text-sm">
            Ref: {sent.id}
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/60 p-3.5 text-[13px] sm:text-sm">
          <p className="font-semibold text-ink">Your trip isn&apos;t confirmed yet. Here&apos;s what happens next:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-muted">
            <li>A Tripime travel expert calls or WhatsApps you to check dates and availability.</li>
            <li>You get a final quote for your group. Nothing is charged before you approve it.</li>
            <li>Your booking is confirmed once you accept the quote and payment is received.</li>
          </ol>
        </div>
        <div className="mt-5 grid gap-2">
          <a
            href={whatsappLink(message)}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ size: "xl", variant: "secondary", className: "w-full" })}
          >
            <MessageCircle className="size-4" aria-hidden />
            Chat with us on WhatsApp
          </a>
          <Button size="lg" variant="outline" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  const total = draft.adults + draft.children;

  return (
    <Modal open onClose={onClose} title="Request to book" className="sm:max-w-xl">
      <div className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
        {pkg.imageUrl && (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
            <Image src={pkg.imageUrl} alt="" fill sizes="64px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink sm:text-sm">{pkg.title}</p>
          <p className="text-xs text-ink-muted">{durationLabel(pkg.duration)}</p>
          <p className="mt-0.5 text-sm sm:text-[13px]">
            <span className="font-bold text-primary-800">{formatINR(pkg.price)}</span>{" "}
            <span className="text-xs text-ink-muted">{pkg.priceNote}</span>
          </p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <Step icon={<CalendarDays className="size-4" aria-hidden />} title="When do you want to go?">
          <div className="space-y-2.5">
            <Field label="Preferred travel date">
              <Input
                type="date"
                min={dateMin}
                value={draft.month}
                aria-invalid={errors.month ? true : undefined}
                onChange={(e) => update({ month: e.target.value })}
                className={cn("h-10 min-h-10 text-sm", errors.month ? "border-danger-500" : "")}
              />
            </Field>
          </div>
          {errors.month && <FieldError msg={errors.month} />}
        </Step>

        <Step icon={<UsersRound className="size-4" aria-hidden />} title="Who's travelling?">
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            <Counter
              label="Adults"
              hint="12+ years"
              value={draft.adults}
              min={1}
              max={MAX_TRAVELLERS - draft.children}
              onChange={(adults) => update({ adults })}
            />
            <Counter
              label="Children"
              hint="Under 12"
              value={draft.children}
              min={0}
              max={MAX_TRAVELLERS - draft.adults}
              onChange={(children) => update({ children })}
            />
          </div>
          {total >= MAX_TRAVELLERS && (
            <p className="mt-1.5 text-xs text-ink-muted">For groups over {MAX_TRAVELLERS}, mention it in the note below.</p>
          )}
        </Step>

        <Step title="Your contact details">
          <div className="space-y-3">
            <Field label="Full name" error={errors.name}>
              <Input
                autoComplete="name"
                value={draft.name}
                aria-invalid={errors.name ? true : undefined}
                onChange={(e) => update({ name: e.target.value })}
                className={cn("h-10 min-h-10 text-sm", errors.name ? "border-danger-500" : "")}
              />
            </Field>
            <Field label="Mobile number" error={errors.phone} hint="We'll call or WhatsApp you on this number.">
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98765 43210"
                maxLength={20}
                value={draft.phone}
                aria-invalid={errors.phone ? true : undefined}
                onChange={(e) => update({ phone: e.target.value })}
                className={cn("h-10 min-h-10 text-sm", errors.phone ? "border-danger-500" : "")}
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={draft.email}
                aria-invalid={errors.email ? true : undefined}
                onChange={(e) => update({ email: e.target.value })}
                className={cn("h-10 min-h-10 text-sm", errors.email ? "border-danger-500" : "")}
              />
            </Field>
            <Field label="Anything we should know? (optional)">
              <Textarea
                rows={2}
                maxLength={1000}
                value={draft.note}
                onChange={(e) => update({ note: e.target.value })}
                placeholder="Exact dates, hotel preference, budget…"
                className="min-h-[72px] text-sm"
              />
            </Field>
          </div>
        </Step>

        {serverError && (
          <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
            {serverError}
          </p>
        )}

        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-neutral-200 bg-white/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm sm:-mx-6 sm:-mb-6 sm:px-6">
          <Button type="submit" size="xl" variant="accent" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Sending…
              </>
            ) : (
              "Send booking request"
            )}
          </Button>
          <p className="mt-2 text-center text-[11px] text-ink-muted sm:text-xs">
            No payment now. An expert confirms availability and the final price first.
          </p>
        </div>
      </form>
    </Modal>
  );
}

function Step({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink sm:text-sm">
        {icon && <span className="text-primary-600">{icon}</span>}
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Counter({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex size-10 items-center justify-center rounded-xl border border-neutral-200 text-ink transition hover:bg-neutral-50 disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums text-ink" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex size-10 items-center justify-center rounded-xl border border-neutral-200 text-ink transition hover:bg-neutral-50 disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-danger-700">
      {msg}
    </p>
  );
}
