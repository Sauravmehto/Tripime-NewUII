"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, MessageCircle, ShieldCheck } from "lucide-react";
import { SearchForm } from "@/components/search/search-form";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/contact";
import { TRENDING_TRIPS } from "@/lib/home/home-data";
import { HeroVoyageSlider } from "./hero-voyage-slider";

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
    <section className="relative isolate overflow-hidden border-b border-neutral-200/70">
      <div className="absolute inset-0" aria-hidden>
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
              src={active.image}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-linear-to-br from-primary-900/95 via-primary-900/82 to-accent/40" />
        <div className="absolute inset-0 bg-linear-to-t from-ink/50 via-transparent to-ink/20" />
      </div>

      <Container className="relative grid items-center gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:py-14">
        <div className="min-w-0">
          <div className="max-w-xl lg:max-w-2xl">
            <motion.p
              {...fade(0.05)}
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70"
            >
              Tripime
            </motion.p>
            <motion.h1
              {...fade(0.1)}
              className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-[1.1]"
            >
              Discover and plan travel that feels{" "}
              <span className="text-accent">premium</span> — in minutes.
            </motion.h1>
            <motion.p
              {...fade(0.16)}
              className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-[0.9375rem]"
            >
              Search domestic flights from Delhi, explore curated holiday packages, or talk to a
              real travel expert. No chatbots. No hidden fees.
            </motion.p>
          </div>

          <motion.div {...fade(0.24)} className="mt-5 w-full max-w-xl lg:max-w-2xl">
            <SearchForm />
          </motion.div>

          <motion.div
            {...fade(0.32)}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <a
              href={whatsappLink("Hi Tripime, help me plan a trip.")}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="accent" size="lg" className="w-full sm:w-auto">
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp an expert
              </Button>
            </a>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-white/75">
              <ShieldCheck className="size-3.5 shrink-0 text-accent" aria-hidden />
              Real experts · Call or WhatsApp
            </p>
          </motion.div>

          <motion.a
            href="#explore"
            {...fade(0.4)}
            className="mt-8 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60 transition hover:text-white"
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
