"use client";

import { Info, MessageCircle, Phone } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { HELPLINE_DISPLAY, telLink, whatsappLink } from "@/lib/contact";

interface ComingSoonDialogProps {
  open: boolean;
  onClose: () => void;
  /** Product name, e.g. "Visa", "Hotels", "Buses" */
  product: string;
}

/**
 * In-house coming-soon dialog — replaces SweetAlert2.
 * Same copy/actions as tripimee.netlify.app (Call / WhatsApp).
 */
export function ComingSoonDialog({ open, onClose, product }: ComingSoonDialogProps) {
  const label = product.toLowerCase();

  return (
    <Modal open={open} onClose={onClose} title={`${product} booking is launching soon`}>
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <Info className="size-6" aria-hidden />
        </span>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          We&apos;re not taking online {label} bookings just yet. Call or WhatsApp our travel
          experts at <strong className="text-ink">{HELPLINE_DISPLAY}</strong> and we&apos;ll help
          you sort it out directly.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row-reverse">
          <a href={telLink()} className="flex-1">
            <Button className="w-full" size="lg">
              <Phone className="size-4" aria-hidden />
              Call now
            </Button>
          </a>
          <a
            href={whatsappLink(`Hi Tripime, I'd like help booking a ${label}.`)}
            target="_blank"
            rel="noreferrer"
            className="flex-1"
          >
            <Button variant="outline" className="w-full" size="lg">
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp instead
            </Button>
          </a>
        </div>
      </div>
    </Modal>
  );
}
