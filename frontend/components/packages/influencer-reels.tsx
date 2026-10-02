"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import type { InfluencerTrip } from "@/lib/packages/influencer-trips";

const FRAME_MS = 3500;

type ReelSource = { kind: "file"; src: string } | { kind: "embed"; src: string };

/** Turns a creator's video link into something the viewer can play. */
function reelSource(url: string): ReelSource {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) {
    return {
      kind: "embed",
      src: `https://www.youtube.com/embed/${youtube[1]}?autoplay=1&playsinline=1&rel=0`,
    };
  }
  const instagram = url.match(/instagram\.com\/(?:reels?|p)\/([\w-]+)/);
  if (instagram) {
    return { kind: "embed", src: `https://www.instagram.com/reel/${instagram[1]}/embed` };
  }
  return { kind: "file", src: url };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function firstName(name: string) {
  return name.split(" ")[0];
}

// Memoized so the carousel autoplay above does not re-render an open reel.
export const InfluencerReels = memo(function InfluencerReels({ trips }: { trips: InfluencerTrip[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function close() {
    const index = open;
    setOpen(null);
    if (index !== null) triggerRefs.current[index]?.focus();
  }

  return (
    <div className="mt-8">
      <div>
        <h3 className="text-base font-bold tracking-tight text-ink sm:text-lg">
          Watch their journeys
        </h3>
        <p className="mt-0.5 text-sm text-ink-muted">
          Real trips on Tripime packages, filmed by the creators themselves.
        </p>
      </div>

      <ul className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible">
        {trips.map((trip, i) => (
          <li key={trip.id} className="w-[42%] shrink-0 snap-start sm:w-[28%] lg:w-auto">
            <button
              ref={(el) => {
                triggerRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Watch ${trip.reelTitle}`}
              className="group block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-primary-900 shadow-medium">
                <Image
                  src={trip.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                />
                <div className="absolute inset-0 bg-linear-to-b from-ink/60 via-transparent to-ink/70" />

                <p className="absolute inset-x-0 top-0 p-3 text-xl font-black uppercase leading-none tracking-tight text-white drop-shadow-md sm:text-2xl">
                  {trip.destination}
                </p>

                <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-medium transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                  <Play className="ml-0.5 size-5 fill-current" aria-hidden />
                </span>

                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-3">
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white ring-2 ring-white/80"
                  >
                    {initials(trip.creator)}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-white">{trip.handle}</span>
                </div>
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-semibold text-ink group-hover:text-primary-700">
                {trip.reelTitle}
              </p>
              <p className="text-xs text-ink-muted">
                {trip.dates} · from {formatINR(trip.price)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <ReelViewer
          key={trips[open].id}
          trip={trips[open]}
          onClose={close}
          onPrev={open > 0 ? () => setOpen(open - 1) : undefined}
          onNext={open < trips.length - 1 ? () => setOpen(open + 1) : undefined}
        />
      )}
    </div>
  );
});

interface ReelViewerProps {
  trip: InfluencerTrip;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

function ReelViewer({ trip, onClose, onPrev, onNext }: ReelViewerProps) {
  const reduceMotion = useReducedMotion();
  const source = trip.video ? reelSource(trip.video) : null;
  // Without a video, the reel is a photo story: the hero shot, then the moments.
  const frames = [{ src: trip.image, alt: trip.imageAlt }, ...trip.moments];
  const [frame, setFrame] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  function prevFrame() {
    if (frame > 0) setFrame(frame - 1);
    else onPrev?.();
  }

  function nextFrame() {
    if (frame < frames.length - 1) setFrame(frame + 1);
    else onNext?.();
  }

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") (source ? onPrev : prevFrame)?.();
      else if (e.key === "ArrowRight") (source ? onNext : nextFrame)?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // Photo story autoplay; after the last photo it moves on to the next creator.
  useEffect(() => {
    if (source || reduceMotion) return;
    const id = window.setTimeout(() => {
      if (frame < frames.length - 1) setFrame(frame + 1);
      else onNext?.();
    }, FRAME_MS);
    return () => window.clearTimeout(id);
  }, [frame, frames.length, onNext, reduceMotion, source]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={trip.reelTitle}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 backdrop-blur-md"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="size-5" aria-hidden />
      </button>

      {onPrev && (
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous creator"
          className="relative mr-4 hidden size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}

      <div className="relative flex w-full max-w-[min(24rem,calc((100dvh-9rem)*9/16))] flex-col">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black">
          {source?.kind === "file" && (
            <video
              src={source.src}
              poster={trip.image}
              autoPlay
              playsInline
              controls
              className="absolute inset-0 size-full object-cover"
            />
          )}
          {source?.kind === "embed" && (
            <iframe
              src={source.src}
              title={trip.reelTitle}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          )}
          {!source && (
            <>
              {frames.map((f, i) => (
                <Image
                  key={f.src}
                  src={f.src}
                  alt={f.alt}
                  fill
                  sizes="384px"
                  priority={i === 0}
                  className={cn(
                    "object-cover transition-opacity duration-500 motion-reduce:transition-none",
                    i === frame ? "opacity-100" : "opacity-0",
                  )}
                />
              ))}
              <div className="absolute inset-0 bg-linear-to-b from-ink/60 via-transparent to-ink/40" />
              {/* Tap left third for back, the rest for forward, like a story */}
              <button
                type="button"
                onClick={prevFrame}
                aria-label="Previous photo"
                className="absolute inset-y-0 left-0 w-1/3 focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={nextFrame}
                aria-label="Next photo"
                className="absolute inset-y-0 right-0 w-2/3 focus-visible:outline-none"
              />
            </>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
            {!source && (
              <div className="flex gap-1">
                {frames.map((f, i) => (
                  <span key={f.src} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
                    {i < frame || (i === frame && reduceMotion) ? (
                      <span className="block h-full w-full bg-white" />
                    ) : i === frame ? (
                      <span
                        key={frame}
                        className="animate-story-progress block h-full w-full bg-white"
                        style={{ animationDuration: `${FRAME_MS}ms` }}
                      />
                    ) : null}
                  </span>
                ))}
              </div>
            )}
            {source?.kind !== "embed" && (
              <div className="mt-3 flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white ring-2 ring-white/80"
                >
                  {initials(trip.creator)}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-xs font-semibold text-white">
                    <span className="truncate">{trip.handle}</span>
                    <BadgeCheck className="size-3.5 shrink-0 fill-primary-500 text-white" aria-hidden />
                  </p>
                  <p className="text-[10px] text-white/75">Sponsored by Tripime</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{trip.reelTitle}</p>
            <p className="truncate text-xs text-white/70">
              {trip.dates} · {trip.duration} · from {formatINR(trip.price)}
            </p>
          </div>
          <Link
            href={trip.href}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-accent px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Travel with {firstName(trip.creator)}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      {onNext && (
        <button
          type="button"
          onClick={onNext}
          aria-label="Next creator"
          className="relative ml-4 hidden size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
