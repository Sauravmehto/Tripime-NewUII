"use client";

import { useEffect } from "react";
import { isGtmEnabled, trackWhatsAppClick } from "@/lib/analytics/gtm";

function isWhatsAppHref(href: string): boolean {
  try {
    const u = new URL(href, window.location.origin);
    return (
      u.hostname === "wa.me" ||
      u.hostname === "api.whatsapp.com" ||
      u.hostname.endsWith(".whatsapp.com")
    );
  } catch {
    return /wa\.me|whatsapp\.com/i.test(href);
  }
}

/** Captures clicks on any WhatsApp link and pushes `whatsapp_click` to dataLayer. */
export function WhatsAppClickTracker() {
  useEffect(() => {
    if (!isGtmEnabled()) return;

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor?.href || !isWhatsAppHref(anchor.href)) return;
      trackWhatsAppClick(anchor.href);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
