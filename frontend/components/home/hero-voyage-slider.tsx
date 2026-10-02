"use client";

import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TrendingTrip } from "@/lib/home/home-data";

interface HeroVoyageSliderProps {
  slides: TrendingTrip[];
  index: number;
  onChange: (index: number) => void;
  onHoverChange?: (hovering: boolean) => void;
  reduceMotion: boolean;
}

// Position of each card relative to the current one: 0 is centre, ±1 are the
// tilted neighbours, anything further sits hidden behind them.
const POSITIONS: Record<
  string,
  { transform: string; filter: string; opacity: number; z: number }
> = {
  "0": {
    transform: "translateX(0) rotateY(0deg) scale(1.2)",
    filter: "brightness(0.85)",
    opacity: 1,
    z: 20,
  },
  "1": {
    transform: "translateX(107%) rotateY(-45deg) scale(1)",
    filter: "brightness(0.5)",
    opacity: 1,
    z: 10,
  },
  "-1": {
    transform: "translateX(-107%) rotateY(45deg) scale(1)",
    filter: "brightness(0.5)",
    opacity: 1,
    z: 10,
  },
  "2": {
    transform: "translateX(170%) rotateY(-60deg) scale(0.9)",
    filter: "brightness(0.4)",
    opacity: 0,
    z: 0,
  },
  "-2": {
    transform: "translateX(-170%) rotateY(60deg) scale(0.9)",
    filter: "brightness(0.4)",
    opacity: 0,
    z: 0,
  },
};

