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
    <section aria-label="Choose a departure date" className="rounded-2xl border border-neutral-200/80 bg-white shadow-soft">
      <div className="relative flex items-stretch">
        <PageButton label="Earlier dates" disabled={edges.start} onClick={() => page(-1)} side="left">
          <ChevronLeft className="size-4" aria-hidden />
        </PageButton>

        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className="no-scrollbar flex flex-1 snap-x snap-proximity gap-1.5 overflow-x-auto scroll-px-2 px-1 pb-2 pt-3"
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
                  "relative flex w-[84px] shrink-0 snap-center flex-col items-center rounded-xl border px-2 pb-2 pt-2.5 text-center transition duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
                  active
                    ? "border-primary-600 bg-linear-to-b from-primary-600 to-primary-700 text-white shadow-medium"
                    : isLowest
                      ? "border-success-500/40 bg-success-50/70 text-ink hover:border-success-500"
                      : "border-transparent text-ink hover:border-primary-200 hover:bg-primary-50/60",
                )}
              >
                {isLowest && (
                  <span
                    className={cn(
                      "absolute -top-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                      active ? "bg-white text-success-700 shadow-xs" : "bg-success-700 text-white",
                    )}
                  >
                    <TrendingDown className="size-2.5" aria-hidden />
                    Lowest
                  </span>
                )}
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider", active ? "text-white/80" : "text-ink-subtle")}>
                  {weekdayOf(day)}
                </span>
                <span className="text-sm font-bold leading-tight">{shortDate(day)}</span>
                <span
                  className={cn(
                    "mt-0.5 h-4 text-[11px] font-semibold tabular-nums",
                    active ? "text-white/90" : isLowest ? "text-success-700" : "text-ink-muted",
                  )}
                >
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
        "hidden w-10 shrink-0 items-center justify-center text-ink-muted transition sm:flex",
        "hover:bg-neutral-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
        "disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",
        side === "left" ? "rounded-l-2xl border-r border-neutral-100" : "rounded-r-2xl border-l border-neutral-100",
      )}
    >
      {children}
    </button>
  );
}
