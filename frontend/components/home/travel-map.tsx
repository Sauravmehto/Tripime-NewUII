"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Hand,
  MapPin,
  MessageCircle,
  Plane,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { whatsappLink } from "@/lib/contact";
import { MAP_DESTINATIONS } from "@/lib/home/home-data";

const AUTO_MS = 4200;
const DRAG_STEP_PX = 60;
const CLICK_SLOP_PX = 6;

/**
 * Fan layout per step away from the active card, matching the original
 * carousel's 10-item spacing: cards swing out around their bottom-left corner.
 */
function fanStyle(step: number) {
  return {
    transform: `translate(${step * 80}%, ${step * 20}%) rotate(${step * 12}deg)`,
    opacity: Math.max(0, 1 - Math.abs(step) * 0.3),
  };
}

export function TravelMap() {
  const [activeId, setActiveId] = useState(MAP_DESTINATIONS[0]?.id ?? "delhi");
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ x: number; acc: number; moved: number } | null>(null);
  const active =
    MAP_DESTINATIONS.find((d) => d.id === activeId) ?? MAP_DESTINATIONS[0];
  const activeIndex = Math.max(0, MAP_DESTINATIONS.findIndex((d) => d.id === activeId));
  const count = MAP_DESTINATIONS.length;
  const reduceMotion = useReducedMotion();

  const goTo = (i: number) =>
    setActiveId(MAP_DESTINATIONS[Math.max(0, Math.min(count - 1, i))]!.id);

  // Step through the stops; depending on activeIndex restarts the timer after
  // any manual change. Paused while the pointer is over the section.
  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setTimeout(() => {
      setActiveId(MAP_DESTINATIONS[(activeIndex + 1) % count]!.id);
    }, AUTO_MS);
    return () => window.clearTimeout(id);
  }, [activeIndex, count, paused]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, acc: 0, moved: 0 };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX;
    d.acc += dx;
    d.moved += Math.abs(dx);
    if (d.moved > CLICK_SLOP_PX) e.currentTarget.setPointerCapture(e.pointerId);
    // Dragging right brings earlier stops forward, as in the original.
    if (d.acc <= -DRAG_STEP_PX) {
      d.acc = 0;
      goTo(activeIndex + 1);
    } else if (d.acc >= DRAG_STEP_PX) {
      d.acc = 0;
      goTo(activeIndex - 1);
    }
  }

  function onPointerUp() {
    // Keep the moved distance until the card's click handler has seen it.
    window.setTimeout(() => (drag.current = null), 0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(activeIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(activeIndex - 1);
    }
  }

  const wasDrag = () => (drag.current?.moved ?? 0) > CLICK_SLOP_PX;

  return (
    <section
      className="relative isolate overflow-hidden py-[var(--section-space-md)] lg:py-[var(--section-space-lg)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Brand atmosphere */}
      <div className="absolute inset-0 bg-linear-to-br from-primary-50/80 via-canvas to-accent-soft/40" aria-hidden />
      <div
        className="pointer-events-none absolute -left-20 top-0 size-[22rem] rounded-full bg-primary-400/20 blur-3xl animate-orb-float"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 size-[20rem] rounded-full bg-accent/15 blur-3xl animate-orb-float-delayed"
        aria-hidden
      />

      <Container className="relative">
        <Reveal>
          <SectionHeading
            eyebrow="Featured route"
            title="Follow the journey"
            subtitle="Delhi → Bali → Thailand → Vietnam — tap a stop to explore packages and flights."
          />
        </Reveal>

        {/* City chips */}
        <Reveal className="mt-5" delayMs={40}>
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Route stops"
          >
            {MAP_DESTINATIONS.map((dest, i) => (
              <div key={dest.id} className="flex items-center gap-2">
                {i > 0 && (
                  <ArrowRight className="size-3.5 shrink-0 text-primary-300" aria-hidden />
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeId === dest.id}
                  onClick={() => setActiveId(dest.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    activeId === dest.id
                      ? "border-primary-600 bg-primary-600 text-white shadow-soft"
                      : "border-neutral-200/90 bg-white/80 text-ink-muted hover:border-primary-200 hover:text-primary-700",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[9px] font-bold",
                      activeId === dest.id
                        ? "bg-white/20 text-white"
                        : "bg-neutral-100 text-ink-subtle",
                    )}
                  >
                    {i + 1}
                  </span>
                  {dest.name}
                </button>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-6" delayMs={80}>
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.85fr] lg:items-stretch">
            {/* Fan carousel stage */}
            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-medium backdrop-blur-sm">
              {/* Decorative rails, after the original layout */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-8 w-2 border-x border-primary-200/70 sm:left-12"
              />

              <div
                role="region"
                aria-roledescription="carousel"
                aria-label="Route stops"
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="relative h-[22rem] cursor-grab touch-pan-y select-none active:cursor-grabbing sm:h-[26rem] lg:h-full lg:min-h-[26rem]"
              >
                {MAP_DESTINATIONS.map((dest, i) => {
                  const step = i - activeIndex;
                  const isActive = step === 0;
                  const fan = fanStyle(step);
                  return (
                    <Link
                      key={dest.id}
                      href="/packages"
                      draggable={false}
                      tabIndex={Math.abs(step) <= 1 ? 0 : -1}
                      aria-label={
                        isActive
                          ? `${dest.name}, ${dest.country}: packages from ${dest.priceFrom}`
                          : `Show ${dest.name}`
                      }
                      aria-current={isActive}
                      onClick={(e) => {
                        if (wasDrag() || !isActive) e.preventDefault();
                        if (!wasDrag() && !isActive) setActiveId(dest.id);
                      }}
                      style={{ zIndex: count - Math.abs(step), transform: fan.transform }}
                      className="absolute left-[42%] top-[52%] -ml-[calc(var(--w)/2)] -mt-[calc(var(--h)/2)] h-(--h) w-(--w) origin-bottom-left overflow-hidden rounded-[10px] bg-ink shadow-[0_10px_40px_rgb(15_23_42/0.35)] transition-transform duration-[800ms] ease-[cubic-bezier(0,0.02,0,1)] [--h:calc(var(--w)*4/3)] [--w:clamp(9.5rem,24vw,13.5rem)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      <div
                        className="absolute inset-0 transition-opacity duration-[800ms] ease-[cubic-bezier(0,0.02,0,1)] motion-reduce:transition-none"
                        style={{ opacity: fan.opacity }}
                      >
                        <Image
                          src={dest.image}
                          alt=""
                          fill
                          draggable={false}
                          sizes="216px"
                          className="pointer-events-none object-cover"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.35),transparent_30%,transparent_50%,rgb(0_0_0/0.65))]" />
                        <span className="absolute left-3.5 top-2 text-[clamp(2rem,4.5vw,3.25rem)] font-black leading-none tracking-tight text-white">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="absolute inset-x-3.5 bottom-3">
                          <p className="text-lg font-bold leading-tight text-white sm:text-xl">
                            {dest.name}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-white/80">
                            from {dest.priceFrom}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Footer: hint, progress and arrows */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 px-4 pb-3">
                <div className="flex flex-col gap-2">
                  <p className="hidden items-center gap-1.5 text-[11px] font-medium text-ink-subtle sm:inline-flex">
                    <Hand className="size-3.5" aria-hidden />
                    Drag or tap a card
                  </p>
                  <div className="flex gap-1.5">
                    {MAP_DESTINATIONS.map((d, i) => (
                      <span
                        key={d.id}
                        className={cn(
                          "h-1 rounded-full transition-all duration-300",
                          i === activeIndex ? "w-5 bg-accent" : "w-1.5 bg-primary-200",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="pointer-events-auto flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => goTo(activeIndex - 1)}
                    disabled={activeIndex === 0}
                    aria-label="Previous stop"
                    className="flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-muted shadow-xs transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo(activeIndex + 1)}
                    disabled={activeIndex === count - 1}
                    aria-label="Next stop"
                    className="flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-muted shadow-xs transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            {/* Destination media panel */}
            <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-neutral-200/70 bg-ink shadow-elevated sm:min-h-[320px]">
              <AnimatePresence mode="wait">
                {active && (
                  <motion.div
                    key={active.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={active.image}
                      alt={`${active.name}, ${active.country}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/55 to-ink/15" />

                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                        <MapPin className="size-3" aria-hidden />
                        {active.country}
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-white">{active.name}</h3>
                      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-white/80">
                        {active.blurb}
                      </p>
                      <p className="mt-3 text-sm text-white/90">
                        Packages from{" "}
                        <span className="text-base font-bold text-white">
                          {active.priceFrom}
                        </span>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={whatsappLink(
                            `Hi Tripime, I'm interested in planning a trip to ${active.name}. Please share options.`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="accent">
                            <MessageCircle className="size-3.5" aria-hidden />
                            Enquire on WhatsApp
                          </Button>
                        </a>
                        <Link href="/packages">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                          >
                            Browse packages
                          </Button>
                        </Link>
                        <Link href={active.flightHref}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                          >
                            <Plane className="size-3.5" aria-hidden />
                            Search flights
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
