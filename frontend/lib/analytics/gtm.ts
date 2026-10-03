/** Google Tag Manager helpers — push events into window.dataLayer. */

export const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID ?? "").trim();

export function isGtmEnabled(): boolean {
  return Boolean(GTM_ID);
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function pushDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export function trackWhatsAppClick(href: string): void {
  if (!isGtmEnabled()) return;
  let path = "/";
  try {
    path = window.location.pathname;
  } catch {
    /* ignore */
  }
  pushDataLayer({
    event: "whatsapp_click",
    whatsapp_url: href,
    page_path: path,
  });
}
