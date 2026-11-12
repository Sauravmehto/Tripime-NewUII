"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  Compass,
  Globe2,
  LoaderCircle,
  LocateFixed,
  Minus,
  Plane,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { Chip } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { useCurrentCity } from "@/lib/packages/use-current-city";
import {
  BUDGET_BANDS,
  DEPARTURE_CITIES,
  DESTINATIONS_BY_TRIP,
  QUICK_CITIES,
  budgetBand,
  buildSearchSummary,
  guestsLabel,
  nextMonths,
  tripLabel,
  type HolidaySearch,
  type TripType,
} from "@/lib/packages/search-options";

type StepId = "from" | "trip" | "destination" | "month" | "guests" | "budget";
type Active = StepId | "ready";

const ORDER: StepId[] = ["from", "trip", "destination", "month", "guests", "budget"];

const TITLES: Record<StepId, string> = {
  from: "Where are you flying from?",
  trip: "Where to?",
  destination: "Any place in mind?",
  month: "When do you want to go?",
  guests: "Who is travelling?",
  budget: "What is your budget per person?",
};

const STORAGE_KEY = "tripime:from-city";

const INITIAL: HolidaySearch = {
  from: "",
  trip: null,
  destination: "",
  month: "",
  adults: 2,
  children: 0,
  rooms: 1,
  budgetId: "any",
};

interface HolidaySearchWizardProps {
  onSearch: (search: HolidaySearch) => void;
}