function offsetOf(i: number, index: number, count: number) {
  let d = (i - index + count) % count;
  if (d > count / 2) d -= count;
  return Math.max(-2, Math.min(2, d));
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 3D "voyage" slider for the home hero: the current trip sits large in the
 * centre, its neighbours fold away on either side, and the centre card tilts
 * towards the pointer with the caption floating in front of it.
 */
export function HeroVoyageSlider({
  slides,
  index,
  onChange,
  onHoverChange,
  reduceMotion,
}: HeroVoyageSliderProps) {
  const count = slides.length;
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const target = useRef({ rx: 0, ry: 0, bx: 0, by: 0, ease: 0.06 });

  // Ease the centre card's tilt towards the pointer every frame.
  useEffect(() => {
    if (reduceMotion) return;
    const current = { rx: 0, ry: 0, bx: 0, by: 0 };
    let raf = 0;
    const tick = () => {
      const t = target.current;
      current.rx = lerp(current.rx, t.rx, t.ease);
      current.ry = lerp(current.ry, t.ry, t.ease);
      current.bx = lerp(current.bx, t.bx, t.ease);
      current.by = lerp(current.by, t.by, t.ease);
      const el = tiltRef.current;
      if (el) {
        el.style.setProperty("--rot-x", `${current.ry.toFixed(2)}deg`);
        el.style.setProperty("--rot-y", `${current.rx.toFixed(2)}deg`);
        el.style.setProperty("--bg-x", `${current.bx.toFixed(2)}%`);
        el.style.setProperty("--bg-y", `${current.by.toFixed(2)}%`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  function handleMove(e: MouseEvent<HTMLElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ox = (e.clientX - rect.left - rect.width / 2) / (Math.PI * 3);
    const oy = -(e.clientY - rect.top - rect.height / 2) / (Math.PI * 4);
    target.current = { rx: ox, ry: oy, bx: -ox * 0.3, by: oy * 0.3, ease: 0.1 };
  }

  function resetTilt() {
    target.current = { rx: 0, ry: 0, bx: 0, by: 0, ease: 0.06 };
  }

  const go = (step: number) => onChange((index + step + count) % count);
  const arrowClass =
    "absolute top-1/2 z-30 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Trending trips"
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className="relative grid h-[calc(var(--card-w)*1.5*1.25)] w-[calc(var(--card-w)*3.3)] place-items-center [--card-w:clamp(8.5rem,12vw,12rem)]"
    >
      {slides.map((slide, i) => {
        const offset = offsetOf(i, index, count);
        const pos = POSITIONS[String(offset)]!;
        const isCurrent = offset === 0;
        const hidden = Math.abs(offset) > 1;

        const card = (
          <div
            ref={isCurrent ? tiltRef : undefined}
            className="relative size-full [transform-style:preserve-3d]"
            style={
              isCurrent
                ? {
                    transform:
                      "rotateX(var(--rot-x, 0deg)) rotateY(var(--rot-y, 0deg))",
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 overflow-hidden rounded-xl shadow-elevated">
              <Image
                src={slide.image}
                alt=""
                fill
                sizes="240px"
                priority={i === 0}
                className="object-cover transition-[filter] duration-700 motion-reduce:transition-none"
                style={{
                  filter: pos.filter,
                  transform: isCurrent
                    ? "scale(1.25) translate3d(var(--bg-x, 0%), var(--bg-y, 0%), 0)"
                    : "scale(1.25)",
                }}
              />
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink/80 via-ink/30 to-transparent transition-opacity duration-700 motion-reduce:transition-none",
                  isCurrent ? "opacity-100" : "opacity-0",
                )}
              />
            </div>

            {/* Caption floats just in front of the photo, inside its bottom edge */}
            <div className="pointer-events-none absolute inset-x-[9%] bottom-[8%] [transform:translateZ(30px)]">
              {[
                {
                  text: slide.destination,
                  indent: "",
                  className:
                    "text-[clamp(0.95rem,1.35vw,1.2rem)] font-extrabold uppercase leading-tight tracking-wide",
                },
                {
                  text: slide.country,
                  indent: "",
                  className:
                    "text-[clamp(0.65rem,0.8vw,0.75rem)] font-semibold uppercase tracking-[0.14em] text-white/80",
                },
                {
                  text: `${slide.duration} · from ${slide.price}`,
                  indent: "mt-1.5",
                  className:
                    "text-[clamp(0.65rem,0.8vw,0.75rem)] font-medium text-white/90",
                },
              ].map((line) => (
                <div key={line.className} className={cn("overflow-hidden", line.indent)}>
                  <span
                    className={cn(
                      "block truncate text-white drop-shadow-[0_1px_4px_rgb(0_0_0/0.5)] transition-[opacity,transform] duration-700 motion-reduce:transition-none",
                      line.className,
                      isCurrent
                        ? "translate-y-0 opacity-100 delay-250"
                        : "translate-y-full opacity-0",
                    )}
                  >
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

        const style: CSSProperties = {
          transform: `perspective(1000px) ${pos.transform}`,
          opacity: pos.opacity,
          zIndex: pos.z,
        };
        const shellClass =
          "col-start-1 row-start-1 aspect-[2/3] w-[var(--card-w)] select-none rounded-xl transition-[transform,opacity] duration-[800ms] ease-in-out [transform-style:preserve-3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900 motion-reduce:transition-none";

        return isCurrent ? (
          <Link
            key={slide.id}
            href={slide.href}
            aria-label={`${slide.destination}, ${slide.country}: ${slide.duration} from ${slide.price}. Explore packages`}
            onMouseMove={handleMove}
            onMouseLeave={resetTilt}
            className={shellClass}
            style={style}
          >
            {card}
          </Link>
        ) : (
          <button
            key={slide.id}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`Show ${slide.destination}`}
            aria-hidden={hidden}
            tabIndex={hidden ? -1 : 0}
            className={cn(
              shellClass,
              "cursor-pointer",
              hidden && "pointer-events-none",
            )}
            style={style}
          >
            {card}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous trip"
        className={cn(arrowClass, "left-[4%]")}
      >
        <ChevronLeft className="size-7" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next trip"
        className={cn(arrowClass, "right-[4%]")}
      >
        <ChevronRight className="size-7" aria-hidden />
      </button>
    </div>
  );
}
