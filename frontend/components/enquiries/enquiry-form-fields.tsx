"use client";

import { useState, type FormEvent } from "react";
import { createEnquiry } from "@/lib/api/enquiries";
import { getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { EnquiryPayload } from "@/types";

const TRAVEL_MONTHS = [
  "This month",
  "Next month",
  "In 2-3 months",
  "Later this year",
  "Not sure yet",
];

interface EnquiryFormFieldsProps {
  /** Fields merged into the submitted payload alongside name/email/phone/etc — e.g. source, serviceType, packageId. */
  extraPayload: Pick<EnquiryPayload, "source"> &
    Partial<Pick<EnquiryPayload, "serviceType" | "packageId" | "packageTitle">>;
  showTravelFields?: boolean;
  submitLabel?: string;
  submitSize?: "md" | "lg";
  onSuccess: (name: string) => void;
}

/**
 * Shared field set + validation + submit logic for lead-capture enquiries.
 * Consumed by LeadEnquiryForm (page-embedded) and EnquiryModal (dialog-embedded) —
 * both post to the same /api/enquiries endpoint via createEnquiry.
 */
export function EnquiryFormFields({
  extraPayload,
  showTravelFields = true,
  submitLabel = "Send enquiry",
  submitSize = "md",
  onSuccess,
}: EnquiryFormFieldsProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [travelMonth, setTravelMonth] = useState("");
  const [travelers, setTravelers] = useState("2");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and phone are required.");
      return;
    }
    setSubmitting(true);
    try {
      await createEnquiry({
        ...extraPayload,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        travelMonth: travelMonth || undefined,
        travelers: travelers ? Number(travelers) : undefined,
        message: message.trim() || undefined,
      });
      onSuccess(name.trim());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Field label="Full name">
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone">
          <Input
            required
            type="tel"
            minLength={6}
            maxLength={20}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile"
          />
        </Field>
        <Field label="Email">
          <Input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
      </div>
      {showTravelFields && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Travel month">
            <Select value={travelMonth} onChange={(e) => setTravelMonth(e.target.value)}>
              <option value="">Select…</option>
              {TRAVEL_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Travellers">
            <Input
              type="number"
              min={1}
              max={20}
              value={travelers}
              onChange={(e) => setTravelers(e.target.value)}
            />
          </Field>
        </div>
      )}
      <Field label="Message">
        <Textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you need"
        />
      </Field>
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-danger-50 px-3 py-2 text-xs font-medium text-danger-700"
        >
          {error}
        </p>
      )}
      <Button type="submit" size={submitSize} className="w-full" disabled={submitting}>
        {submitting ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
