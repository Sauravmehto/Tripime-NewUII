"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, MapPin, ShieldCheck, Star } from "lucide-react";
import { SearchForm } from "@/components/search/search-form";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { telLink, whatsappLink } from "@/lib/contact";
import { cn } from "@/lib/cn";
import { TRENDING_TRIPS } from "@/lib/home/home-data";

const HERO_SLIDES = TRENDING_TRIPS.slice(0, 5);
const ROTATE_MS = 2000;

function HeroPlane() {
  return (
    <svg
      viewBox="0 0 200 80"
      className="pointer-events-none absolute -right-2 top-8 z-10 w-36 text-primary-600 opacity-90 sm:w-44"
      aria-hidden
    >
      <path
        d="M 8 52 Q 60 20 120 38 T 192 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 6"
        className="animate-route-dash opacity-40"
      />
      <g className="animate-plane-glide">
        <path
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-4.5L21 16Z"
          fill="currentColor"
          transform="translate(118, 22) scale(0.55)"
        />
      </g>
    </svg>
  );
}

export function HomeHero() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const active = HERO_SLIDES[index] ?? HERO_SLIDES[0]!;

  useEffect(() => {
    if (reduceMotion || HERO_SLIDES.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const fade = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="relative overflow-hidden border-b border-neutral-200/70">
      <div
        className="absolute inset-0 overflow-hidden bg-linear-to-br from-neutral-100/90 via-canvas to-primary-50/40"
        aria-hidden
      >
        <div className="pointer-events-none absolute -left-16 -top-20 size-[22rem] rounded-full bg-primary-500/25 blur-3xl sm:size-[28rem] animate-orb-float" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 size-[20rem] rounded-full bg-accent/20 blur-3xl sm:size-[24rem] animate-orb-float-delayed" />
        <div className="pointer-events-none absolute left-[28%] top-1/2 size-[14rem] -translate-y-1/2 rounded-full bg-primary-300/30 blur-3xl sm:size-[18rem] animate-orb-pulse" />
        <div className="pointer-events-none absolute right-[18%] top-8 size-[12rem] rounded-full bg-accent/12 blur-3xl animate-orb-float" />
      </div>
      <Container className="relative py-8 sm:py-10 lg:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div>
            <div className="max-w-xl">
              <motion.div {...fade(0.05)}>
                <Badge tone="accent">Flights & holidays · Human experts</Badge>
              </motion.div>
              <motion.h1
                {...fade(0.12)}
                className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-display"
              >
                Travel that feels{" "}
                <span className="text-primary-700">premium</span> — and books in
                minutes.
              </motion.h1>
              <motion.p
                {...fade(0.2)}
                className="mt-3 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-[0.9375rem]"
              >
                Search domestic flights from Delhi, explore curated holiday packages,
                or talk to a real travel expert. No chatbots. No hidden fees.
              </motion.p>
            </div>

            <motion.div {...fade(0.28)} className="mt-5 w-full min-w-0">
              <SearchForm />
            </motion.div>

            <motion.div
              {...fade(0.36)}
              className="mt-4 flex flex-wrap items-center gap-2"
            >
              <Link href="/packages">
                <Button variant="outline" size="sm">
                  Browse packages
                </Button>
              </Link>
              <a href={whatsappLink("Hi Tripime, help me plan a trip.")}>
                <Button variant="ghost" size="sm">
                  WhatsApp an expert
                </Button>
              </a>
            </motion.div>
          </div>

          <motion.div
            {...fade(0.18)}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="relative aspect-[4/5] max-h-[min(68vh,520px)] overflow-hidden rounded-2xl shadow-elevated sm:aspect-[5/6]">
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={active.id}
                  className="absolute inset-0"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image
                    src={active.image}
                    alt={`${active.destination}, ${active.country}`}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 1024px) 90vw, 45vw"
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>

              <div className="absolute inset-0 z-[1] bg-linear-to-t from-ink/50 via-transparent to-transparent" />
              <HeroPlane />

              {/* Live package chip — syncs with image */}
              <div className="absolute left-3 top-3 z-[2] max-w-[180px] sm:left-4 sm:top-4 sm:max-w-[200px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.id}
                    initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="animate-float rounded-xl border border-white/20 bg-white/95 p-2.5 shadow-medium backdrop-blur-sm"
                  >
                    <Link href={active.href} className="block">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0 text-accent" aria-hidden />
                        <p className="text-[11px] font-bold text-ink">
                          {active.destination}, {active.country}
                        </p>
                      </div>
                      <p className="mt-1 text-[10px] text-ink-muted">
                        {active.duration.replace(" / ", " · ")} · from {active.price}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-subtle">
                        <Star className="size-3 fill-warning-500 text-warning-500" />
                        {active.rating} · Trending
                      </div>
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Trust card stays fixed */}
              <motion.div
                {...fade(0.55)}
                className="absolute bottom-3 right-3 z-[2] max-w-[170px] rounded-xl border border-white/20 bg-ink/85 p-2.5 text-white shadow-medium backdrop-blur-sm sm:bottom-4 sm:right-4"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-success-500" aria-hidden />
                  <p className="text-[11px] font-semibold">Trusted booking</p>
                </div>
                <p className="mt-1 text-[10px] text-white/75">
                  Instant e-ticket · Real support ·{" "}
                  <a href={telLink()} className="underline underline-offset-2">
                    Call us
                  </a>
                </p>
              </motion.div>

              {/* Slide dots */}
              <div className="absolute bottom-3 left-3 z-[2] flex gap-1.5 sm:bottom-4 sm:left-4">
                {HERO_SLIDES.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Show ${slide.destination}`}
                    aria-current={i === index}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      i === index ? "w-5 bg-accent" : "w-1.5 bg-white/50 hover:bg-white/80",
                    )}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.a
          href="#explore"
          {...fade(0.65)}
          className="mt-8 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle transition hover:text-ink"
        >
          Explore destinations
          <ArrowDown className="size-3.5 animate-bounce-soft" aria-hidden />
        </motion.a>
      </Container>
    </section>
  );
}
