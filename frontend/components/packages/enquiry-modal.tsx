"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { EnquiryFormFields } from "@/components/enquiries/enquiry-form-fields";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { TravelPackage } from "@/types";

interface EnquiryModalProps {
  pkg: TravelPackage;
  onClose: () => void;
}

export function EnquiryModal({ pkg, onClose }: EnquiryModalProps) {
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title={done ? "Enquiry sent!" : "Enquire about this package"}
      className="sm:max-w-md"
    >
      {done ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="size-12 text-success-500" aria-hidden />
          <p className="mt-4 font-semibold text-neutral-900">Thanks, {name.split(" ")[0]}!</p>
          <p className="mt-1.5 text-sm text-neutral-600">
            Our travel expert will call or WhatsApp you shortly to plan your trip to{" "}
            {pkg.destination}.
          </p>
          <Button className="mt-6 w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-neutral-500">{pkg.title}</p>
          <EnquiryFormFields
            extraPayload={{ source: "package", packageId: pkg.id, packageTitle: pkg.title }}
            submitLabel="Send enquiry"
            submitSize="lg"
            onSuccess={(n) => {
              setName(n);
              setDone(true);
            }}
          />
          <p className="mt-3 text-center text-[11px] text-neutral-400">
            We&apos;ll never share your details. Expect a call or WhatsApp within a few hours.
          </p>
        </>
      )}
    </Modal>
  );
}
