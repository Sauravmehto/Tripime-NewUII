"use client";

import { MessageCircle, Phone } from "lucide-react";
import { telLink, whatsappLink } from "@/lib/contact";

export function VisaStickyHelp() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 p-2 shadow-elevated backdrop-blur-sm md:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-lg gap-2">
        <a
          href={whatsappLink("Hi Tripime, I need help with a visa.")}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition hover:bg-accent-dark"
        >
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </a>
        <a
          href={telLink()}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-ink transition hover:border-primary-200"
        >
          <Phone className="size-4" aria-hidden />
          Call
        </a>
      </div>
    </div>
  );
}
