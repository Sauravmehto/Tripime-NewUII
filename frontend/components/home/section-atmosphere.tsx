import { Plane } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Decorative background layer for a home-page section. Purely visual: it sits behind the content
 * (`-z-10` inside a `relative isolate` section), ignores the pointer and is hidden from assistive tech.
 * Motion uses transform / opacity / background-position only, and globals.css turns it off for
 * `prefers-reduced-motion`.
 */
export type AtmosphereVariant = "mist" | "aurora" | "deal" | "glow" | "contour" | "dusk" | "pins" | "faq" | "dark";

const layer = "pointer-events-none absolute inset-0 -z-10 overflow-hidden";
const orb = "absolute rounded-full blur-2xl";

function DottedPath() {
  // A dotted travel path curving through the top-right corner.
  return (
    <svg
      className="absolute -right-10 top-4 hidden h-40 w-[26rem] text-primary-600/25 sm:block lg:w-[32rem]"
      viewBox="0 0 520 160"
      fill="none"
      aria-hidden
    >
      <path d="M8 130 C 120 20, 240 150, 360 60 S 500 30, 512 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 10" />
      <circle cx="8" cy="130" r="4" fill="currentColor" />
      <circle cx="512" cy="24" r="4" fill="currentColor" />
    </svg>
  );
}

function FlightRoute() {
  // Dashed flight route along the top edge with a small plane at its end.
  return (
    <div className="absolute inset-x-0 top-0 hidden h-24 sm:block" aria-hidden>
      <svg className="absolute inset-0 size-full text-accent/35" viewBox="0 0 1200 96" preserveAspectRatio="none" fill="none">
        <path
          d="M-10 80 C 200 10, 420 100, 640 44 S 1000 10, 1210 60"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          className="animate-route-dash"
        />
      </svg>
      <Plane className="absolute right-[6%] top-[46%] size-4 rotate-12 text-accent/50" />
    </div>
  );
}

function Contours() {
  // Abstract map contours behind the right half; 4% opacity so text contrast is unchanged.
  return (
    <svg
      className="absolute -right-24 top-1/2 hidden h-[34rem] w-[34rem] -translate-y-1/2 text-primary-700/[0.06] md:block"
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden
    >
      {[150, 118, 86, 56].map((r, i) => (
        <path
          key={r}
          d={`M${200 - r} 200 C ${200 - r} ${200 - r * 0.7 - i * 6}, ${200 + r * 0.4} ${200 - r - i * 4}, ${200 + r} ${200 - i * 8} S ${200 + r * 0.3} ${200 + r + i * 6}, ${200 - r} 200 Z`}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

function Pins() {
  // A few location-pin dots in the top-left, like a map legend.
  const dots = [
    [24, 30],
    [70, 18],
    [52, 58],
    [110, 44],
    [92, 84],
  ];
  return (
    <svg className="absolute left-4 top-6 hidden h-28 w-40 text-accent/30 sm:block" viewBox="0 0 160 110" fill="none" aria-hidden>
      {dots.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="3.5" fill="currentColor" />
          <circle cx={x} cy={y} r="8" stroke="currentColor" strokeWidth="1" />
        </g>
      ))}
      <path d="M24 30 L70 18 L110 44 L92 84 L52 58 Z" stroke="currentColor" strokeWidth="1" strokeDasharray="2 5" />
    </svg>
  );
}

export function Atmosphere({ variant, className }: { variant: AtmosphereVariant; className?: string }) {
  switch (variant) {
    case "mist":
      return (
        <div className={cn(layer, className)} aria-hidden>
          <div className={cn(orb, "-left-20 -top-16 size-56 bg-primary-400/15 sm:size-80 sm:bg-primary-400/20 animate-orb-float")} />
          <div className={cn(orb, "-bottom-20 -right-16 size-56 bg-accent/10 sm:size-80 sm:bg-accent/15 animate-orb-float-delayed")} />
          <DottedPath />
        </div>
      );
    case "aurora":
      return (
        <div className={cn(layer, "tp-aurora animate-aurora", className)} aria-hidden>
          <div className={cn(orb, "left-1/3 -top-24 hidden size-96 bg-white/60 sm:block animate-orb-float")} />
        </div>
      );
    case "deal":
      return (
        <div className={cn(layer, "bg-accent-soft/40", className)} aria-hidden>
          <div className={cn(orb, "-left-24 top-1/3 size-56 bg-accent/10 sm:size-80 sm:bg-accent/15 animate-orb-float-delayed")} />
          <div className={cn(orb, "-right-20 -bottom-24 hidden size-72 bg-primary-300/15 sm:block")} />
          <FlightRoute />
        </div>
      );
    case "glow":
      return (
        <div className={cn(layer, className)} aria-hidden>
          <div className="absolute inset-x-0 top-0 h-64 tp-glow-top" />
        </div>
      );
    case "contour":
      return (
        <div className={cn(layer, className)} aria-hidden>
          <Contours />
        </div>
      );
    case "dusk":
      return (
        <div className={cn(layer, "tp-dusk", className)} aria-hidden>
          <div className={cn(orb, "left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 bg-primary-400/15 sm:size-[28rem] animate-orb-float-delayed")} />
        </div>
      );
    case "pins":
      return (
        <div className={cn(layer, className)} aria-hidden>
          <div className="absolute inset-x-0 top-0 h-px tp-brand-hairline" />
          <Pins />
        </div>
      );
    case "faq":
      return (
        <div className={cn(layer, className)} aria-hidden>
          <div className="absolute left-1/2 top-0 h-[26rem] w-[40rem] max-w-[140vw] -translate-x-1/2 tp-glow-center" />
        </div>
      );
    case "dark":
      return (
        <div className={cn(layer, className)} aria-hidden>
          <div className={cn(orb, "-left-24 -top-24 size-64 bg-primary-500/15 sm:size-96 sm:bg-primary-500/20 animate-orb-float")} />
          <div className={cn(orb, "-bottom-24 -right-24 size-64 bg-accent/10 sm:size-96 sm:bg-accent/15 animate-orb-float-delayed")} />
        </div>
      );
  }
}
