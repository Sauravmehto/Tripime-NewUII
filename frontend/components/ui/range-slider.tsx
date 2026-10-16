"use client";

import { cn } from "@/lib/cn";

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  /** Accessible names for the two handles, e.g. ["Minimum price", "Maximum price"]. */
  labels: [string, string];
  format: (value: number) => string;
  className?: string;
}

/**
 * Two-handle slider made from two native range inputs, so keyboard and
 * screen-reader support come for free. Handles can't cross.
 */
export function RangeSlider({ min, max, step = 1, value, onChange, labels, format, className }: RangeSliderProps) {
  const [low, high] = value;
  const span = Math.max(1, max - min);
  const left = ((low - min) / span) * 100;
  const right = ((high - min) / span) * 100;
  const disabled = max <= min;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-ink-muted tabular-nums">
        <span>{format(low)}</span>
        <span>{format(high)}</span>
      </div>
      <div className="tp-range relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-neutral-200" aria-hidden />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary-600"
          style={{ left: `${left}%`, right: `${100 - right}%` }}
          aria-hidden
        />
        {([0, 1] as const).map((handle) => (
          <input
            key={handle}
            type="range"
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            value={handle === 0 ? low : high}
            aria-label={labels[handle]}
            aria-valuetext={format(handle === 0 ? low : high)}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange(handle === 0 ? [Math.min(next, high), high] : [low, Math.max(next, low)]);
            }}
            className={cn(
              "absolute inset-0 h-5 w-full appearance-none bg-transparent",
              // Keep the low handle reachable when both sit at the max end.
              handle === 0 && low >= max - step && "z-[2]",
            )}
          />
        ))}
      </div>
    </div>
  );
}
