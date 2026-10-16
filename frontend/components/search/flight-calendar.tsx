"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { addDays } from "@/lib/airports";
import {
  WEEKDAYS,
  compactFare,
  friendlyDate,
  monthOf,
  monthTitle,
  monthWeeks,
  shiftMonth,
  toISO,
  todayISO,
} from "@/lib/flights/calendar";
import { DURATION, EASE_SIGNATURE } from "@/lib/motion";

export type CalendarPhase = "departure" | "return";

interface FlightCalendarProps {
  range: boolean;
  phase: CalendarPhase;
  departure: string | null;
  returnDate: string | null;
  minDate: string;
  maxDate: string;
  monthsShown: 1 | 2;
  /** Lowest fare per date for the leg being picked. */
  fares: Record<string, number>;
  faresLoading: boolean;
  onSelect: (date: string) => void;
}

const KEY_DELTA: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

export function FlightCalendar({
  range,
  phase,
  departure,
  returnDate,
  minDate,
  maxDate,
  monthsShown,
  fares,
  faresLoading,
  onSelect,
}: FlightCalendarProps) {
  const reduceMotion = useReducedMotion();
  const anchor = (phase === "return" ? returnDate ?? departure : departure) ?? minDate;
  const [viewMonth, setViewMonth] = useState(() => monthOf(anchor < minDate ? minDate : anchor));
  const [direction, setDirection] = useState(0);
  const [focusDate, setFocusDate] = useState(anchor);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const keyboardMoved = useRef(false);
  const today = useMemo(() => todayISO(), []);

  const minMonth = monthOf(minDate);
  const maxMonth = monthOf(maxDate);
  const months = useMemo(
    () => Array.from({ length: monthsShown }, (_, i) => shiftMonth(viewMonth, i)),
    [viewMonth, monthsShown],
  );
  const lastMonth = months[months.length - 1];

  // Cheapest fare per visible month, to highlight the best-value days.
  const cheapestByMonth = useMemo(() => {
    const best: Record<string, number> = {};
    for (const [date, fare] of Object.entries(fares)) {
      const m = monthOf(date);
      if (best[m] === undefined || fare < best[m]) best[m] = fare;
    }
    return best;
  }, [fares]);

  // The calendar mounts when the picker opens or switches leg: start keyboard users on the active day.
  useEffect(() => {
    buttons.current.get(focusDate)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!keyboardMoved.current) return;
    keyboardMoved.current = false;
    buttons.current.get(focusDate)?.focus();
  }, [focusDate, viewMonth]);

  function goToMonth(month: string) {
    setDirection(month > viewMonth ? 1 : -1);
    setViewMonth(month);
  }

  function moveFocus(next: string) {
    const clamped = next < minDate ? minDate : next > maxDate ? maxDate : next;
    const m = monthOf(clamped);
    if (m < viewMonth) goToMonth(m);
    else if (m > lastMonth) goToMonth(shiftMonth(m, -(monthsShown - 1)));
    keyboardMoved.current = true;
    setFocusDate(clamped);
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta = KEY_DELTA[event.key];
    if (delta !== undefined) {
      event.preventDefault();
      moveFocus(addDays(focusDate, delta));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const d = new Date(`${focusDate}T00:00:00`);
      d.setMonth(d.getMonth() + (event.key === "PageUp" ? -1 : 1));
      moveFocus(toISO(d));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const weekday = (new Date(`${focusDate}T00:00:00`).getDay() + 6) % 7;
      moveFocus(addDays(focusDate, event.key === "Home" ? -weekday : 6 - weekday));
    }
  }

  const previewEnd =
    range && phase === "return" && departure && hoverDate && hoverDate > departure
      ? hoverDate
      : null;
  const rangeEnd = previewEnd ?? (range ? returnDate : null);

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <NavButton
          label="Previous month"
          disabled={viewMonth <= minMonth}
          onClick={() => goToMonth(shiftMonth(viewMonth, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </NavButton>
        <div className="flex flex-1 justify-around" aria-live="polite">
          {months.map((m) => (
            <p key={m} className="text-sm font-bold tracking-tight text-ink">
              {monthTitle(m)}
            </p>
          ))}
        </div>
        <NavButton
          label="Next month"
          disabled={lastMonth >= maxMonth}
          onClick={() => goToMonth(shiftMonth(viewMonth, 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </NavButton>
      </div>

      <div className="relative overflow-hidden" onKeyDown={onGridKeyDown}>
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={viewMonth}
            custom={direction}
            className={cn("grid gap-6", monthsShown === 2 && "grid-cols-2")}
            initial={reduceMotion ? false : { opacity: 0, x: direction * 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: direction * -36 }}
            transition={{ duration: DURATION.base, ease: EASE_SIGNATURE }}
          >
            {months.map((month) => (
              <div key={month} role="grid" aria-label={monthTitle(month)}>
                <div role="row" className="mb-1 grid grid-cols-7">
                  {WEEKDAYS.map((w) => (
                    <span
                      key={w}
                      role="columnheader"
                      aria-label={w}
                      className={cn(
                        "py-1 text-center text-[10px] font-bold uppercase tracking-[0.12em]",
                        w === "Sat" || w === "Sun" ? "text-accent/80" : "text-ink-subtle",
                      )}
                    >
                      {w.slice(0, 2)}
                    </span>
                  ))}
                </div>
                {monthWeeks(month).map((week, wi) => (
                  <div key={wi} role="row" className="grid grid-cols-7">
                    {week.map((day, di) => {
                      if (!day) return <span key={di} role="gridcell" className="h-14" />;
                      const disabled = day < minDate || day > maxDate;
                      const isStart = day === departure;
                      const isEnd = Boolean(rangeEnd) && day === rangeEnd;
                      const inRange =
                        Boolean(departure && rangeEnd) && day > departure! && day < rangeEnd!;
                      const fare = fares[day];
                      const cheapest = fare !== undefined && fare === cheapestByMonth[month];
                      const selected = isStart || (isEnd && !previewEnd);
                      return (
                        <div
                          key={day}
                          role="gridcell"
                          aria-selected={selected}
                          className="relative flex h-14 items-center justify-center"
                        >
                          {/* Range band behind the cells */}
                          {(inRange || (isStart && rangeEnd) || isEnd) && departure && rangeEnd && (
                            <span
                              aria-hidden
                              className={cn(
                                "absolute inset-y-1.5 bg-primary-100/70",
                                inRange && "inset-x-0",
                                isStart && "left-1/2 right-0",
                                isEnd && "left-0 right-1/2",
                                di === 0 && inRange && "rounded-l-lg",
                                di === 6 && inRange && "rounded-r-lg",
                              )}
                            />
                          )}
                          <button
                            ref={(el) => {
                              if (el) buttons.current.set(day, el);
                              else buttons.current.delete(day);
                            }}
                            type="button"
                            tabIndex={day === focusDate ? 0 : -1}
                            disabled={disabled}
                            aria-label={dayLabel(day, { isStart, isEnd, fare, disabled, range })}
                            aria-current={day === today ? "date" : undefined}
                            onClick={() => {
                              setFocusDate(day);
                              onSelect(day);
                            }}
                            onMouseEnter={() => setHoverDate(day)}
                            onMouseLeave={() => setHoverDate(null)}
                            onFocus={() => setFocusDate(day)}
                            className={cn(
                              "relative z-[1] flex h-12 w-full max-w-[3.25rem] flex-col items-center justify-center rounded-xl text-sm transition duration-200",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
                              disabled && "cursor-not-allowed text-neutral-300",
                              !disabled &&
                                !selected &&
                                !isEnd &&
                                "text-ink hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_18px_-10px_rgb(30_58_138/0.55)] hover:ring-1 hover:ring-primary-200",
                              isEnd && previewEnd && "bg-white ring-2 ring-primary-400",
                              selected &&
                                "-translate-y-0.5 bg-linear-to-b from-primary-500 to-primary-700 font-bold text-white shadow-[0_10px_20px_-8px_rgb(37_99_235/0.75),inset_0_1px_0_rgb(255_255_255/0.25)]",
                            )}
                          >
                            <span className={cn("leading-none", day === today && !selected && "font-extrabold text-primary-700")}>
                              {Number(day.slice(8))}
                            </span>
                            <span
                              className={cn(
                                "mt-1 h-3 text-[9.5px] font-semibold leading-none tabular-nums",
                                selected
                                  ? "text-white/85"
                                  : cheapest
                                    ? "text-success-700"
                                    : "text-ink-subtle",
                              )}
                            >
                              {!disabled && fare !== undefined
                                ? compactFare(fare)
                                : !disabled && faresLoading
                                  ? "·"
                                  : ""}
                            </span>
                            {day === today && !selected && (
                              <span
                                aria-hidden
                                className="absolute bottom-0.5 size-1 rounded-full bg-accent"
                              />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function dayLabel(
  day: string,
  s: { isStart: boolean; isEnd: boolean; fare?: number; disabled: boolean; range: boolean },
) {
  const parts = [friendlyDate(day)];
  if (s.isStart) parts.push(s.range ? "departure date" : "selected");
  if (s.isEnd) parts.push("return date");
  if (s.disabled) parts.push("not available");
  else if (s.fare !== undefined) parts.push(`from ₹${s.fare.toLocaleString("en-IN")}`);
  return parts.join(", ");
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink shadow-xs transition hover:-translate-y-px hover:border-primary-300 hover:text-primary-700 hover:shadow-soft disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
