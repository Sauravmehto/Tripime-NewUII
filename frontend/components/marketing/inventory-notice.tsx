import { Info } from "lucide-react";
import { shortDate } from "@/lib/airports";

interface InventoryNoticeProps {
  /** Bookable window from the flight API. */
  minDate: string;
  maxDate: string;
  className?: string;
  /** Compact single-line variant for tight spaces (e.g. inside a search card). */
  compact?: boolean;
}

export function InventoryNotice({ minDate, maxDate, className = "", compact = false }: InventoryNoticeProps) {
  const range = `${shortDate(minDate)} – ${shortDate(maxDate)} ${maxDate.slice(0, 4)}`;

  if (compact) {
    return (
      <p className={`flex items-center gap-1.5 text-xs text-ink-subtle ${className}`}>
        <Info className="size-3.5 shrink-0 text-primary-500" aria-hidden />
        Bookable now: non-stop and 1-stop flights across India, the Gulf, Asia and Europe, {range}.
      </p>
    );
  }

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-primary-100 bg-primary-50/70 px-3.5 py-2.5 text-sm text-primary-800 ${className}`}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <strong className="font-semibold">Bookable now:</strong> non-stop and 1-stop flights from 8
        Indian cities to the Gulf, Istanbul, Tbilisi, Singapore, Bangkok and London, {range}. Need
        something else? Call us.
      </p>
    </div>
  );
}
