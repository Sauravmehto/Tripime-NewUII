"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { EnquiryFormFields } from "@/components/enquiries/enquiry-form-fields";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/contact";
import { useCustomerProfileOptional } from "@/context/customer-profile-provider";
import type { EnquiryPayload, TravelPackage } from "@/types";

interface EnquiryModalProps {
  pkg: TravelPackage;
  onClose: () => void;
}

function nationalFromE164(mobile: string, countryCode?: string): string {
  const digits = mobile.replace(/\D/g, "");
  const cc = (countryCode || "+91").replace(/\D/g, "");
  if (cc && digits.startsWith(cc)) return digits.slice(cc.length);
  return digits;
}

function enquiryMessage(pkg: TravelPackage, enquiry: EnquiryPayload): string {
  const lines = [
    "Hi Tripime, I just sent an enquiry on your website.",
    "",
    `*Package:* ${pkg.title} (${pkg.destination})`,
    `*Name:* ${enquiry.name}`,
    `*Phone:* ${enquiry.phone}`,
    `*Email:* ${enquiry.email}`,
  ];
  if (enquiry.travelMonth) lines.push(`*Travel month:* ${enquiry.travelMonth}`);
  if (enquiry.travelers) lines.push(`*Travellers:* ${enquiry.travelers}`);
  if (enquiry.message) lines.push(`*Message:* ${enquiry.message}`);
  lines.push("", `${window.location.origin}/packages/${pkg.id}`);
  return lines.join("\n");
}

export function EnquiryModal({ pkg, onClose }: EnquiryModalProps) {
  const [enquiry, setEnquiry] = useState<EnquiryPayload | null>(null);
  const profile = useCustomerProfileOptional();
  const customer = profile?.customer;

  function handleDone() {
    if (enquiry) {
      window.open(whatsappLink(enquiryMessage(pkg, enquiry)), "_blank", "noopener,noreferrer");
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={enquiry ? "Enquiry sent!" : "Enquire about this package"}
      className="sm:max-w-md"
    >
      {enquiry ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="size-12 text-success-500" aria-hidden />
          <p className="mt-4 font-semibold text-neutral-900">
            Thanks, {enquiry.name.split(" ")[0]}!
          </p>
          <p className="mt-1.5 text-sm text-neutral-600">
            Our travel expert will call or WhatsApp you shortly to plan your trip to{" "}
            {pkg.destination}.
          </p>
          <Button className="mt-6 w-full" onClick={handleDone}>
            <MessageCircle className="size-4" aria-hidden />
            Done
          </Button>
          <p className="mt-2 text-[11px] text-neutral-500">
            Opens WhatsApp with your enquiry so our team can reply faster.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-neutral-500">{pkg.title}</p>
          <EnquiryFormFields
            key={customer?.id ?? "anon"}
            extraPayload={{ source: "package", packageId: pkg.id, packageTitle: pkg.title }}
            submitLabel="Send enquiry"
            submitSize="lg"
            initialName={customer?.name || ""}
            initialEmail={customer?.email || ""}
            initialPhone={
              customer ? nationalFromE164(customer.mobile, customer.countryCode) : ""
            }
            onSuccess={(_, submitted) => setEnquiry(submitted)}
          />
          <p className="mt-3 text-center text-[11px] text-neutral-400">
            We&apos;ll never share your details. Expect a call or WhatsApp within a few hours.
          </p>
        </>
      )}
    </Modal>
  );
}
