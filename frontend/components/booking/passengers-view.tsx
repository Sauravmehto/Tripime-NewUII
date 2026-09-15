"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, UserRound } from "lucide-react";
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
import { emptyPassenger, formatINR } from "@/lib/format";
import type { PassengerForm } from "@/types";

type FieldErrors = Record<string, string>;

export function PassengersView() {
  const router = useRouter();
  const { search, selectedFlight, setPassengers, setContact, contact } = useBooking();
  const count = search?.passengers ?? 1;
  const formRef = useRef<HTMLFormElement>(null);

  const [forms, setForms] = useState<PassengerForm[]>(() =>
    Array.from({ length: count }, () => emptyPassenger()),
  );
  const [email, setEmail] = useState(contact.email);
  const [phone, setPhone] = useState(contact.phone);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!selectedFlight || !search) router.replace("/");
  }, [selectedFlight, search, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resizes the form list when traveller count changes
    setForms(Array.from({ length: count }, (_, i) => forms[i] ?? emptyPassenger()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  function updatePassenger(index: number, patch: Partial<PassengerForm>) {
    setForms((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    const keys = Object.keys(patch);
    if (keys.length) {
      setErrors((prev) => {
        const next = { ...prev };
        for (const k of keys) delete next[`p${index}.${k}`];
        return next;
      });
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    for (const [i, p] of forms.entries()) {
      if (!p.firstName.trim()) next[`p${i}.firstName`] = "Required";
      if (!p.lastName.trim()) next[`p${i}.lastName`] = "Required";
      if (!p.dateOfBirth) next[`p${i}.dateOfBirth`] = "Required";
    }
    if (!email.trim()) next.email = "Required";
    if (!phone.trim()) next.phone = "Required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPassengers(forms);
    setContact({ email: email.trim(), phone: phone.trim() });
    router.push("/booking/review");
  }

  if (!selectedFlight) return null;

  const baseFare = selectedFlight.fare.baseFare * count;
  const taxes = selectedFlight.fare.taxes * count;
  const total = selectedFlight.fare.totalFare * count;
  const backToResults = search
    ? `/flights?origin=${search.origin}&destination=${search.destination}&date=${search.date}&passengers=${search.passengers}`
    : "/";

  return (
    <Container className="pb-24 pt-6 lg:pb-8">
      <Stepper current="passengers" variant="compact" className="lg:hidden" />
      <Stepper current="passengers" className="hidden lg:block" />
      <FlightRouteBar
        flight={selectedFlight}
        passengers={count}
        changeFlightTo={backToResults}
        className="mb-4 mt-4"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          <FlightItineraryCard flight={selectedFlight} />
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.email;
                        return next;
                      });
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
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.phone;
                        return next;
                      });
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
                hint="Names must match the government ID used at check-in"
              />
              <div className="space-y-4">
                {forms.map((passenger, index) => (
                  <fieldset
                    key={index}
                    className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 sm:p-4"
                  >
                    <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-subtle">
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary-600 text-[11px] text-white">
                        {index + 1}
                      </span>
                      Adult {index + 1}
                    </legend>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Title">
                        <Select
                          value={passenger.title}
                          onChange={(e) => updatePassenger(index, { title: e.target.value })}
                        >
                          {["Mr", "Mrs", "Ms", "Miss", "Dr"].map((t) => (
                            <option key={t}>{t}</option>
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
                      <Field label="First name">
                        <Input
                          value={passenger.firstName}
                          onChange={(e) => updatePassenger(index, { firstName: e.target.value })}
                          className={errors[`p${index}.firstName`] ? "border-danger-500" : ""}
                          required
                        />
                        {errors[`p${index}.firstName`] && (
                          <Err msg={errors[`p${index}.firstName`]} />
                        )}
                      </Field>
                      <Field label="Last name">
                        <Input
                          value={passenger.lastName}
                          onChange={(e) => updatePassenger(index, { lastName: e.target.value })}
                          className={errors[`p${index}.lastName`] ? "border-danger-500" : ""}
                          required
                        />
                        {errors[`p${index}.lastName`] && (
                          <Err msg={errors[`p${index}.lastName`]} />
                        )}
                      </Field>
                      <Field label="Date of birth" className="sm:col-span-2 lg:col-span-4">
                        <Input
                          type="date"
                          max="2026-08-04"
                          value={passenger.dateOfBirth}
                          onChange={(e) =>
                            updatePassenger(index, { dateOfBirth: e.target.value })
                          }
                          className={errors[`p${index}.dateOfBirth`] ? "border-danger-500" : ""}
                          required
                        />
                        {errors[`p${index}.dateOfBirth`] && (
                          <Err msg={errors[`p${index}.dateOfBirth`]} />
                        )}
                      </Field>
                    </div>
                  </fieldset>
                ))}
              </div>
            </Card>
          </form>
        </div>
        <FareSummaryCard
          rows={[
            {
              label: "Base fare",
              hint: `${count} traveller${count > 1 ? "s" : ""}`,
              amount: baseFare,
            },
            { label: "Taxes and fees", amount: taxes },
          ]}
          total={total}
        >
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
        total={formatINR(total)}
        ctaLabel="Continue"
        onClick={() => formRef.current?.requestSubmit()}
      />
    </Container>
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