export function HolidaySearchWizard({ onSearch }: HolidaySearchWizardProps) {
  const reduceMotion = useReducedMotion();
  const months = useMemo(() => nextMonths(12), []);
  const [search, setSearch] = useState<HolidaySearch>(INITIAL);
  const [done, setDone] = useState<Set<StepId>>(new Set());
  const [active, setActive] = useState<Active>("from");
  const [roomsTouched, setRoomsTouched] = useState(false);
  const [cityText, setCityText] = useState("");
  const [destText, setDestText] = useState("");
  const doneRef = useRef(done);

  useEffect(() => {
    doneRef.current = done;
  });

  function advance(from: StepId, patch: Partial<HolidaySearch>) {
    setSearch((prev) => ({ ...prev, ...patch }));
    const nextDone = new Set(doneRef.current).add(from);
    setDone(nextDone);
    const next = ORDER.find((step) => !nextDone.has(step));
    setActive(next ?? "ready");
  }

  const { status, locate } = useCurrentCity((city) => {
    if (doneRef.current.has("from")) return;
    advance("from", { from: city });
    try {
      localStorage.setItem(STORAGE_KEY, city);
    } catch {
      /* private mode: fine, just not remembered */
    }
  });

  // Remember the last departure city so repeat visitors skip the first question.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the remembered city on arrival
      if (saved && !doneRef.current.has("from")) advance("from", { from: saved });
    } catch {
      /* ignore */
    }
  }, []);

  function chooseCity(name: string) {
    const clean = name.trim();
    if (!clean) return;
    try {
      localStorage.setItem(STORAGE_KEY, clean);
    } catch {
      /* ignore */
    }
    advance("from", { from: clean });
  }

  function setAdults(adults: number) {
    setSearch((prev) => ({ ...prev, adults, rooms: roomsTouched ? prev.rooms : Math.ceil(adults / 2) }));
  }

  const pop = reduceMotion
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 14, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8 },
        transition: { type: "spring" as const, stiffness: 420, damping: 32 },
      };

  const progress = (done.size / ORDER.length) * 100;
  const hasSummary = done.size > 0;

  function summaryFor(step: StepId): string {
    switch (step) {
      case "from":
        return search.from;
      case "trip":
        return tripLabel(search.trip);
      case "destination":
        return search.destination || "Surprise me";
      case "month":
        return search.month;
      case "guests":
        return guestsLabel(search.adults, search.children, search.rooms);
      case "budget":
        return budgetBand(search.budgetId).label;
    }
  }

  const choiceBase =
    "relative flex min-h-24 flex-1 flex-col items-start gap-1 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";

  function body(step: StepId): ReactNode {
    switch (step) {
      case "from":
        return (
          <div className="space-y-3">
            <button
              type="button"
              onClick={locate}
              disabled={status === "locating"}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-700 px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-800 active:scale-95 disabled:opacity-80"
            >
              {status === "locating" ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <LocateFixed className="size-4" aria-hidden />
              )}
              {status === "locating" ? "Finding you…" : "Use my current location"}
            </button>
            <p role="status" className="min-h-4 text-xs text-ink-muted">
              {status === "denied" && "No problem, location is off. Pick your city below."}
              {status === "unavailable" && "We couldn't read your location. Pick your city below."}
              {status === "outside" && "You seem to be outside our departure cities. Pick the nearest one below."}
              {status === "idle" && "Your location stays on your device. We only match it to the nearest city."}
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_CITIES.map((name) => (
                <Chip key={name} active={search.from === name} onClick={() => chooseCity(name)} className="min-h-11 sm:min-h-9">
                  {name}
                </Chip>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                chooseCity(cityText);
              }}
            >
              <input
                value={cityText}
                onChange={(e) => setCityText(e.target.value)}
                list="tripime-departure-cities"
                placeholder="Or type your city"
                aria-label="Departure city"
                autoComplete="off"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              />
              <datalist id="tripime-departure-cities">
                {DEPARTURE_CITIES.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
              <button
                type="submit"
                disabled={!cityText.trim()}
                className="min-h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40"
              >
                Next
              </button>
            </form>
          </div>
        );
      case "trip":
        return (
          <div role="radiogroup" aria-label="Trip type" className="flex gap-3">
            {(
              [
                ["domestic", "Domestic", "Within India", Compass],
                ["international", "International", "Beyond India", Globe2],
              ] as const
            ).map(([value, label, hint, Icon]) => {
              const on = search.trip === value;
              return (
                <motion.button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  onClick={() => advance("trip", { trip: value as TripType, destination: "" })}
                  className={cn(
                    choiceBase,
                    on ? "border-primary-600 bg-primary-50" : "border-neutral-200 bg-white hover:border-primary-300",
                  )}
                >
                  <Icon className="size-6 text-primary-700" aria-hidden />
                  <span className="text-sm font-bold text-ink">{label}</span>
                  <span className="text-xs text-ink-muted">{hint}</span>
                  {on && <Check className="absolute right-3 top-3 size-4 text-primary-700" aria-hidden />}
                </motion.button>
              );
            })}
          </div>
        );
      case "destination": {
        const options = search.trip ? DESTINATIONS_BY_TRIP[search.trip] : [];
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Chip onClick={() => advance("destination", { destination: "" })} className="min-h-11 gap-1 sm:min-h-9">
                <Sparkles className="size-3.5" aria-hidden />
                Surprise me
              </Chip>
              {options.map((name) => (
                <Chip
                  key={name}
                  active={search.destination === name}
                  onClick={() => advance("destination", { destination: name })}
                  className="min-h-11 sm:min-h-9"
                >
                  {name}
                </Chip>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                advance("destination", { destination: destText.trim() });
              }}
            >
              <input
                value={destText}
                onChange={(e) => setDestText(e.target.value)}
                placeholder="Or type a place"
                aria-label="Destination"
                autoComplete="off"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              />
              <button
                type="submit"
                disabled={!destText.trim()}
                className="min-h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40"
              >
                Next
              </button>
            </form>
          </div>
        );
      }
      case "month":
        return (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {months.map((m) => (
              <motion.button
                key={m.value}
                type="button"
                aria-pressed={search.month === m.value}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                onClick={() => advance("month", { month: m.value })}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center rounded-xl border px-2 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                  search.month === m.value
                    ? "border-primary-600 bg-primary-700 text-white"
                    : "border-neutral-200 bg-white text-ink hover:border-primary-300",
                )}
              >
                <span>{m.short}</span>
                <span className="text-[10px] font-medium opacity-70">{m.year}</span>
              </motion.button>
            ))}
          </div>
        );
      case "guests":
        return (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Stepper label="Adults" value={search.adults} min={1} max={9} onChange={setAdults} reduceMotion={!!reduceMotion} />
              <Stepper
                label="Children"
                value={search.children}
                min={0}
                max={6}
                onChange={(children) => setSearch((p) => ({ ...p, children }))}
                reduceMotion={!!reduceMotion}
              />
              <Stepper
                label="Rooms"
                value={search.rooms}
                min={1}
                max={6}
                onChange={(rooms) => {
                  setRoomsTouched(true);
                  setSearch((p) => ({ ...p, rooms }));
                }}
                reduceMotion={!!reduceMotion}
              />
            </div>
            <button
              type="button"
              onClick={() => advance("guests", {})}
              className="min-h-11 rounded-full bg-primary-700 px-5 text-sm font-semibold text-white transition hover:bg-primary-800 active:scale-95"
            >
              Continue
            </button>
          </div>
        );
      case "budget":
        return (
          <div className="flex flex-wrap gap-2">
            {BUDGET_BANDS.map((band) => (
              <Chip
                key={band.id}
                active={search.budgetId === band.id}
                onClick={() => advance("budget", { budgetId: band.id })}
                className="min-h-11 sm:min-h-9"
              >
                {band.label}
              </Chip>
            ))}
          </div>
        );
    }
  }

  const ready = active === "ready";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary-100" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${progress}%` }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 22 }}
          />
        </div>
        <span aria-live="polite" className="text-[11px] font-semibold text-ink-muted">
          {done.size} of {ORDER.length}
        </span>
      </div>

      {hasSummary && (
        <div className="flex flex-wrap gap-1.5">
          {ORDER.filter((step) => done.has(step)).map((step) => (
            <motion.button
              key={step}
              layout={!reduceMotion}
              type="button"
              onClick={() => setActive(step)}
              aria-label={`Change ${TITLES[step]} Currently ${summaryFor(step)}`}
              className={cn(
                "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                active === step
                  ? "border-primary-600 bg-primary-50 text-primary-800"
                  : "border-neutral-200 bg-white text-ink hover:border-primary-300",
              )}
            >
              <Check className="size-3 text-success-700" aria-hidden />
              {summaryFor(step)}
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {!ready ? (
          <motion.div key={active} {...pop}>
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-ink">
              {active === "from" && <Plane className="size-4 text-primary-700" aria-hidden />}
              {TITLES[active]}
            </h2>
            {body(active)}
          </motion.div>
        ) : (
          <motion.div key="ready" {...pop} className="space-y-3">
            <p className="text-sm font-semibold text-ink">All set. Ready when you are.</p>
            <p className="text-xs text-ink-muted">{buildSearchSummary(search)}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        disabled={!ready}
        onClick={() => onSearch(search)}
        animate={ready && !reduceMotion ? { scale: [1, 1.04, 1] } : undefined}
        transition={{ duration: 0.5 }}
        className={cn(
          "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:w-auto sm:min-w-[200px]",
          ready ? "bg-accent text-ink shadow-elevated active:scale-95" : "bg-neutral-200 text-ink-muted",
        )}
      >
        <Search className="size-4" aria-hidden />
        Search holidays
      </motion.button>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  reduceMotion,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  reduceMotion: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex size-11 items-center justify-center rounded-full border border-neutral-200 text-ink transition active:scale-90 disabled:opacity-30 sm:size-9"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            aria-live="polite"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            className="w-5 text-center text-base font-bold tabular-nums text-ink"
          >
            {value}
          </motion.span>
        </AnimatePresence>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex size-11 items-center justify-center rounded-full border border-neutral-200 text-ink transition active:scale-90 disabled:opacity-30 sm:size-9"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
