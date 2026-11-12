import type { InquiryPriority, InquirySource, InquiryStatus } from "@/lib/api/admin-inquiries";

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up_required: "Follow-up required",
  quote_shared: "Quote shared",
  converted: "Converted",
  not_interested: "Not interested",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<InquiryStatus, "neutral" | "success" | "warning" | "danger" | "accent"> = {
  new: "warning",
  contacted: "accent",
  follow_up_required: "danger",
  quote_shared: "accent",
  converted: "success",
  not_interested: "neutral",
  cancelled: "neutral",
};

export const SOURCE_LABEL: Record<InquirySource, string> = {
  whatsapp: "WhatsApp inquiry",
  package_booking: "Package booking inquiry",
  brochure_request: "Brochure request",
  contact_form: "Contact form inquiry",
  custom_trip: "Custom trip inquiry",
};

export const PRIORITY_LABEL: Record<InquiryPriority, string> = { low: "Low", normal: "Normal", high: "High" };
export const PRIORITY_TONE: Record<InquiryPriority, "neutral" | "danger" | "warning"> = {
  low: "neutral",
  normal: "neutral",
  high: "danger",
};

export const ACTION_LABEL: Record<string, string> = {
  created: "Inquiry created",
  status_changed: "Status changed",
  assigned: "Assigned",
  priority_changed: "Priority changed",
  note_added: "Note added",
  follow_up_scheduled: "Follow-up scheduled",
  quote_shared: "Quote shared",
  converted: "Marked as converted",
  booking_linked: "Booking linked",
  whatsapp_clicked: "Customer opened WhatsApp",
  whatsapp_message_received: "WhatsApp message received",
  legacy_imported: "Imported from earlier enquiries",
};

/**
 * Call and WhatsApp links for a phone number the customer gave us. WhatsApp needs a country code: a number
 * typed with "+" or a full international number is used as is, and a plain 10-digit number is treated as an
 * Indian mobile (Tripime's market). Returns null when there is no usable number.
 */
export function phoneLinks(phone: string, message = ""): { tel: string; whatsapp: string } | null {
  const raw = (phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;
  let international = digits;
  if (!raw.startsWith("+")) {
    if (digits.length === 10) international = `91${digits}`;
    else if (digits.length === 11 && digits.startsWith("0")) international = `91${digits.slice(1)}`;
  }
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return { tel: `tel:+${international}`, whatsapp: `https://wa.me/${international}${text}` };
}

/** Opening line for an admin messaging the customer (not the customer's own message). */
export function followUpMessage(customerName: string, packageName: string): string {
  const who = customerName ? `Hi ${customerName.split(" ")[0]}` : "Hello";
  return packageName
    ? `${who}, this is Tripime following up on your inquiry about ${packageName}.`
    : `${who}, this is Tripime following up on your inquiry.`;
}
