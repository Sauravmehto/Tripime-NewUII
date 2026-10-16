"use client";

import { useRef, useState, type ReactNode } from "react";
import { Armchair, Baby, Crown, Gem, Minus, Plus, Sofa, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  CABIN_CLASSES,
  MAX_SEATED_PASSENGERS,
  seatedCount,
  travellersLabel,
  travellersShortLabel,
} from "@/lib/flights/search-params";
import type { CabinClass, TravellerCounts } from "@/types";
import { FieldTile } from "./field-tile";
import { SearchPopover } from "./search-popover";

interface TravellersFieldProps {
  counts: TravellerCounts;
  cabin: CabinClass;
  onChange: (counts: TravellerCounts, cabin: CabinClass) => void;
  error?: string;
}

const CABIN_INFO: Record<CabinClass, { icon: typeof Armchair; note: string }> = {
  Economy: { icon: Armchair, note: "Best value" },
  "Premium Economy": { icon: Sofa, note: "Extra legroom" },
  Business: { icon: Gem, note: "Lounge & flat beds*" },
  First: { icon: Crown, note: "Select long-haul" },
};

export function TravellersField({ counts, cabin, onChange, error }: TravellersFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const seated = seatedCount(counts);
  const seatsLeft = MAX_SEATED_PASSENGERS - seated;

  function update(patch: Partial<TravellerCounts>) {
    onChange({ ...counts, ...patch }, cabin);
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <FieldTile
        label="Travellers & cabin"
        field="travellers"
        icon={<Users className="size-4" />}
        active={open}
        error={error}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        value={travellersShortLabel(counts)}
        hint={cabin}
      />

      <SearchPopover
        open={open}
        onClose={() => setOpen(false)}
        containerRef={containerRef}
        title="Travellers & cabin"
        align="right"
        className="sm:w-[360px]"
      >
        <div className="space-y-1 p-4">
          <Counter
            icon={<UserRound className="size-4" />}
            label="Adults"
            hint="12+ years"
            value={counts.adults}
            min={Math.max(1, counts.infants)}
            canIncrement={seatsLeft > 0}
            onChange={(adults) => update({ adults })}
            limitHint={counts.adults === counts.infants && counts.infants > 0 ? "Each infant needs an adult" : undefined}
          />
          <Counter
            icon={<UserRound className="size-3.5" />}
            label="Children"
            hint="2–11 years"
            value={counts.children}
            min={0}
            canIncrement={seatsLeft > 0}
            onChange={(children) => update({ children })}
          />
          <Counter
            icon={<Baby className="size-4" />}
            label="Infants"
            hint="Under 2 · on lap"
            value={counts.infants}
            min={0}
            canIncrement={counts.infants < counts.adults}
            onChange={(infants) => update({ infants })}
            limitHint={counts.infants >= counts.adults ? "1 infant per adult" : undefined}
          />
          <p className="pt-1 text-[11px] text-ink-subtle" aria-live="polite">
            {seatsLeft > 0
              ? `Up to ${MAX_SEATED_PASSENGERS} adults and children per booking.`
              : `Maximum of ${MAX_SEATED_PASSENGERS} seated travellers reached.`}
          </p>
        </div>

        <div className="border-t border-neutral-100 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-subtle">
            Cabin class
          </p>
          <div role="radiogroup" aria-label="Cabin class" className="grid grid-cols-2 gap-2">
            {CABIN_CLASSES.map((option) => {
              const { icon: Icon, note } = CABIN_INFO[option];
              const selected = option === cabin;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(counts, option)}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border p-2.5 text-left transition duration-200",
                    selected
                      ? "border-primary-500 bg-primary-50 shadow-[0_0_0_3px_rgb(59_130_246/0.12)]"
                      : "border-neutral-200 hover:-translate-y-px hover:border-primary-300 hover:shadow-soft motion-reduce:hover:translate-y-0",
                  )}
                >
                  <Icon
                    className={cn("mt-0.5 size-4 shrink-0", selected ? "text-primary-600" : "text-ink-subtle")}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-ink">{option}</span>
                    <span className="block text-[10.5px] text-ink-muted">{note}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink-subtle">
            *Not every route offers every cabin — the calendar and results show what’s available.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 bg-neutral-50/70 px-4 py-3">
          <p className="min-w-0 truncate text-xs text-ink-muted">
            {travellersLabel(counts)} · {cabin}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
          >
            Done
          </button>
        </div>
      </SearchPopover>
    </div>
  );
}

function Counter({
  icon,
  label,
  hint,
  value,
  min,
  canIncrement,
  onChange,
  limitHint,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  value: number;
  min: number;
  canIncrement: boolean;
  onChange: (value: number) => void;
  limitHint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-1 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-[11px] text-ink-muted">{limitHint ?? hint}</p>
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-xs">
        <StepButton label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus className="size-3.5" aria-hidden />
        </StepButton>
        <output aria-live="polite" aria-label={`${label}: ${value}`} className="w-7 text-center text-sm font-bold tabular-nums text-ink">
          {value}
        </output>
        <StepButton label={`More ${label.toLowerCase()}`} disabled={!canIncrement} onClick={() => onChange(value + 1)}>
          <Plus className="size-3.5" aria-hidden />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
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
      className="flex size-8 items-center justify-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 active:scale-95 disabled:bg-neutral-100 disabled:text-neutral-400"
    >
      {children}
    </button>
  );
}
