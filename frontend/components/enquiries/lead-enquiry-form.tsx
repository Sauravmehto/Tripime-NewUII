"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { EnquiryFormFields } from "@/components/enquiries/enquiry-form-fields";
import { useCustomerProfileOptional } from "@/context/customer-profile-provider";
import { whatsappLink } from "@/lib/contact";
import type { EnquiryPayload, EnquirySource, ServiceType } from "@/types";

function nationalFromE164(mobile: string, countryCode?: string): string {
  const digits = mobile.replace(/\D/g, "");
  const cc = (countryCode || "+91").replace(/\D/g, "");
  if (cc && digits.startsWith(cc)) return digits.slice(cc.length);
  return digits;
}

/** WhatsApp text for a saved enquiry, using WhatsApp's *bold* markup. */
function enquiryWhatsappMessage(title: string | undefined, enquiry: EnquiryPayload): string {
  const lines = [`Hi Tripime, I just sent ${title ? `a ${title.toLowerCase()}` : "an enquiry"} on your website.`, ""];
  lines.push(`*Name:* ${enquiry.name}`, `*Phone:* ${enquiry.phone}`, `*Email:* ${enquiry.email}`);
  if (enquiry.travelMonth) lines.push(`*Travel month:* ${enquiry.travelMonth}`);
  if (enquiry.travelers) lines.push(`*Travellers:* ${enquiry.travelers}`);
  if (enquiry.message) lines.push(`*Message:* ${enquiry.message}`);
  return lines.join("\n");
}

export function LeadEnquiryForm({
  source,
  serviceType,
  title,
  submitLabel = "Send enquiry",
  showTravelFields = false,
  initialMessage,
  messageKey,
  redirectToWhatsapp = false,
}: {
  source: EnquirySource;
  serviceType?: ServiceType;
  title?: string;
  submitLabel?: string;
  showTravelFields?: boolean;
  initialMessage?: string;
  /** Remounts fields when destination prefill changes. */
  messageKey?: string;
  /**
   * After the enquiry is saved, send the visitor straight to WhatsApp with it
   * typed in for the Tripime number, instead of showing a thank-you message.
   */
  redirectToWhatsapp?: boolean;
}) {
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const profile = useCustomerProfileOptional();
  const customer = profile?.customer;

  if (whatsappUrl) {
    // Fallback in case the browser or device doesn't follow the redirect.
    return (
      <div className="rounded-xl border border-success-500/20 bg-success-50 p-5 text-center">
        <MessageCircle className="mx-auto size-8 text-success-500" aria-hidden />
        <p className="mt-2 font-semibold text-ink">Opening WhatsApp…</p>
        <p className="mt-1 text-sm text-ink-muted">Press send in WhatsApp to share your enquiry.</p>
        <a
          href={whatsappUrl}
          className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-success-500 px-3.5 text-sm font-semibold text-white shadow-xs transition hover:brightness-95"
        >
          <MessageCircle className="size-4" aria-hidden />
          Open WhatsApp
        </a>
      </div>
    );
  }

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

  const prefillKey = customer?.id ?? "anon";

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-bold text-ink">{title}</h3>}
      <EnquiryFormFields
        key={`${messageKey ?? "default"}-${prefillKey}`}
        extraPayload={{ source, serviceType: serviceType ?? null }}
        showTravelFields={showTravelFields}
        submitLabel={submitLabel}
        initialMessage={initialMessage}
        initialName={customer?.name || ""}
        initialEmail={customer?.email || ""}
        initialPhone={
          customer
            ? nationalFromE164(customer.mobile, customer.countryCode)
            : ""
        }
        onSuccess={(n, enquiry) => {
          if (redirectToWhatsapp) {
            const url = whatsappLink(enquiryWhatsappMessage(title, enquiry));
            setWhatsappUrl(url);
            // Same-tab navigation: unlike window.open after an await, browsers
            // never block it, and on phones it hands off to the WhatsApp app.
            window.location.assign(url);
            return;
          }
          setName(n);
          setDone(true);
        }}
      />
    </div>
  );
}
