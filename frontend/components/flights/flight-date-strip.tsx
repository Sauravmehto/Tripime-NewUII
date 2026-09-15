"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  INVENTORY_END,
  INVENTORY_START,
  addDays,
  clampDate,
  shortDate,
  weekdayOf,
} from "@/lib/airports";

const WINDOW = 7;

interface FlightDateStripProps {
  date: string;
  onChange: (date: string) => void;
}

export function FlightDateStrip({ date, onChange }: FlightDateStripProps) {
  const selected = clampDate(date, INVENTORY_START, INVENTORY_END);
  const latestStart = addDays(INVENTORY_END, -(WINDOW - 1));
  const start = clampDate(
    addDays(selected, -Math.floor(WINDOW / 2)),
    INVENTORY_START,
    latestStart < INVENTORY_START ? INVENTORY_START : latestStart,
  );

  const days = Array.from({ length: WINDOW }, (_, index) => addDays(start, index)).filter(
    (day) => day >= INVENTORY_START && day <= INVENTORY_END,
  );

  const prev = addDays(selected, -1);
  const next = addDays(selected, 1);
  const canGoBack = prev >= INVENTORY_START;
  const canGoForward = next <= INVENTORY_END;

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
