"use client";

import { useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { telLink, whatsappLink } from "@/lib/contact";
import { cn } from "@/lib/cn";

export function FloatingHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="animate-fade-up flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-medium">
          <a
            href={telLink()}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-neutral-50"
          >
            <Phone className="size-4 text-primary-600" />
            Call expert
          </a>
          <a
            href={whatsappLink("Hi Tripime, I need help planning a trip.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-neutral-50"
          >
            <MessageCircle className="size-4 text-success-700" />
            WhatsApp
          </a>
        </div>
      )}
      <button
        type="button"
        aria-label={open ? "Close help menu" : "Get help"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex size-12 items-center justify-center rounded-full bg-accent text-white shadow-medium transition hover:bg-accent-dark",
        )}
      >
        <MessageCircle className="size-5" />
      </button>
    </div>
  );
}
