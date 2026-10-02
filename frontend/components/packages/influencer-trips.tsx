"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Quote,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { INFLUENCER_TRIPS, type InfluencerTrip } from "@/lib/packages/influencer-trips";
import { InfluencerReels } from "./influencer-reels";

const AUTOPLAY_MS = 5000;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CreatorAvatar({ trip, className }: { trip: InfluencerTrip; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white ring-2 ring-white/80",
        className,
      )}
    >
      {initials(trip.creator)}
    </span>
  );
}

export function InfluencerTrips() {
  const trips = INFLUENCER_TRIPS;
  const count = trips.length;
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const autoplay = !reduceMotion && !paused && count > 1;

  // Advance every AUTOPLAY_MS. Depending on `active` and `autoplay` restarts
  // the timer after any manual change or when the pointer/focus leaves.
  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => {
      if (document.hidden) return;
      setActive((active + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [active, autoplay, count]);

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
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-dark">
            <Sparkles className="size-3" aria-hidden />
            Tripime × creators
          </span>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-ink sm:text-xl">
            Upcoming influencer trips
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Creators we sponsor travel on Tripime packages and share the whole journey. Join
            their next departure: same stays, same route, planned end to end by Tripime.
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
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        className="mt-4 flex h-[38rem] flex-col gap-2 md:h-[28rem] md:flex-row md:gap-3 lg:h-[30rem]"
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
                "group relative min-h-0 min-w-0 overflow-hidden rounded-2xl bg-primary-900 shadow-medium outline-none transition-[flex] duration-700 ease-[cubic-bezier(.55,.24,.18,1)] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transition-none",
                isActive ? "flex-[6_1_0%] md:flex-[5_1_0%]" : "flex-[1_1_0%] cursor-pointer",
              )}
            >
              <Image
                src={trip.image}
                alt={trip.imageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className={cn(
                  "object-cover transition-transform duration-[6000ms] ease-out motion-reduce:transition-none",
                  isActive ? "scale-105" : "scale-100",
                )}
              />
              <div className="absolute inset-0 bg-linear-to-t from-ink/95 via-ink/35 to-ink/10" />
              <div
                className={cn(
                  "absolute inset-0 bg-ink/45 transition-opacity duration-700 motion-reduce:transition-none",
                  isActive ? "opacity-0" : "opacity-100 group-hover:opacity-70",
                )}
              />

              {/* Collapsed label: a horizontal strip on phones, vertical text on md+ */}
              <div
                className={cn(
                  "absolute inset-0 flex items-center gap-2 px-3 text-white transition-opacity duration-500 md:flex-col-reverse md:justify-start md:gap-3 md:px-0 md:py-4",
                  isActive ? "pointer-events-none opacity-0" : "opacity-100 delay-300",
                )}
              >
                <CreatorAvatar trip={trip} className="size-6 text-[9px] md:size-8 md:text-[10px]" />
                <span className="truncate text-xs font-semibold tracking-wide md:rotate-180 md:text-sm md:[writing-mode:vertical-rl]">
                  {trip.destination}
                  <span className="font-normal text-white/70"> · {trip.creator}</span>
                </span>
                <span className="ml-auto shrink-0 text-[10px] font-medium text-white/70 md:hidden">
                  {trip.dates}
                </span>
              </div>

              {/* Expanded content */}
              <div
                className={cn(
                  "absolute inset-0 flex flex-col justify-between p-3 transition-all duration-500 sm:p-5 motion-reduce:transition-none",
                  isActive
                    ? "translate-y-0 opacity-100 delay-200"
                    : "pointer-events-none translate-y-3 opacity-0",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col items-start gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-ink shadow-xs backdrop-blur-sm sm:text-[11px]">
                      <BadgeCheck className="size-3.5 text-accent" aria-hidden />
                      Sponsored by Tripime
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink/50 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm sm:text-[11px]">
                      <CalendarDays className="size-3" aria-hidden />
                      Next departure · {trip.dates}
                    </span>
                  </div>

                  {/* Moments from the creator's trip */}
                  <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                      Trip moments
                    </span>
                    <div className="flex gap-1.5">
                      {trip.moments.map((moment) => (
                        <div
                          key={moment.src}
                          className="relative size-12 overflow-hidden rounded-lg ring-2 ring-white/80 lg:size-14"
                        >
                          <Image
                            src={moment.src}
                            alt={moment.alt}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <CreatorAvatar trip={trip} className="size-9 text-[11px]" />
                    <div className="min-w-0">
                      <p className="flex min-w-0 items-center gap-1 text-sm font-semibold text-white">
                        <span className="truncate">{trip.creator}</span>
                        <BadgeCheck
                          className="size-3.5 shrink-0 fill-primary-500 text-white"
                          aria-label="Verified creator"
                        />
                      </p>
                      <p className="truncate text-[11px] text-white/70">
                        {trip.handle} · {trip.followers} followers
                      </p>
                    </div>
                  </div>

                  <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-white sm:text-xl md:max-w-lg">
                    {trip.title}
                  </h3>

                  <blockquote className="mt-2 hidden max-w-lg gap-1.5 text-sm italic leading-snug text-white/85 sm:flex">
                    <Quote className="mt-0.5 size-3.5 shrink-0 rotate-180 text-accent" aria-hidden />
                    <span className="line-clamp-2">{trip.quote}</span>
                  </blockquote>

                  <p className="mt-2 flex min-w-0 items-center gap-1 text-[11px] font-medium text-white/80 sm:text-xs">
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{trip.route.join(" → ")}</span>
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium text-white sm:text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                      <Clock className="size-3" aria-hidden />
                      {trip.duration}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 backdrop-blur-sm",
                        trip.seatsLeft <= 5 ? "bg-accent/90" : "bg-white/15",
                      )}
                    >
                      <Users className="size-3" aria-hidden />
                      {trip.seatsLeft <= 5 ? `Only ${trip.seatsLeft} seats left` : `${trip.seatsLeft} seats left`}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/15 pt-3">
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
                      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-accent px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                    >
                      Travel with {trip.creator.split(" ")[0]}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Story-style progress: fills while a trip is on screen */}
      <div className="mt-3 flex gap-1.5">
        {trips.map((trip, i) => (
          <button
            key={trip.id}
            type="button"
            aria-label={`Show ${trip.destination} trip`}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className="group/bar flex-1 py-1.5 focus-visible:outline-none"
          >
            <span className="block h-1 overflow-hidden rounded-full bg-neutral-200 transition group-hover/bar:bg-neutral-300 group-focus-visible/bar:ring-2 group-focus-visible/bar:ring-primary-500">
              {i < active || (i === active && !autoplay) ? (
                <span className="block h-full w-full rounded-full bg-primary-700" />
              ) : i === active ? (
                <span
                  key={active}
                  className="animate-story-progress block h-full w-full rounded-full bg-primary-700"
                  style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
                />
              ) : null}
            </span>
            <span
              className={cn(
                "mt-1.5 hidden truncate text-left text-[11px] font-medium sm:block",
                i === active ? "text-ink" : "text-ink-subtle",
              )}
            >
              {trip.destination}
            </span>
          </button>
        ))}
      </div>

      <InfluencerReels trips={trips} />
    </section>
  );
}
