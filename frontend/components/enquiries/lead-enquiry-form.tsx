"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { EnquiryFormFields } from "@/components/enquiries/enquiry-form-fields";
import type { EnquirySource, ServiceType } from "@/types";

export function LeadEnquiryForm({
  source,
  serviceType,
  title,
  submitLabel = "Send enquiry",
  showTravelFields = false,
  initialMessage,
  messageKey,
}: {
  source: EnquirySource;
  serviceType?: ServiceType;
  title?: string;
  submitLabel?: string;
  showTravelFields?: boolean;
  initialMessage?: string;
  /** Remounts fields when destination prefill changes. */
  messageKey?: string;
}) {
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");

  if (done) {
    return (
      <div className="rounded-xl border border-success-500/20 bg-success-50 p-5 text-center">
        <CheckCircle2 className="mx-auto size-8 text-success-500" aria-hidden />
        <p className="mt-2 font-semibold text-ink">Thanks, {name.split(" ")[0]}!</p>
        <p className="mt-1 text-sm text-ink-muted">
          Our team will call or WhatsApp you shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-bold text-ink">{title}</h3>}
      <EnquiryFormFields
        key={messageKey ?? "default"}
        extraPayload={{ source, serviceType: serviceType ?? null }}
        showTravelFields={showTravelFields}
        submitLabel={submitLabel}
        initialMessage={initialMessage}
        onSuccess={(n) => {
          setName(n);
          setDone(true);
        }}
      />
    </div>
  );
}
