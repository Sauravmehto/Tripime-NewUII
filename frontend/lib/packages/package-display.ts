import type { PackageCategory } from "@/types";

export const CATEGORY_LABEL: Record<PackageCategory, string> = {
  domestic: "India",
  international: "International",
  offer: "Offer",
  upcoming_event: "Event",
};

/** "7N / 8D" → "8 days · 7 nights". Anything else is shown as entered by the admin. */
export function durationLabel(duration: string): string {
  const match = /(\d+)\s*N\s*\/\s*(\d+)\s*D/i.exec(duration);
  if (!match) return duration;
  const [, nights, days] = match;
  return `${days} days · ${nights} night${nights === "1" ? "" : "s"}`;
}

/** Itinerary lines are written as "Headline — detail". */
export function splitItineraryDay(text: string): { title: string; detail: string } {
  const [title, ...rest] = text.split(/\s+[—–-]\s+/);
  return { title: title.trim(), detail: rest.join(" — ").trim() };
}
