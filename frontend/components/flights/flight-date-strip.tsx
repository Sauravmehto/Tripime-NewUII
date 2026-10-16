"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, clampDate, shortDate, weekdayOf } from "@/lib/airports";
import { formatINR } from "@/lib/format";

const WINDOW = 7;

interface FlightDateStripProps {
  date: string;
  /** Bookable window (from the search API). */
  minDate: string;
  maxDate: string;
  /** Lowest adult fare per date, shown under each day when known. */
  fares?: Record<string, number>;
  onChange: (date: string) => void;
}

export function FlightDateStrip({ date, minDate, maxDate, fares = {}, onChange }: FlightDateStripProps) {
  const selected = clampDate(date, minDate, maxDate);
  const latestStart = addDays(maxDate, -(WINDOW - 1));
  const start = clampDate(
    addDays(selected, -Math.floor(WINDOW / 2)),
    minDate,
    latestStart < minDate ? minDate : latestStart,
  );

  const days = Array.from({ length: WINDOW }, (_, index) => addDays(start, index)).filter(
    (day) => day >= minDate && day <= maxDate,
  );

  const visibleFares = days.map((d) => fares[d]).filter((f): f is number => f !== undefined);
  const cheapest = visibleFares.length ? Math.min(...visibleFares) : null;

  const prev = addDays(selected, -1);
  const next = addDays(selected, 1);
  const canGoBack = prev >= minDate;
  const canGoForward = next <= maxDate;

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-soft">
      <StepButton
        label="Previous day"
        disabled={!canGoBack}
        onClick={() => onChange(prev)}
        icon={<ChevronLeft className="size-4" aria-hidden />}
      />

      <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto scroll-smooth">
        {days.map((day) => {
          const active = day === selected;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onChange(day)}
              aria-current={active ? "date" : undefined}
              className={`min-w-[76px] flex-1 rounded-xl px-2 py-2 text-center transition ${
                active
                  ? "bg-primary-600 text-white shadow-soft"
                  : "text-ink-muted hover:bg-primary-50 hover:text-primary-700"
              }`}
            >
              <span className="block text-[11px] font-medium uppercase tracking-wide opacity-80">
                {weekdayOf(day)}
              </span>
              <span className="block text-sm font-bold">{shortDate(day)}</span>
              <span
                className={`block h-4 text-[11px] font-semibold tabular-nums ${
                  active ? "text-white/90" : fares[day] === cheapest ? "text-success-700" : "text-ink-muted"
                }`}
              >
                {fares[day] !== undefined ? formatINR(fares[day]) : ""}
              </span>
            </button>
          );
        })}
      </div>

      <StepButton
        label="Next day"
        disabled={!canGoForward}
        onClick={() => onChange(next)}
        icon={<ChevronRight className="size-4" aria-hidden />}
      />
    </div>
  );
}

function StepButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-ink-muted transition hover:bg-neutral-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
    </button>
  );
}
