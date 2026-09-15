import { Info } from "lucide-react";
import { INVENTORY_END, INVENTORY_START, shortDate } from "@/lib/airports";

interface InventoryNoticeProps {
  className?: string;
  /** Compact single-line variant for tight spaces (e.g. inside a search card). */
  compact?: boolean;
}

export function InventoryNotice({ className = "", compact = false }: InventoryNoticeProps) {
  const range = `${shortDate(INVENTORY_START)} – ${shortDate(INVENTORY_END)}, 2026`;

  if (compact) {
    return (
      <p className={`flex items-center gap-1.5 text-xs text-ink-subtle ${className}`}>
        <Info className="size-3.5 shrink-0 text-primary-500" aria-hidden />
        Live for booking: Delhi ⇄ Mumbai &amp; Delhi ⇄ Bangalore, {range}.
      </p>
    );
  }

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-primary-100 bg-primary-50/70 px-3.5 py-2.5 text-sm text-primary-800 ${className}`}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <strong className="font-semibold">Live for booking:</strong> Delhi ⇄ Mumbai &amp; Delhi ⇄
        Bangalore, {range}. More routes and dates are on the way — call us for anything else.
      </p>
    </div>
  );
}
