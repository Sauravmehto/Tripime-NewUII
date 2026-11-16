"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, MessageCircle, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/contact";
import { TRENDING_TRIPS } from "@/lib/home/home-data";
import { HeroVoyageSlider } from "./hero-voyage-slider";
import { SmartTravelSearch } from "./smart-travel-search";

const HERO_SLIDES = TRENDING_TRIPS.slice(0, 5);
const ROTATE_MS = 5500;

export function HomeHero() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = HERO_SLIDES[index] ?? HERO_SLIDES[0]!;

  // Depending on `index` restarts the timer after a manual slide change.
  useEffect(() => {
    if (reduceMotion || paused || HERO_SLIDES.length < 2) return;
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, reduceMotion]);

  const fade = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="relative z-10 isolate overflow-x-clip">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={active.id}
            className="absolute inset-0"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              // Full-bleed on wide screens, so use a larger source than the 800px card thumbnails. It also
              // gives this image its own address, so Next's dev check can't confuse it with lazy copies below.
              src={active.image.replace("w=800", "w=1600")}
              alt=""
              fill
              preload={index === 0}
              loading={index === 0 ? "eager" : undefined}
              fetchPriority={index === 0 ? "high" : undefined}
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-linear-to-br from-primary-900/95 via-primary-900/82 to-accent/40" />
        <div className="absolute inset-0 bg-linear-to-t from-ink/50 via-transparent to-ink/20" />
      </div>

      <Container className="relative grid items-center gap-8 py-9 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:py-16">
        <div className="min-w-0">
          <div className="max-w-xl lg:max-w-2xl">
            <motion.p
              {...fade(0.05)}
              className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 lg:block"
            >
              Tripime
            </motion.p>
            <motion.h1
              {...fade(0.1)}
              className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-[1.1]"
            >
              <span>Discover More. Travel Better. Experience Everything.</span>
            </motion.h1>
            <motion.p
              {...fade(0.16)}
              className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-[0.95rem]"
            >
              Explore extraordinary destinations, thoughtfully curated holidays and unforgettable travel
              experiences.
            </motion.p>
          </div>

          <motion.div {...fade(0.24)} className="relative z-30 mt-3 w-full max-w-2xl lg:mt-5">
            <SmartTravelSearch />
          </motion.div>

          <motion.div
            {...fade(0.32)}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <a
              href={whatsappLink("Hi Tripime, help me plan a trip.")}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:block"
            >
              <Button variant="accent" size="lg">
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp an expert
              </Button>
            </a>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-white/75">
              <ShieldCheck className="size-3.5 shrink-0 text-accent" aria-hidden />
              Real experts · Transparent pricing · Call or WhatsApp
            </p>
          </motion.div>

          <motion.a
            href="#destinations"
            {...fade(0.4)}
            className="mt-8 hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60 transition hover:text-white lg:inline-flex"
          >
            Explore destinations
            <ArrowDown className="size-3.5 animate-bounce-soft" aria-hidden />
          </motion.a>
        </div>

        <motion.div {...fade(0.2)} className="hidden justify-center lg:flex">
          <HeroVoyageSlider
            slides={HERO_SLIDES}
            index={index}
            onChange={setIndex}
            onHoverChange={setPaused}
            reduceMotion={!!reduceMotion}
          />
        </motion.div>
      </Container>
    </section>
  );
}
