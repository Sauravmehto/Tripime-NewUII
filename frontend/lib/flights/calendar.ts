/** ISO-date (YYYY-MM-DD) helpers for the date picker — local time, no timezone drift. */

import { addDays } from "@/lib/airports";

export function toISO(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

/** "2026-10" */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return toISO(date).slice(0, 7);
}

export function monthTitle(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Weeks of a month (Monday first); `null` pads days outside the month. */
export function monthWeeks(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const lead = (new Date(`${first}T00:00:00`).getDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = first; monthOf(day) === month; day = addDays(day, 1)) cells.push(day);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "Tue, 20 Oct" */
export function friendlyDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function nightsBetween(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/** Compact fare for calendar cells: ₹4.6k, ₹23k. */
export function compactFare(amount: number): string {
  if (amount < 1000) return `₹${amount}`;
  const k = amount / 1000;
  return `₹${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
}
