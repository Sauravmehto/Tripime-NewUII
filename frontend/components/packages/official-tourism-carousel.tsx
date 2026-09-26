"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Landmark } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { TourismState } from "@/lib/packages/tourism-states";

const AUTOPLAY_MS = 5500;
const TRANSITION_MS = 800;
const FLICK_VELOCITY = 0.5; // px/ms
const ROTATE_Y_MAX = 16; // deg — subtle, not the aggressive full coverflow tilt
const Z_DEPTH = 90;
const SCALE_DROP = 0.1;
const SCALE_MIN = 0.72;
const BLUR_MAX = 1.4;
const VISIBLE_RANGE = 2.4;
const DEFAULT_SLIDE_W = 880;
const SLIDE_WIDTH_RATIO = 0.88;
const IMAGE_ASPECT = 1935 / 812; // matches the artwork in public/obms
const DEFAULT_GAP = 24;

interface OfficialTourismCarouselProps {
  states: TourismState[];
  onExploreState: (state: string) => void;
}

function mod(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/** Shortest signed distance from `pos` to slide index `i` around the loop. */
function signedDistance(i: number, pos: number, n: number): number {
  let d = i - pos;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

interface Dims {
  slideW: number;
  gap: number;
}

function slideTransform(d: number, dims: Dims) {
  const abs = Math.abs(d);
  const span = dims.slideW + dims.gap;
  const tx = d * span;
  const depth = -abs * Z_DEPTH;
  const rot = Math.max(-ROTATE_Y_MAX, Math.min(ROTATE_Y_MAX, -d * ROTATE_Y_MAX));
  const scale = Math.max(SCALE_MIN, 1 - abs * SCALE_DROP);
  const blur = Math.min(abs * BLUR_MAX, BLUR_MAX);
  const opacity = abs > VISIBLE_RANGE ? 0 : 1;
  const zIndex = Math.round(1000 - abs * 10);
  return {
    transform: `translate3d(calc(-50% + ${tx.toFixed(2)}px), -50%, ${depth.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
    filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "",
    opacity,
    zIndex,
    pointerEvents: abs < 0.5 ? ("auto" as const) : ("none" as const),
  };
}

function TourismCardMedia({
  state,
  priority,
  onExploreState,
}: {
  state: TourismState;
  priority: boolean;
  onExploreState: (state: string) => void;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/15 bg-primary-950 shadow-elevated">
      <Image
        src={state.image}
        alt={`${state.state} tourism`}
        fill
        sizes="(max-width: 1024px) 90vw, 880px"
        className="object-cover"
        priority={priority}
      />

      <div className="absolute inset-0 flex flex-col justify-between p-2 sm:p-2.5">
        <p className="inline-flex w-fit items-center gap-1 rounded-full bg-ink/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-accent backdrop-blur-sm sm:text-[10px]">
          <Landmark className="size-2.5" aria-hidden />
          {state.eyebrow}
        </p>

        <div className="flex flex-col items-end gap-1">
          <a href={state.portalUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="accent" size="xs">
              {state.portalLabel}
              <ArrowUpRight className="size-2.5" aria-hidden />
            </Button>
          </a>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onExploreState(state.state)}
            className="border-white/30 bg-ink/40 text-white backdrop-blur-sm hover:bg-ink/60"
          >
            {state.holidayLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OfficialTourismCarousel({ states, onExploreState }: OfficialTourismCarouselProps) {
  const reduceMotion = useReducedMotion();
  const count = states.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const active = states[activeIndex] ?? states[0];

  // --- Reduced-motion fallback: a single static card, manual nav only, no
  // autoplay/physics/3D — the rest of this component is skipped entirely. ---
  if (reduceMotion) {
    const counter = `${String(activeIndex + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
    return (
      <section aria-label="Official state tourism" className="bg-canvas pb-6 pt-1 sm:pb-8">
        <Container>
          <div className="mb-3 flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-700">
              <Landmark className="size-3.5" aria-hidden />
              Official Travel &amp; Tourism
            </p>
            <span className="text-[11px] font-semibold text-ink-subtle">{counter}</span>
          </div>
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label={`Official tourism, slide ${counter}`}
            className="relative mx-auto aspect-[1935/812] w-full max-w-[880px] rounded-2xl border border-neutral-200 bg-primary-950 p-0"
          >
            {active && (
              <div aria-live="polite" className="h-full">
                <TourismCardMedia state={active} priority onExploreState={onExploreState} />
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveIndex((i) => mod(i - 1, count))}
              aria-label="Previous state"
              className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => mod(i + 1, count))}
              aria-label="Next state"
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <CoverflowCarousel states={states} onExploreState={onExploreState} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
  );
}

function CoverflowCarousel({
  states,
  onExploreState,
  activeIndex,
  setActiveIndex,
}: OfficialTourismCarouselProps & {
  activeIndex: number;
  setActiveIndex: (updater: number | ((prev: number) => number)) => void;
}) {
  const count = states.length;
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const progressRef = useRef<HTMLDivElement>(null);

  const dimsRef = useRef<Dims>({ slideW: DEFAULT_SLIDE_W, gap: DEFAULT_GAP });
  const posRef = useRef(0);
  const indexRef = useRef(0);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const x0Ref = useRef(0);
  const t0Ref = useRef(0);
  const velocityRef = useRef(0);
  const animatingRef = useRef(false);
  const snapRafRef = useRef(0);
  const hoveringRef = useRef(false);
  const tabHiddenRef = useRef(false);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);

  const renderSlides = useCallback(() => {
    const dims = dimsRef.current;
    const pos = posRef.current;
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = signedDistance(i, pos, count);
      const style = slideTransform(d, dims);
      el.style.transform = style.transform;
      el.style.filter = style.filter;
      el.style.opacity = String(style.opacity);
      el.style.zIndex = String(style.zIndex);
      el.style.pointerEvents = style.pointerEvents;
    });
  }, [count]);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const width = el.clientWidth;
    const slideW = Math.min(DEFAULT_SLIDE_W, width * SLIDE_WIDTH_RATIO);
    const gap = Math.max(14, slideW * 0.03);
    dimsRef.current = { slideW, gap };
    // Height follows the card width so the whole image is always visible.
    el.style.height = `${Math.round(slideW / IMAGE_ASPECT)}px`;
  }, []);

  function pauseClock() {
    if (!pausedAtRef.current) pausedAtRef.current = performance.now();
  }
  function resumeClock() {
    if (pausedAtRef.current) {
      startTimeRef.current += performance.now() - pausedAtRef.current;
      pausedAtRef.current = 0;
    }
  }

  const goTo = useCallback(
    (target: number, animate = true) => {
      window.cancelAnimationFrame(snapRafRef.current);
      const start = posRef.current;
      const nearestTarget = (() => {
        let d = target - Math.round(start);
        if (d > count / 2) d -= count;
        if (d < -count / 2) d += count;
        return Math.round(start) + d;
      })();
      const dur = animate ? TRANSITION_MS : 0;
      const t0 = performance.now();
      animatingRef.current = true;

      const step = (now: number) => {
        const t = dur ? Math.min(1, (now - t0) / dur) : 1;
        const eased = dur ? easeOutQuart(t) : 1;
        posRef.current = start + (nearestTarget - start) * eased;
        renderSlides();
        if (t < 1) {
          snapRafRef.current = window.requestAnimationFrame(step);
        } else {
          const idx = mod(Math.round(nearestTarget), count);
          posRef.current = idx;
          indexRef.current = idx;
          animatingRef.current = false;
          renderSlides();
          setActiveIndex(idx);
          startTimeRef.current = performance.now();
        }
      };
      snapRafRef.current = window.requestAnimationFrame(step);
    },
    [count, renderSlides, setActiveIndex],
  );

  const next = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const prev = useCallback(() => goTo(indexRef.current - 1), [goTo]);

  // Initial placement before first paint, and reposition on container resize.
  useLayoutEffect(() => {
    measure();
    renderSlides();
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      measure();
      renderSlides();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, renderSlides]);

  // Pause the autoplay clock while the tab is hidden.
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        tabHiddenRef.current = true;
        pauseClock();
      } else {
        tabHiddenRef.current = false;
        resumeClock();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Persistent autoplay + progress-bar loop. Reads live refs each frame
  // rather than depending on React state, so hover/drag never re-triggers it.
  useEffect(() => {
    startTimeRef.current = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const paused = draggingRef.current || hoveringRef.current || tabHiddenRef.current || animatingRef.current;
      if (!paused) {
        const elapsed = now - startTimeRef.current;
        const p = Math.min(1, elapsed / AUTOPLAY_MS);
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
        if (elapsed >= AUTOPLAY_MS) next();
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [next]);

  function handleMouseEnter() {
    hoveringRef.current = true;
    pauseClock();
  }
  function handleMouseLeave() {
    hoveringRef.current = false;
    resumeClock();
  }

  function handlePointerDown(e: ReactPointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    viewportRef.current?.setPointerCapture(e.pointerId);
    x0Ref.current = e.clientX;
    t0Ref.current = performance.now();
    velocityRef.current = 0;
    pauseClock();
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!draggingRef.current || e.pointerId !== pointerIdRef.current) return;
    const dx = e.clientX - x0Ref.current;
    const dt = Math.max(16, performance.now() - t0Ref.current);
    velocityRef.current = dx / dt;
    const span = dimsRef.current.slideW + dimsRef.current.gap;
    posRef.current = mod(indexRef.current - dx / span, count);
    renderSlides();
  }

  function handlePointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      if (pointerIdRef.current !== null) viewportRef.current?.releasePointerCapture(pointerIdRef.current);
    } catch {
      // pointer capture may already be released — ignore
    }
    pointerIdRef.current = null;
    resumeClock();

    const v = velocityRef.current;
    const flick = Math.abs(v) > FLICK_VELOCITY ? 1 : 0;
    const target = Math.round(posRef.current - Math.sign(v) * flick);
    goTo(mod(target, count));
  }

  function handleKeyDown(e: ReactKeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  }

  const counter = `${String(activeIndex + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

  return (
    <section aria-label="Official state tourism" className="bg-canvas pb-6 pt-1 sm:pb-8">
      <Container>
        <div className="mb-2 flex items-center justify-between">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-700 sm:text-[11px]">
            <Landmark className="size-3.5" aria-hidden />
            Official Travel &amp; Tourism
          </p>
          <span aria-hidden className="font-mono text-[11px] font-semibold text-ink-subtle">
            {counter}
          </span>
        </div>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label={`Official tourism for ${states[activeIndex]?.state ?? ""}, slide ${counter}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="relative overflow-hidden rounded-2xl px-1 pb-5 pt-3 outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 sm:px-3 sm:pb-6 sm:pt-4"
        >
          <div
            ref={viewportRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative h-[150px] touch-none select-none [perspective:1200px] sm:h-[250px] lg:h-[340px]"
          >
            {states.map((state, i) => (
              <article
                key={state.id}
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${state.state}`}
                aria-hidden={i !== activeIndex}
                className="absolute left-1/2 top-1/2 h-full w-[88%] max-w-[880px] cursor-grab [backface-visibility:hidden] active:cursor-grabbing"
                style={slideTransform(signedDistance(i, 0, count), {
                  slideW: DEFAULT_SLIDE_W,
                  gap: DEFAULT_GAP,
                })}
              >
                <TourismCardMedia
                  state={state}
                  priority={i === 0}
                  onExploreState={onExploreState}
                />
              </article>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1 sm:px-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous state"
              className="pointer-events-auto flex size-7 items-center justify-center rounded-full border border-white/25 bg-ink/40 text-white backdrop-blur-sm transition hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:size-9"
            >
              <ChevronLeft className="size-3.5 sm:size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next state"
              className="pointer-events-auto flex size-7 items-center justify-center rounded-full border border-white/25 bg-ink/40 text-white backdrop-blur-sm transition hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:size-9"
            >
              <ChevronRight className="size-3.5 sm:size-4" aria-hidden />
            </button>
          </div>

          <div className="absolute inset-x-4 bottom-2 h-0.5 overflow-hidden rounded-full bg-white/10">
            <div
              ref={progressRef}
              className="h-full w-full origin-left scale-x-0 bg-accent"
            />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Slide navigation"
          className="mt-3 flex flex-wrap items-center justify-center gap-1"
        >
          {states.map((state, i) => (
            <button
              key={state.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Go to ${state.state}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === activeIndex ? "w-5 bg-primary-700" : "w-1 bg-neutral-300 hover:bg-neutral-400",
              )}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
