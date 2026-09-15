"use client";

import { TrendingDown } from "lucide-react";
import { formatINR, formatDate } from "@/lib/format";

export interface NeighborFareHint {
  date: string;
  minFare: number;
  savings: number;
}

interface FlightFareHintProps {
  hint: NeighborFareHint | null;
  onSelectDate: (date: string) => void;
}

/** Surfaces a cheaper nearby date when background probes find a lower fare. */
export function FlightFareHint({ hint, onSelectDate }: FlightFareHintProps) {
  if (!hint) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success-200 bg-success-50/80 px-3.5 py-2.5 text-sm text-success-700">
      <p className="flex min-w-0 items-start gap-2">
        <TrendingDown className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold">{formatINR(hint.savings)} cheaper</strong> on{" "}
          {formatDate(hint.date)} — fares from {formatINR(hint.minFare)}/adult.
        </span>
      </p>
      <button
        type="button"
        onClick={() => onSelectDate(hint.date)}
        className="shrink-0 rounded-lg bg-success-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-success-700"
      >
        Check that date
      </button>
    </div>
  );
}
