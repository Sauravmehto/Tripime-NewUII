import { isValidIsoDate } from "@/lib/offers/offers";
import type { PromoLinkType, WebsitePromoItem } from "@/types";

/** Admin form values for one Deals & Offers entry. Numbers stay strings until saved. */
export interface OfferFormState {
  category: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  discountText: string;
  couponCode: string;
  validUntil: string;
  minBookingValue: string;
  terms: string;
  ctaLabel: string;
  linkType: PromoLinkType;
  linkUrl: string;
  bankName: string;
  bankLogoUrl: string;
  sortOrder: string;
  active: boolean;
}

export type OfferFormErrors = Partial<Record<keyof OfferFormState, string>>;

export const LINK_TYPES: { id: PromoLinkType; label: string; placeholder: string; hint: string }[] = [
  { id: "page", label: "Website page", placeholder: "/packages", hint: "A page on this site, starting with /" },
  { id: "package", label: "Holiday package", placeholder: "pkg_bali001", hint: "The package ID (see Admin → Packages)" },
  { id: "external", label: "External website", placeholder: "https://", hint: "A full https:// link, opens in a new tab" },
];

const COUPON_RE = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;
const PACKAGE_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const IMAGE_URL_RE = /^(https?:\/\/|\/(?!\/))/i;

export function emptyOfferForm(category: string): OfferFormState {
  return {
    category,
    title: "",
    subtitle: "",
    description: "",
    imageUrl: "",
    discountText: "",
    couponCode: "",
    validUntil: "",
    minBookingValue: "",
    terms: "",
    ctaLabel: "",
    linkType: "page",
    linkUrl: "",
    bankName: "",
    bankLogoUrl: "",
    sortOrder: "0",
    active: true,
  };
}

export function formFromItem(item: WebsitePromoItem): OfferFormState {
  return {
    category: item.category,
    title: item.title ?? "",
    subtitle: item.subtitle ?? "",
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
    discountText: item.discountText ?? "",
    couponCode: item.couponCode ?? "",
    validUntil: item.validUntil ?? "",
    minBookingValue: item.minBookingValue ? String(item.minBookingValue) : "",
    terms: item.terms ?? "",
    ctaLabel: item.ctaLabel ?? "",
    linkType: item.linkType ?? (/^https?:\/\//i.test(item.linkUrl ?? "") ? "external" : "page"),
    linkUrl: item.linkUrl ?? "",
    bankName: item.bankName ?? "",
    bankLogoUrl: item.bankLogoUrl ?? "",
    sortOrder: String(item.sortOrder ?? 0),
    active: item.active,
  };
}

const MAX = { title: 200, subtitle: 240, description: 1000, discountText: 80, terms: 1200, ctaLabel: 40, bankName: 80 } as const;
const LABEL: Record<keyof typeof MAX, string> = {
  title: "Title",
  subtitle: "Subtitle",
  description: "Description",
  discountText: "Discount label",
  terms: "Terms & conditions",
  ctaLabel: "Button label",
  bankName: "Bank name",
};

/** Mirrors the backend rules so mistakes are caught before the request is sent. */
export function validateOfferForm(form: OfferFormState, rich: boolean): OfferFormErrors {
  const errors: OfferFormErrors = {};
  const image = form.imageUrl.trim();
  if (!image) errors.imageUrl = "Image URL is required.";
  else if (!IMAGE_URL_RE.test(image)) errors.imageUrl = "Must start with https:// (or / for a file on this site).";

  const link = form.linkUrl.trim();
  if (link) {
    if (/\s/.test(link)) errors.linkUrl = "The link must not contain spaces.";
    else if (form.linkType === "page" && (!link.startsWith("/") || link.startsWith("//")))
      errors.linkUrl = "Page links must start with a single / (for example /packages).";
    else if (form.linkType === "package" && !PACKAGE_ID_RE.test(link))
      errors.linkUrl = "Enter the package ID only (letters, numbers, - or _).";
    else if (form.linkType === "external" && !link.startsWith("https://"))
      errors.linkUrl = "External links must start with https://.";
  }

  if (!rich) return errors;

  if (!form.title.trim()) errors.title = "Title is required.";
  for (const key of Object.keys(MAX) as (keyof typeof MAX)[]) {
    if (form[key].trim().length > MAX[key]) errors[key] = `${LABEL[key]} must be ${MAX[key]} characters or fewer.`;
  }

  const coupon = form.couponCode.trim().toUpperCase();
  if (coupon && !COUPON_RE.test(coupon)) errors.couponCode = "3-30 characters: letters, numbers, - or _ (no spaces).";

  const until = form.validUntil.trim();
  if (until && !isValidIsoDate(until)) errors.validUntil = "Enter a real date.";

  const min = form.minBookingValue.trim();
  if (min) {
    const value = Number(min);
    if (!Number.isFinite(value) || value < 0 || value > 10_000_000) errors.minBookingValue = "Enter an amount from 0 to 1,00,00,000.";
  }

  const order = form.sortOrder.trim();
  if (order) {
    const value = Number(order);
    if (!Number.isInteger(value) || value < 0 || value > 9999) errors.sortOrder = "Enter a whole number from 0 to 9999.";
  }

  const logo = form.bankLogoUrl.trim();
  if (logo && !IMAGE_URL_RE.test(logo)) errors.bankLogoUrl = "Must start with https:// (or / for a file on this site).";

  return errors;
}

/**
 * Builds the item to save. It starts from the stored item so any property the form does not edit
 * (now or in future) is carried through unchanged; the backend PUT replaces the whole list.
 */
export function applyOfferForm(
  base: WebsitePromoItem | null,
  id: string,
  form: OfferFormState,
  rich: boolean,
): WebsitePromoItem {
  const common = {
    ...(base ?? {}),
    id,
    category: form.category,
    imageUrl: form.imageUrl.trim(),
    linkUrl: form.linkUrl.trim(),
    title: form.title.trim(),
    active: form.active,
  };
  if (!rich) return common;
  return {
    ...common,
    linkType: form.linkType,
    subtitle: form.subtitle.trim(),
    description: form.description.trim(),
    discountText: form.discountText.trim(),
    couponCode: form.couponCode.trim().toUpperCase(),
    validUntil: form.validUntil.trim(),
    terms: form.terms.trim(),
    minBookingValue: form.minBookingValue.trim() ? Number(form.minBookingValue) : 0,
    ctaLabel: form.ctaLabel.trim(),
    bankName: form.bankName.trim(),
    bankLogoUrl: form.bankLogoUrl.trim(),
    sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : 0,
  };
}
