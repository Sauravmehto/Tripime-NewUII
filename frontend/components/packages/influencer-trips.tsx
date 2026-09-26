"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { INFLUENCER_TRIPS } from "@/lib/packages/influencer-trips";

const AUTOPLAY_MS = 4000;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function InfluencerTrips() {
  const trips = INFLUENCER_TRIPS;
  const count = trips.length;
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  // Advance every AUTOPLAY_MS; depending on `active` restarts the timer after
  // any manual change. Paused on hover/focus/touch, in a hidden tab, or with
  // prefers-reduced-motion.
  useEffect(() => {
    if (reduceMotion || count < 2) return;
    const id = window.setTimeout(() => {
      if (pausedRef.current || document.hidden) return;
      setActive((active + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [active, count, reduceMotion]);

  function go(index: number) {
    setActive(((index % count) + count) % count);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(active - 1);
    }
  }

  return (
    <section aria-label="Upcoming influencer trips" className="border-t border-neutral-200 py-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
            Upcoming influencer trips
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Small-group departures hosted by creators you follow, with stays, transfers and
            experiences planned by Tripime.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(active - 1)}
            aria-label="Previous trip"
            className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-muted shadow-xs transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            aria-label="Next trip"
            className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-muted shadow-xs transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Upcoming influencer trips"
        onKeyDown={handleKeyDown}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onFocus={() => (pausedRef.current = true)}
        onBlur={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
        className="mt-4 flex h-[34rem] flex-col gap-2 md:h-[26rem] md:flex-row md:gap-3 lg:h-[28rem]"
      >
        {trips.map((trip, i) => {
          const isActive = i === active;
          return (
            <article
              key={trip.id}
              tabIndex={0}
              aria-label={`${i + 1} of ${count}: ${trip.destination} with ${trip.creator}`}
              aria-current={isActive}
              onClick={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={cn(
                "group relative min-h-0 min-w-0 overflow-hidden rounded-2xl bg-primary-950 shadow-medium outline-none transition-[flex] duration-700 ease-[cubic-bezier(.55,.24,.18,1)] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transition-none",
                isActive ? "flex-[6_1_0%] md:flex-[5_1_0%]" : "flex-[1_1_0%] cursor-pointer",
              )}
            >
              <Image
                src={trip.image}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-ink/90 via-ink/30 to-ink/5" />
              <div
                className={cn(
                  "absolute inset-0 bg-ink/45 transition-opacity duration-700 motion-reduce:transition-none",
                  isActive ? "opacity-0" : "opacity-100 group-hover:opacity-70",
                )}
              />

              {/* Collapsed label: a horizontal strip on phones, vertical text on md+ */}
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-between gap-2 px-3 text-white transition-opacity duration-500 md:justify-center md:px-0",
                  isActive ? "pointer-events-none opacity-0" : "opacity-100 delay-300",
                )}
              >
                <span className="truncate text-xs font-semibold tracking-wide md:rotate-180 md:text-sm md:[writing-mode:vertical-rl]">
                  {trip.destination}
                </span>
                <span className="text-[10px] font-medium text-white/70 md:hidden">
                  {trip.dates}
                </span>
              </div>

              {/* Expanded content */}
              <div
                className={cn(
                  "absolute inset-0 flex flex-col justify-between p-3 transition-all duration-500 sm:p-4 motion-reduce:transition-none",
                  isActive
                    ? "translate-y-0 opacity-100 delay-200"
                    : "pointer-events-none translate-y-3 opacity-0",
                )}
              >
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-ink/50 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm sm:text-[11px]">
                  <CalendarDays className="size-3" aria-hidden />
                  {trip.dates}
                </span>

                <div className="min-w-0 md:max-w-md">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white"
                    >
                      {initials(trip.creator)}
                    </span>
                    <p className="min-w-0 truncate text-xs font-semibold text-white">
                      {trip.creator}{" "}
                      <span className="font-normal text-white/60">{trip.handle}</span>
                    </p>
                  </div>

                  <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-white sm:text-lg">
                    {trip.title}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium text-white sm:text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                      <Clock className="size-3" aria-hidden />
                      {trip.duration}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                      <Users className="size-3" aria-hidden />
                      {trip.seatsLeft} seats left
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-white">
                      <span className="text-[10px] text-white/70">from </span>
                      <span className="text-base font-bold tabular-nums sm:text-lg">
                        {formatINR(trip.price)}
                      </span>
                      <span className="text-[10px] text-white/70"> / person</span>
                    </p>
                    <Link
                      href={trip.href}
                      tabIndex={isActive ? 0 : -1}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-accent px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                    >
                      Join this trip
                      <ArrowUpRight className="size-3" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1">
        {trips.map((trip, i) => (
          <button
            key={trip.id}
            type="button"
            aria-label={`Show ${trip.destination} trip`}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "h-1 rounded-full transition-all duration-300 motion-reduce:transition-none",
              i === active ? "w-5 bg-primary-700" : "w-1 bg-neutral-300 hover:bg-neutral-400",
            )}
          />
        ))}
      </div>
    </section>
  );
}
