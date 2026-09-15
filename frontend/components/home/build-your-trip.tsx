"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  BUDGET_OPTIONS,
  DURATION_OPTIONS,
  PLACE_OPTIONS,
  TRIP_RECOMMENDATIONS,
  VIBE_OPTIONS,
} from "@/lib/home/home-data";

const STEPS = ["Vibe", "Place", "Budget", "Duration"] as const;

function OptionGrid({
  options,
  selected,
  onSelect,
}: {
  options: readonly string[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
            selected === opt
              ? "border-primary-600 bg-primary-700 text-white shadow-xs"
              : "border-neutral-200 bg-white text-ink-muted hover:border-primary-200",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function BuildYourTrip() {
  const [step, setStep] = useState(0);
  const [vibe, setVibe] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const recommendations = useMemo(() => {
    if (!vibe || !place) return TRIP_RECOMMENDATIONS.default;
    const key = `${vibe}-${place}`;
    return TRIP_RECOMMENDATIONS[key] ?? TRIP_RECOMMENDATIONS.default;
  }, [vibe, place]);

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else setDone(true);
  }

  function canAdvance() {
    if (step === 0) return !!vibe;
    if (step === 1) return !!place;
    if (step === 2) return !!budget;
    if (step === 3) return !!duration;
    return false;
  }

  return (
    <Section>
        <Reveal>
          <SectionHeading
            eyebrow="Build your trip"
            title="Four taps to a trip idea"
            subtitle="A frontend recommendation experience — not AI. Structured so real APIs can plug in later."
          />
        </Reveal>

        <Reveal className="mt-6" delayMs={80}>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-4 py-3">
              {STEPS.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                    i === step
                      ? "bg-primary-700 text-white"
                      : i < step
                        ? "bg-primary-50 text-primary-700"
                        : "bg-neutral-100 text-ink-subtle",
                  )}
                >
                  {i + 1}. {label}
                </span>
              ))}
            </div>

            <div className="p-4 sm:p-5">
              <AnimatePresence mode="wait">
                {!done ? (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {step === 0 && (
                      <>
                        <p className="mb-3 text-sm font-semibold text-ink">
                          What&apos;s your vibe?
                        </p>
                        <OptionGrid options={VIBE_OPTIONS} selected={vibe} onSelect={setVibe} />
                      </>
                    )}
                    {step === 1 && (
                      <>
                        <p className="mb-3 text-sm font-semibold text-ink">
                          Where do you want to go?
                        </p>
                        <OptionGrid options={PLACE_OPTIONS} selected={place} onSelect={setPlace} />
                      </>
                    )}
                    {step === 2 && (
                      <>
                        <p className="mb-3 text-sm font-semibold text-ink">Budget</p>
                        <OptionGrid
                          options={BUDGET_OPTIONS}
                          selected={budget}
                          onSelect={setBudget}
                        />
                      </>
                    )}
                    {step === 3 && (
                      <>
                        <p className="mb-3 text-sm font-semibold text-ink">Duration</p>
                        <OptionGrid
                          options={DURATION_OPTIONS}
                          selected={duration}
                          onSelect={setDuration}
                        />
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Sparkles className="size-4 text-accent" />
                      Picks for {vibe} · {place} · {budget} · {duration}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {recommendations.map((trip) => (
                        <Link
                          key={trip.id}
                          href={trip.href}
                          className="flex overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-soft"
                        >
                          <div className="relative h-20 w-24 shrink-0">
                            <Image
                              src={trip.image}
                              alt={trip.destination}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex flex-col justify-center p-2.5">
                            <p className="text-sm font-bold text-ink">{trip.destination}</p>
                            <p className="text-[11px] text-ink-muted">
                              {trip.duration} · from {trip.price}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link href="/packages" className="mt-4 inline-block">
                      <Button size="sm">View all packages</Button>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {!done && (
                <div className="mt-5 flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={!canAdvance()}
                    onClick={next}
                  >
                    {step === STEPS.length - 1 ? "Build my trip" : "Continue"}
                  </Button>
                  {step > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep((s) => s - 1)}
                    >
                      Back
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </Reveal>
    </Section>
  );
}
