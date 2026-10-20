"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { addDays, clampDate, shortDate, weekdayOf } from "@/lib/airports";
import { formatINR } from "@/lib/format";

/** Days rendered in the scrollable strip, centred on the selected date where possible. */
const WINDOW = 21;

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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

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

  const knownFares = days.map((d) => fares[d]).filter((f): f is number => f !== undefined);
  const lowest = knownFares.length ? Math.min(...knownFares) : null;

  // Keep the selected day centred inside the strip (horizontal only, never scrolls the page).
  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = scroller?.querySelector<HTMLElement>('[aria-current="date"]');
    if (!scroller || !active) return;
    const left = active.offsetLeft - scroller.clientWidth / 2 + active.clientWidth / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [selected, days.length]);

  function updateEdges() {
    const s = scrollerRef.current;
    if (!s) return;
    setEdges({ start: s.scrollLeft <= 2, end: s.scrollLeft + s.clientWidth >= s.scrollWidth - 2 });
  }

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [days.length]);

  function page(direction: -1 | 1) {
    const s = scrollerRef.current;
    if (s) s.scrollBy({ left: direction * s.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section aria-label="Choose a departure date" className="rounded-xl border border-neutral-200 bg-white">
      <div className="relative flex items-stretch">
        <PageButton label="Earlier dates" disabled={edges.start} onClick={() => page(-1)} side="left">
          <ChevronLeft className="size-4" aria-hidden />
        </PageButton>

        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className="no-scrollbar flex flex-1 snap-x snap-proximity gap-1 overflow-x-auto scroll-px-2 px-1 py-1.5"
        >
          {days.map((day) => {
            const active = day === selected;
            const fare = fares[day];
            const isLowest = fare !== undefined && fare === lowest;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onChange(day)}
                aria-current={active ? "date" : undefined}
                aria-label={`${weekdayOf(day)} ${shortDate(day)}${fare !== undefined ? `, from ${formatINR(fare)}` : ""}${isLowest ? ", lowest fare" : ""}`}
                className={cn(
                  "relative flex min-h-11 w-[66px] shrink-0 snap-center flex-col items-center rounded-lg border px-1 py-1 text-center leading-tight transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                  active
                    ? "border-primary-600 bg-primary-50 text-primary-800"
                    : "border-transparent text-ink hover:bg-neutral-50",
                )}
              >
                <span className={cn("text-[11px]", active ? "font-medium text-primary-700" : "text-ink-subtle")}>
                  {weekdayOf(day)}
                </span>
                <span className="text-[13px] font-semibold">{shortDate(day)}</span>
                <span
                  className={cn(
                    "inline-flex h-4 items-center gap-0.5 text-[11px] tabular-nums",
                    isLowest ? "font-semibold text-success-700" : active ? "font-medium text-primary-700" : "text-ink-muted",
                  )}
                >
                  {isLowest && <TrendingDown className="size-3" aria-hidden />}
                  {fare !== undefined ? formatINR(fare) : <span className="text-ink-subtle">—</span>}
                </span>
              </button>
            );
          })}
        </div>

        <PageButton label="Later dates" disabled={edges.end} onClick={() => page(1)} side="right">
          <ChevronRight className="size-4" aria-hidden />
        </PageButton>
      </div>
    </section>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  side,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  side: "left" | "right";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "hidden w-8 shrink-0 items-center justify-center text-ink-muted transition sm:flex",
        "hover:bg-neutral-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
        "disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",
        side === "left" ? "rounded-l-xl border-r border-neutral-100" : "rounded-r-xl border-l border-neutral-100",
      )}
    >
      {children}
    </button>
  );
}
