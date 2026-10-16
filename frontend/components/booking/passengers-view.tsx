"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Baby, BookUser, Mail, Phone, UserRound } from "lucide-react";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { FareSummaryCard } from "@/components/flights/fare-summary-card";
import { FlightItineraryCard } from "@/components/flights/flight-itinerary-card";
import { FlightRouteBar } from "@/components/flights/flight-route-bar";
import { Stepper } from "@/components/booking/stepper";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { formatINR } from "@/lib/format";
import { todayISO } from "@/lib/flights/calendar";
import { fareSummaryRows, passengerTypeLabel, priceTrip } from "@/lib/flights/pricing";
import {
  TITLES,
  dobBounds,
  isInternationalTrip,
  passengerFormsFor,
  validatePassenger,
} from "@/lib/flights/passengers";
import { flightsHref } from "@/lib/flights/search-params";
import type { PassengerForm } from "@/types";

type FieldErrors = Record<string, string>;

const TYPE_HINT = { adult: "12+ years", child: "2–11 years", infant: "Under 2 · travels on an adult's lap" };

export function PassengersView() {
  const router = useRouter();
  const { search, selectedFlight, selectedReturnFlight, passengers, setPassengers, setContact, contact } =
    useBooking();
  const formRef = useRef<HTMLFormElement>(null);

  const [forms, setForms] = useState<PassengerForm[]>(() =>
    search ? passengerFormsFor(search, passengers) : [],
  );
  const [email, setEmail] = useState(contact.email);
  const [phone, setPhone] = useState(contact.phone);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!selectedFlight || !search) router.replace("/");
  }, [selectedFlight, search, router]);

  // The provider hydrates from sessionStorage after mount; rebuild forms once it has.
  const countsKey = search ? `${search.adults}-${search.children}-${search.infants}` : "";
  useEffect(() => {
    if (!search) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resizes the form list when the traveller mix changes
    setForms((prev) => passengerFormsFor(search, prev.length ? prev : passengers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey]);

  const trip = useMemo(
    () =>
      selectedFlight
        ? {
            firstTravel: selectedFlight.departureDate,
            lastTravel: (selectedReturnFlight ?? selectedFlight).departureDate,
            international: isInternationalTrip(selectedFlight),
          }
        : null,
    [selectedFlight, selectedReturnFlight],
  );
  const today = useMemo(() => todayISO(), []);

  function updatePassenger(index: number, patch: Partial<PassengerForm>) {
    setForms((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(patch)) delete next[`p${index}.${k}`];
      return next;
    });
  }

  function clearError(key: string) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trip) return;
    const next: FieldErrors = {};
    forms.forEach((p, i) => {
      for (const [field, message] of Object.entries(validatePassenger(p, trip))) {
        next[`p${i}.${field}`] = message;
      }
    });
    if (!email.trim()) next.email = "Required";
    if (!phone.trim()) next.phone = "Required";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setPassengers(
      forms.map((p) =>
        trip.international
          ? { ...p, passportNumber: p.passportNumber?.trim().toUpperCase() }
          : { ...p, passportNumber: undefined, nationality: undefined, passportExpiry: undefined },
      ),
    );
    setContact({ email: email.trim(), phone: phone.trim() });
    router.push("/booking/review");
  }

  if (!selectedFlight || !search || !trip) return null;

  const roundTrip = Boolean(selectedReturnFlight);
  const price = priceTrip(selectedFlight, selectedReturnFlight, search);
  const typeCounters = { adult: 0, child: 0, infant: 0 };

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
          <FlightItineraryCard flight={selectedFlight} title={roundTrip ? "Departing flight" : undefined} />
          {selectedReturnFlight && <FlightItineraryCard flight={selectedReturnFlight} title="Return flight" />}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Card padded={false} className="p-4 sm:p-5">
              <SectionTitle
                icon={<Mail className="size-4" aria-hidden />}
                title="Contact information"
                hint="Ticket and booking updates are sent here"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    aria-invalid={errors.email ? true : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError("email");
                    }}
                    className={errors.email ? "border-danger-500" : ""}
                    required
                  />
                  {errors.email && <Err msg={errors.email} />}
                </Field>
                <Field label="Mobile number">
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    aria-invalid={errors.phone ? true : undefined}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearError("phone");
                    }}
                    className={errors.phone ? "border-danger-500" : ""}
                    required
                  />
                  {errors.phone && <Err msg={errors.phone} />}
                </Field>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                <Phone className="size-3.5" aria-hidden />
                We only call about this booking — never for marketing.
              </p>
            </Card>
            <Card padded={false} className="p-4 sm:p-5">
              <SectionTitle
                icon={<UserRound className="size-4" aria-hidden />}
                title="Traveller details"
                hint={
                  trip.international
                    ? "Names must match each passport exactly"
                    : "Names must match the government ID used at check-in"
                }
              />
              <div className="space-y-4">
                {forms.map((passenger, index) => {
                  typeCounters[passenger.type] += 1;
                  const ordinal = typeCounters[passenger.type];
                  const bounds = dobBounds(passenger.type, trip.firstTravel, trip.lastTravel, today);
                  const err = (field: keyof PassengerForm) => errors[`p${index}.${field}`];
                  return (
                    <fieldset
                      key={index}
                      className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 sm:p-4"
                    >
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
                          <Select
                            value={passenger.title}
                            onChange={(e) => updatePassenger(index, { title: e.target.value })}
                          >
                            {TITLES[passenger.type].map((t) => (
                              <option key={t} value={t}>
                                {t === "Mstr" ? "Master" : t}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Gender">
                          <Select
                            value={passenger.gender}
                            onChange={(e) => updatePassenger(index, { gender: e.target.value })}
                          >
                            {["Male", "Female", "Other"].map((g) => (
                              <option key={g}>{g}</option>
                            ))}
                          </Select>
                        </Field>
                        <TextField
                          label="First name"
                          value={passenger.firstName}
                          error={err("firstName")}
                          onChange={(firstName) => updatePassenger(index, { firstName })}
                        />
                        <TextField
                          label="Last name"
                          value={passenger.lastName}
                          error={err("lastName")}
                          onChange={(lastName) => updatePassenger(index, { lastName })}
                        />
                        <TextField
                          label="Date of birth"
                          type="date"
                          min={bounds.min}
                          max={bounds.max}
                          value={passenger.dateOfBirth}
                          error={err("dateOfBirth")}
                          onChange={(dateOfBirth) => updatePassenger(index, { dateOfBirth })}
                          className={trip.international ? "" : "sm:col-span-2 lg:col-span-4"}
                        />
                        {trip.international && (
                          <>
                            <TextField
                              label="Passport number"
                              value={passenger.passportNumber ?? ""}
                              error={err("passportNumber")}
                              onChange={(passportNumber) => updatePassenger(index, { passportNumber })}
                              autoCapitalize="characters"
                            />
                            <TextField
                              label="Nationality"
                              value={passenger.nationality ?? ""}
                              placeholder="Indian"
                              error={err("nationality")}
                              onChange={(nationality) => updatePassenger(index, { nationality })}
                            />
                            <TextField
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
                    </fieldset>
                  );
                })}
              </div>
              {trip.international && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-muted">
                  <BookUser className="mt-px size-3.5 shrink-0" aria-hidden />
                  International trip: passports must be valid for at least 6 months after you return.
                  Check visa requirements for your destination before you fly.
                </p>
              )}
            </Card>
          </form>
        </div>
        <FareSummaryCard rows={fareSummaryRows(price, roundTrip)} total={price.total}>
          <Button
            size="lg"
            variant="accent"
            className="hidden w-full lg:inline-flex"
            onClick={() => formRef.current?.requestSubmit()}
          >
            Continue to review
          </Button>
        </FareSummaryCard>
      </div>
      <StickyActionBar
        total={formatINR(price.total)}
        ctaLabel="Continue"
        onClick={() => formRef.current?.requestSubmit()}
      />
    </Container>
  );
}

function TextField({
  label,
  value,
  error,
  onChange,
  className = "",
  ...input
}: {
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
}) {
  return (
    <Field label={label} className={className}>
      <Input
        {...input}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={error ? "border-danger-500" : ""}
        required
      />
      {error && <Err msg={error} />}
    </Field>
  );
}

function SectionTitle({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
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

function Err({ msg }: { msg: string }) {
  return (
    <p role="alert" className="mt-1 text-xs text-danger-700">
      {msg}
    </p>
  );
}
