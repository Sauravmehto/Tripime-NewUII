import { getPromoDeals, type PromoBanner } from "@/lib/api/website";
import { listPackages } from "@/lib/api/packages";

export type OfferCategory =
  | "all"
  | "holidays"
  | "hotels"
  | "flights"
  | "bus"
  | "bank-offers"
  | "activities";

export interface OfferCategoryMeta {
  id: OfferCategory;
  label: string;
}

export const OFFER_CATEGORIES: OfferCategoryMeta[] = [
  { id: "all", label: "All Offers" },
  { id: "holidays", label: "Holidays" },
  { id: "hotels", label: "Hotels" },
  { id: "flights", label: "Flights" },
  { id: "bus", label: "Bus" },
  { id: "bank-offers", label: "Bank Offers" },
  { id: "activities", label: "Activities" },
];

const URL_ALIASES: Record<string, OfferCategory> = {
  holiday: "holidays",
  hotel: "hotels",
  flight: "flights",
  buses: "bus",
  bank: "bank-offers",
  activity: "activities",
};

/** Reads `?category=` safely: anything unknown falls back to All Offers. */
export function parseOfferCategory(value: string | null | undefined): OfferCategory {
  const key = (value ?? "").trim().toLowerCase();
  if (URL_ALIASES[key]) return URL_ALIASES[key];
  return OFFER_CATEGORIES.find((category) => category.id === key)?.id ?? "all";
}

export function offersHref(category: OfferCategory): string {
  return category === "all" ? "/offers" : `/offers?category=${category}`;
}

export function categoryLabel(category: OfferCategory): string {
  return OFFER_CATEGORIES.find((item) => item.id === category)?.label ?? "Offers";
}

/* ----------------------------- dates (strict ISO) ----------------------------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Today's date in India (YYYY-MM-DD), the timezone offers are valid in. */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Whole days from today to `iso` (0 = today, negative = past). `null` when `iso` is not a real ISO date. */
export function daysUntil(iso: string, today: string = todayIST()): number | null {
  if (!isValidIsoDate(iso) || !isValidIsoDate(today)) return null;
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** Valid through the whole of the end date; only a strictly earlier date is expired. */
export function isExpired(iso: string, today?: string): boolean {
  const days = daysUntil(iso, today);
  return days !== null && days < 0;
}

export function formatIsoDate(iso: string): string {
  if (!isValidIsoDate(iso)) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Short urgency badge shown only for offers ending within a week. */
export function expiryBadge(iso: string, today?: string): string | null {
  const days = daysUntil(iso, today);
  if (days === null || days < 0 || days > 7) return null;
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}

/* --------------------------------- offers --------------------------------- */

export interface OfferItem {
  id: string;
  source: "deals" | "package";
  category: Exclude<OfferCategory, "all">;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  discountText: string;
  couponCode: string;
  /** ISO date, "" when the offer has no end date. */
  validUntil: string;
  /** Display-ready event date for event packages. */
  eventDate: string;
  terms: string;
  minBookingValue: number;
  /** Package offers only: "starting from" price and its note. */
  priceFrom: number;
  priceNote: string;
  ctaLabel: string;
  /** null when the offer has nowhere to go (or would link back to /offers itself). */
  ctaHref: string | null;
  ctaExternal: boolean;
  bankName: string;
  bankLogoUrl: string;
}

function categoryFromRaw(raw: string): Exclude<OfferCategory, "all"> | null {
  switch (raw.trim().toLowerCase()) {
    case "holiday":
    case "holidays":
      return "holidays";
    case "hotel":
    case "hotels":
      return "hotels";
    case "flight":
    case "flights":
      return "flights";
    case "bus":
    case "buses":
      return "bus";
    case "bank":
    case "bank-offers":
      return "bank-offers";
    case "activity":
    case "activities":
      return "activities";
    default:
      return null; // popup slots and anything unrecognised are not offers
  }
}

function resolveLink(
  linkType: PromoBanner["linkType"],
  linkUrl: string,
): { href: string | null; external: boolean } {
  const url = (linkUrl ?? "").trim();
  if (!url) return { href: null, external: false };
  if (linkType === "external" || /^https:\/\//i.test(url)) return { href: url, external: true };
  const href = linkType === "package" ? `/packages/${url}` : url;
  if (!href.startsWith("/") || href.startsWith("//")) return { href: null, external: false };
  // An offer must never point back at the Offers Zone it is already shown in.
  if (href === "/offers" || href.startsWith("/offers/") || href.startsWith("/offers?")) {
    return { href: null, external: false };
  }
  return { href, external: false };
}

function normalizeDeal(item: PromoBanner): OfferItem | null {
  const category = categoryFromRaw(item.category);
  if (!category) return null;
  const validUntil = item.validUntil ?? "";
  if (isExpired(validUntil)) return null;
  const link = resolveLink(item.linkType, item.linkUrl);
  return {
    id: item.id,
    source: "deals",
    category,
    title: item.title.trim() || "Travel offer",
    subtitle: item.subtitle?.trim() ?? "",
    description: item.description?.trim() ?? "",
    imageUrl: item.imageUrl,
    discountText: item.discountText?.trim() ?? "",
    couponCode: item.couponCode?.trim() ?? "",
    validUntil,
    eventDate: "",
    terms: item.terms?.trim() ?? "",
    minBookingValue: item.minBookingValue ?? 0,
    priceFrom: 0,
    priceNote: "",
    ctaLabel: item.ctaLabel?.trim() || "View offer",
    ctaHref: link.href,
    ctaExternal: link.external,
    bankName: item.bankName?.trim() ?? "",
    bankLogoUrl: item.bankLogoUrl?.trim() ?? "",
  };
}

async function listPackageOffers(): Promise<OfferItem[]> {
  const packages = await listPackages();
  const offers: OfferItem[] = [];
  for (const pkg of packages) {
    if (pkg.category !== "offer" && pkg.category !== "upcoming_event") continue;
    // A dated event that has already happened is not a live promotion.
    if (pkg.eventDate && isExpired(pkg.eventDate)) continue;
    offers.push({
      id: `pkg_offer_${pkg.id}`,
      source: "package",
      category: "holidays",
      title: pkg.title,
      subtitle: pkg.tagline || pkg.destination,
      description: "",
      imageUrl: pkg.imageUrl,
      discountText: "",
      couponCode: "",
      validUntil: "",
      eventDate: pkg.eventDate ? formatIsoDate(pkg.eventDate) || pkg.eventDate : "",
      terms: "Final pricing and availability are confirmed by a Tripime travel expert.",
      minBookingValue: 0,
      priceFrom: pkg.price,
      priceNote: pkg.priceNote,
      ctaLabel: "View package",
      ctaHref: `/packages/${pkg.id}`,
      ctaExternal: false,
      bankName: "",
      bankLogoUrl: "",
    });
  }
  return offers;
}

/** Live offers: CMS deals (admin-managed) first, then packages flagged as offers/events. */
export async function listOffers(): Promise<OfferItem[]> {
  const [deals, packages] = await Promise.allSettled([getPromoDeals(), listPackageOffers()]);
  if (deals.status === "rejected" && packages.status === "rejected") throw deals.reason;
  const dealOffers =
    deals.status === "fulfilled"
      ? deals.value.map(normalizeDeal).filter((offer): offer is OfferItem => offer !== null)
      : [];
  return [...dealOffers, ...(packages.status === "fulfilled" ? packages.value : [])];
}

export function filterOffersByCategory(offers: OfferItem[], category: OfferCategory): OfferItem[] {
  return category === "all" ? offers : offers.filter((offer) => offer.category === category);
}
