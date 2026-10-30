"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MessageCircle, Phone, Search, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/card";
import { HELPLINE_DISPLAY, telLink, whatsappLink } from "@/lib/contact";
import { HERO_IMAGE, HERO_QUICK_PICKS } from "@/lib/packages/package-landing-data";
import { HOLIDAY_DESTINATIONS, TRAVEL_MONTHS } from "@/lib/packages/holidays-data";

interface PackagesHeroProps {
  onSearch: (values: { to: string; month?: string }) => void;
}

export function PackagesHero({ onSearch }: PackagesHeroProps) {
  const reduceMotion = useReducedMotion();
  const [to, setTo] = useState("");
  const [month, setMonth] = useState("");

  const fade = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch({ to: to.trim(), month });
  }

  return (
    <section className="relative isolate overflow-hidden border-b border-neutral-200/70">
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-br from-primary-900/95 via-primary-900/82 to-accent/40" />
      </div>

      <Container className="relative py-8 sm:py-10 lg:py-12">
        <div className="max-w-2xl">
          <motion.div {...fade(0.05)}>
            <Badge tone="accent" className="bg-white/15 text-white ring-1 ring-white/25">
              Tripime Holidays
            </Badge>
          </motion.div>
          <motion.h1
            {...fade(0.1)}
            className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-[1.1]"
          >
            <span className="lg:hidden">Find your next holiday</span>
            <span className="hidden lg:inline">
              Tell us where. Tell us your budget.{" "}
              <span className="text-accent">We&apos;ll make it unforgettable.</span>
            </span>
          </motion.h1>
          <motion.p
            {...fade(0.16)}
            className="mt-2.5 hidden max-w-lg text-sm leading-relaxed text-white/80 lg:block"
          >
            No endless searching. No confusing packages. Just tell us what you want from your
            holiday, and we&apos;ll find the right stays, experiences and transfers to create a
            trip you&apos;ll actually remember.
          </motion.p>
          <motion.div
            {...fade(0.22)}
            className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-white/75"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-accent" aria-hidden />
              No payment until the plan is final
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5 text-accent" aria-hidden />
              {HELPLINE_DISPLAY}
            </span>
          </motion.div>
        </div>

        <motion.div
          {...fade(0.28)}
          className="mt-5 rounded-2xl border border-white/20 bg-white/95 p-3.5 shadow-elevated backdrop-blur-sm sm:p-4"
        >
          <form
            onSubmit={handleSubmit}
            className="grid gap-2.5 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end"
          >
            <Field label="Where do you want to go?">
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Goa, Kerala, Dubai, Bali…"
                list="tripime-holiday-destinations"
                autoComplete="off"
              />
              <datalist id="tripime-holiday-destinations">
                {HOLIDAY_DESTINATIONS.map((dest) => (
                  <option key={dest} value={dest} />
                ))}
              </datalist>
            </Field>
            <Field label="Month (optional)" className="hidden sm:block">
              <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">Not decided yet</option>
                {TRAVEL_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" size="lg" variant="accent" className="h-12 text-base sm:h-10 sm:min-w-[132px] sm:text-sm">
              <Search className="size-4" aria-hidden />
              Find holidays
            </Button>
          </form>

          <div className="no-scrollbar -mx-3.5 mt-3 flex items-center gap-1.5 overflow-x-auto border-t border-neutral-100 px-3.5 pt-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <span className="mr-1 hidden text-[11px] font-semibold text-ink-subtle sm:inline">Popular:</span>
            {HERO_QUICK_PICKS.map(({ label, icon: Icon, term }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setTo(term);
                  onSearch({ to: term, month });
                }}
                className="group inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold text-ink-muted transition hover:border-accent hover:bg-accent-soft hover:text-accent sm:min-h-0 sm:px-2.5 sm:py-1 sm:text-[11px]"
              >
                <Icon
                  className="size-3 transition group-hover:scale-110"
                  aria-hidden
                />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div {...fade(0.34)} className="mt-4 hidden flex-wrap gap-2 lg:flex">
          <a
            href={telLink()}
            className={buttonClasses({
              variant: "outline",
              size: "sm",
              className: "border-white/30 bg-white/10 text-white hover:bg-white/20",
            })}
          >
            <Phone className="size-3.5" aria-hidden />
            Talk to an expert
          </a>
          <a
            href={whatsappLink("Hi Tripime, I'd like help planning a holiday package.")}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({
              variant: "outline",
              size: "sm",
              className: "border-white/30 bg-white/10 text-white hover:bg-white/20",
            })}
          >
            <MessageCircle className="size-3.5" aria-hidden />
            WhatsApp us
          </a>
        </motion.div>
      </Container>
    </section>
  );
}
