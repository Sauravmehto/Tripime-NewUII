export const HELPLINE_NUMBER = "+918447992525";
export const HELPLINE_DISPLAY = "+91 84479 92525";
export const SUPPORT_EMAIL = "info@tripime.com";

const WHATSAPP_DIGITS = "918447992525";

export function telLink(): string {
  return `tel:${HELPLINE_NUMBER}`;
}

export function mailLink(): string {
  return `mailto:${SUPPORT_EMAIL}`;
}

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(message)}`;
}
