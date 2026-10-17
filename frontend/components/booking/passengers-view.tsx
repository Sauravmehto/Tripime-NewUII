"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Baby, BookUser, Mail, Phone, UserRound } from "lucide-react";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { FareSummaryCard } from "@/components/flights/fare-summary-card";
import { FlightItineraryCard } from "@/components/flights/flight-itinerary-card";
import { FlightRouteBar } from "@/components/flights/flight-route-bar";
import { Stepper } from "@/components/booking/stepper";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { getBooking, getDocumentRequirements, saveBookingDraft } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/client";
import { formatINR } from "@/lib/format";
import { todayISO } from "@/lib/flights/calendar";
import { fareSummaryRows, passengerTypeLabel, priceTrip } from "@/lib/flights/pricing";
import {
  TITLES,
  dobBounds,
  duplicateTravellers,
  passengerFormsFor,
  passportValidityWarning,
  validatePassenger,
} from "@/lib/flights/passengers";
import { flightsHref } from "@/lib/flights/search-params";
import { PHONE_COUNTRIES, phoneError } from "@/lib/phone-countries";
import type { DocumentRequirements, PassengerForm } from "@/types";

type FieldErrors = Record<string, string>;

const TYPE_HINT = { adult: "12+ years", child: "2–11 years", infant: "Under 2 · travels on an adult's lap" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// One option per dialling code (US and Canada share +1).
const DIAL_OPTIONS = PHONE_COUNTRIES.filter((c, i, all) => all.findIndex((x) => x.dial === c.dial) === i);

function newCheckoutKey(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `co_${random.replace(/[^A-Za-z0-9]/g, "")}`.slice(0, 64);
}

export function PassengersView() {
  const router = useRouter();
  const {
    search,
    selectedFlight,
    selectedReturnFlight,
    passengers,
    setPassengers,
    contact,
    setContact,
    checkout,
    setCheckout,
  } = useBooking();
  const formRef = useRef<HTMLFormElement>(null);

  const [forms, setForms] = useState<PassengerForm[]>(() => (search ? passengerFormsFor(search, passengers) : []));
  const [email, setEmail] = useState(contact.email);
  const [dial, setDial] = useState(contact.countryCode || "+91");
  const [phone, setPhone] = useState(contact.phone);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requirements, setRequirements] = useState<DocumentRequirements | null>(null);
  const [loadError, setLoadError] = useState("");
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  // What documents this exact itinerary needs, from the API (not guessed here).
  useEffect(() => {
    if (!selectedFlight) return;
    let cancelled = false;
    getDocumentRequirements(selectedFlight.id, selectedReturnFlight?.id)
      .then((r) => !cancelled && setRequirements(r))
      .catch((err) => !cancelled && setLoadError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [selectedFlight, selectedReturnFlight]);

  // Coming back to edit: passport details aren't kept in the browser, so reload the server draft.
  useEffect(() => {
    if (!checkout?.bookingId) return;
    let cancelled = false;
    getBooking(checkout.bookingId)
      .then((booking) => {
        if (cancelled) return;
        setForms(
          booking.passengers.map((p) => ({
            type: p.type,
            title: p.title,
            firstName: p.firstName,
            lastName: p.lastName,
            gender: p.gender,
            dateOfBirth: p.dateOfBirth,
            passportNumber: p.passportNumber ?? undefined,
            nationality: p.nationality ?? undefined,
            passportExpiry: p.passportExpiry ?? undefined,
          })),
        );
        setEmail(booking.contact.email);
        setDial(booking.contact.countryCode || "+91");
        setPhone(booking.contact.phone);
      })
      .catch(() => {
        // Draft gone (e.g. expired session): continue with what's in the form.
      });
    return () => {
      cancelled = true;
    };
  }, [checkout?.bookingId]);

  const today = useMemo(() => todayISO(), []);

  function clearError(key: string) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updatePassenger(index: number, patch: Partial<PassengerForm>) {
    setForms((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    for (const k of Object.keys(patch)) clearError(`p${index}.${k}`);
    setServerError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedFlight || !requirements || saving) return;
    const next: FieldErrors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = email.trim() ? "Enter a valid email address" : "Required";
    const phoneProblem = phoneError(dial, phone);
    if (phoneProblem) next.phone = phoneProblem;
    forms.forEach((p, i) => {
      for (const [field, message] of Object.entries(validatePassenger(p, { firstTravel: selectedFlight.departureDate, requirements }))) {
        next[`p${i}.${field}`] = message;
      }
    });
    for (const i of duplicateTravellers(forms)) next[`p${i}.firstName`] = "This traveller is already listed";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Focus the first invalid field (DOM order).
      window.setTimeout(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 0);
      return;
    }

    setSaving(true);
    setServerError("");
    const key = checkout?.key ?? newCheckoutKey();
    const cleanContact = { email: email.trim(), countryCode: dial, phone: phone.trim() };
    try {
      const booking = await saveBookingDraft({
        checkoutKey: key,
        flightId: selectedFlight.id,
        returnFlightId: selectedReturnFlight?.id ?? null,
        passengers: forms,
        contact: cleanContact,
      });
      setPassengers(forms);
      setContact(cleanContact);
      setCheckout({ key, bookingId: booking.bookingId, state: booking.state });
      router.push("/booking/review");
    } catch (err) {
      setServerError(getErrorMessage(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  if (!selectedFlight || !search) return null;

  const roundTrip = Boolean(selectedReturnFlight);
  const price = priceTrip(selectedFlight, selectedReturnFlight, search);
  const typeCounters = { adult: 0, child: 0, infant: 0 };
  const firstTravel = selectedFlight.departureDate;

  return (
    <Container className="pb-24 pt-6 lg:pb-8">
      <Stepper current="passengers" variant="compact" className="lg:hidden" />
      <Stepper current="passengers" className="hidden lg:block" />
      <FlightRouteBar
        flight={selectedFlight}
        returnFlight={selectedReturnFlight}
        counts={search}
        changeFlightTo={flightsHref(search)}
        className="mb-4 mt-4"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          {serverError && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {serverError}
            </p>
          )}
          <FlightItineraryCard flight={selectedFlight} title={roundTrip ? "Departing flight" : undefined} />
          {selectedReturnFlight && <FlightItineraryCard flight={selectedReturnFlight} title="Return flight" />}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Card padded={false} className="p-4 sm:p-5">
              <SectionTitle
                icon={<Mail className="size-4" aria-hidden />}
                title="Contact information"
                hint="We send booking updates to this email and number."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email">
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? "err-email" : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError("email");
                    }}
                    className={errors.email ? "border-danger-500" : ""}
                  />
                  {errors.email && <Err id="err-email" msg={errors.email} />}
                </Field>
                <Field label="Mobile number">
                  <div className="flex gap-2">
                    <Select
                      aria-label="Country code"
                      value={dial}
                      onChange={(e) => {
                        setDial(e.target.value);
                        clearError("phone");
                      }}
                      className="w-28 shrink-0"
                    >
                      {DIAL_OPTIONS.map((c) => (
                        <option key={c.dial} value={c.dial}>
                          {c.dial} {c.code}
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="tel"
                      aria-label="Mobile number"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="98765 43210"
                      value={phone}
                      aria-invalid={errors.phone ? true : undefined}
                      aria-describedby={errors.phone ? "err-phone" : undefined}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearError("phone");
                      }}
                      className={errors.phone ? "border-danger-500" : ""}
                    />
                  </div>
                  {errors.phone && <Err id="err-phone" msg={errors.phone} />}
                </Field>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                <Phone className="size-3.5" aria-hidden />
                Used only for this booking — never for marketing.
              </p>
            </Card>

            <Card padded={false} className="p-4 sm:p-5">
              <SectionTitle
                icon={<UserRound className="size-4" aria-hidden />}
                title={`Traveller details · ${forms.length} traveller${forms.length === 1 ? "" : "s"}`}
                hint={
                  requirements?.passportRequired
                    ? "Enter names exactly as printed in each passport."
                    : "Enter names exactly as on the government photo ID used at check-in."
                }
              />
              {!requirements && !loadError && (
                <div className="space-y-3" aria-busy>
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                </div>
              )}
              {loadError && (
                <p role="alert" className="text-sm text-danger-700">
                  Couldn&apos;t load the travel-document rules for this flight: {loadError}
                </p>
              )}
              {requirements && (
                <div className="space-y-4">
                  {forms.map((passenger, index) => {
                    typeCounters[passenger.type] += 1;
                    const ordinal = typeCounters[passenger.type];
                    const bounds = dobBounds(passenger.type, firstTravel, requirements.lastTravelDate, today);
                    const err = (field: keyof PassengerForm) => errors[`p${index}.${field}`];
                    const id = (field: string) => `p${index}-${field}`;
                    return (
                      <fieldset key={index} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 sm:p-4">
                        <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-subtle">
                          <span className="flex size-6 items-center justify-center rounded-full bg-primary-600 text-[11px] text-white">
                            {passenger.type === "infant" ? <Baby className="size-3.5" aria-hidden /> : index + 1}
                          </span>
                          {passengerTypeLabel(passenger.type)} {ordinal}
                          <span className="font-medium normal-case tracking-normal text-ink-subtle">
                            · {TYPE_HINT[passenger.type]}
                          </span>
                        </legend>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field label="Title">
                            <Select value={passenger.title} onChange={(e) => updatePassenger(index, { title: e.target.value })}>
                              {TITLES[passenger.type].map((t) => (
                                <option key={t} value={t}>
                                  {t === "Mstr" ? "Master" : t}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          {requirements.genderRequired && (
                            <Field label="Gender">
                              <Select value={passenger.gender} onChange={(e) => updatePassenger(index, { gender: e.target.value })}>
                                {["Male", "Female", "Other"].map((g) => (
                                  <option key={g}>{g}</option>
                                ))}
                              </Select>
                            </Field>
                          )}
                          <TextField
                            id={id("first")}
                            label="First name"
                            autoComplete={index === 0 ? "given-name" : "off"}
                            value={passenger.firstName}
                            error={err("firstName")}
                            onChange={(firstName) => updatePassenger(index, { firstName })}
                          />
                          <TextField
                            id={id("last")}
                            label="Last name"
                            autoComplete={index === 0 ? "family-name" : "off"}
                            value={passenger.lastName}
                            error={err("lastName")}
                            onChange={(lastName) => updatePassenger(index, { lastName })}
                          />
                          <TextField
                            id={id("dob")}
                            label="Date of birth"
                            type="date"
                            min={bounds.min}
                            max={bounds.max}
                            value={passenger.dateOfBirth}
                            error={err("dateOfBirth")}
                            onChange={(dateOfBirth) => updatePassenger(index, { dateOfBirth })}
                            className={requirements.passportRequired ? "" : "sm:col-span-2 lg:col-span-2"}
                          />
                          {requirements.nationalityRequired && (
                            <TextField
                              id={id("nat")}
                              label="Nationality"
                              value={passenger.nationality ?? ""}
                              placeholder="e.g. Indian"
                              error={err("nationality")}
                              onChange={(nationality) => updatePassenger(index, { nationality })}
                            />
                          )}
                          {requirements.passportRequired && (
                            <>
                              <TextField
                                id={id("passport")}
                                label="Passport number"
                                value={passenger.passportNumber ?? ""}
                                error={err("passportNumber")}
                                onChange={(passportNumber) => updatePassenger(index, { passportNumber })}
                                autoCapitalize="characters"
                              />
                              <TextField
                                id={id("expiry")}
                                label="Passport expiry"
                                type="date"
                                min={today}
                                value={passenger.passportExpiry ?? ""}
                                error={err("passportExpiry")}
                                onChange={(passportExpiry) => updatePassenger(index, { passportExpiry })}
                              />
                            </>
                          )}
                        </div>
                        {passportValidityWarning(passenger, requirements) && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning-50 px-2.5 py-1.5 text-xs text-ink">
                            <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning-500" aria-hidden />
                            This passport expires less than 6 months after your trip. Some countries and airlines
                            refuse travel in that case — check the rules for {requirements.countries.join(", ")}.
                          </p>
                        )}
                      </fieldset>
                    );
                  })}
                </div>
              )}
              {requirements?.international && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-muted">
                  <BookUser className="mt-px size-3.5 shrink-0" aria-hidden />
                  International trip ({requirements.countries.join(", ")}). {requirements.passportValidityAdvice} We
                  don&apos;t check visa eligibility — please confirm visa and transit requirements yourself.
                </p>
              )}
            </Card>
          </form>
        </div>
        <FareSummaryCard
          rows={fareSummaryRows(price, roundTrip)}
          total={price.total}
          note="Quoted from current fares. The final price is confirmed on the next step."
        >
          <Button
            size="lg"
            variant="accent"
            className="hidden w-full lg:inline-flex"
            disabled={saving || !requirements}
            onClick={() => formRef.current?.requestSubmit()}
          >
            {saving ? "Saving…" : "Continue to review"}
          </Button>
        </FareSummaryCard>
      </div>
      <StickyActionBar
        total={formatINR(price.total)}
        ctaLabel={saving ? "Saving…" : "Continue to review"}
        loading={saving}
        disabled={!requirements}
        onClick={() => formRef.current?.requestSubmit()}
      />
    </Container>
  );
}

function TextField({
  id,
  label,
  value,
  error,
  onChange,
  className = "",
  ...input
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  autoCapitalize?: string;
  autoComplete?: string;
}) {
  return (
    <Field label={label} className={className}>
      <Input
        {...input}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={error ? "border-danger-500" : ""}
      />
      {error && <Err id={`${id}-err`} msg={error} />}
    </Field>
  );
}

function SectionTitle({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
}

function Err({ id, msg }: { id: string; msg: string }) {
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-danger-700">
      {msg}
    </p>
  );
}
