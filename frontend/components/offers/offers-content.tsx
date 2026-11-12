"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, ClipboardCheck, Copy, MessageCircle, Phone, Search, ShieldCheck, Ticket } from "lucide-react";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/cn";
import { HELPLINE_DISPLAY, telLink, whatsappLink } from "@/lib/contact";

const STEPS = [
  { icon: Search, title: "Pick an offer", body: "Browse by category or scroll the list. Open Details to see everything that is included." },
  { icon: ClipboardCheck, title: "Check the terms", body: "Look at the validity date, any minimum booking amount and the terms before you decide." },
  { icon: Copy, title: "Copy the code", body: "If an offer has a coupon code, copy it with one tap and keep it ready for booking." },
  { icon: Ticket, title: "Book or ask us", body: "Use the offer's button, or message a Tripime expert to confirm price and availability." },
];

const FAQS = [
  {
    q: "How do I use a coupon code?",
    a: "Copy the code from the offer card and share it with the Tripime expert when you book or enquire. Only offers that show a code need one.",
  },
  {
    q: "Can I combine two offers?",
    a: "It depends on the offer. The terms on each offer say whether it can be combined. If it is not mentioned, ask us before you book.",
  },
  {
    q: "What happens when an offer expires?",
    a: "Offers are shown only while they are valid, and the end date is on the card. If one has just ended, ask an expert whether a similar deal is available.",
  },
  {
    q: "How do bank offers work?",
    a: "Bank offers apply to the cards or accounts named on the offer, often with a minimum booking value. Check the terms on the offer for the details.",
  },
  {
    q: "Is the price final?",
    a: "Prices on packages are starting prices. A Tripime travel expert confirms the final price and availability before you pay anything.",
  },
];

export function HowOffersWork() {
  const reduceMotion = !!useReducedMotion();
  return (
    <section aria-labelledby="how-offers-title" className="mt-10">
      <h2 id="how-offers-title" className="text-lg font-bold text-ink sm:text-xl">
        How offers work
      </h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <motion.li
            key={title}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="relative rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <Icon className="size-5" aria-hidden />
            </span>
            <p className="mt-3 text-xs font-semibold text-ink-subtle">Step {i + 1}</p>
            <h3 className="text-sm font-bold text-ink">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
          </motion.li>
        ))}
      </ol>
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-800">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Nothing is charged online here. A Tripime expert confirms the final price and availability first.
      </p>
    </section>
  );
}

export function OffersFaq() {
  const reduceMotion = !!useReducedMotion();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section aria-labelledby="offers-faq-title" className="mt-10">
      <h2 id="offers-faq-title" className="text-lg font-bold text-ink sm:text-xl">
        Questions about offers
      </h2>
      <div className="mt-3 divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {FAQS.map(({ q, a }, i) => {
          const isOpen = open === i;
          return (
            <div key={q}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`offers-faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-ink transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                >
                  {q}
                  <ChevronDown
                    className={cn("size-4 shrink-0 text-ink-muted transition-transform", isOpen && "rotate-180")}
                    aria-hidden
                  />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`offers-faq-${i}`}
                    initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm text-ink-muted">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function OffersContactBand({ className }: { className?: string }) {
  return (
    <section
      aria-label="Ask an expert about offers"
      className={cn(
        "rounded-2xl bg-linear-to-br from-primary-800 to-primary-600 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-7",
        className,
      )}
    >
      <div>
        <h2 className="text-lg font-bold sm:text-xl">Not sure which offer fits?</h2>
        <p className="mt-1 max-w-xl text-sm text-white/85">
          Tell us where you want to go and when. A Tripime expert will share the best current price and any offer that
          applies.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
        <a
          href={whatsappLink("Hi Tripime, which travel offers are live right now? I'd like help choosing one.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-ink transition hover:brightness-95 active:scale-95"
        >
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp us
        </a>
        <a
          href={telLink()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
        >
          <Phone className="size-4" aria-hidden />
          {HELPLINE_DISPLAY}
        </a>
        <Link
          href="/packages"
          className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
        >
          Browse packages
        </Link>
      </div>
    </section>
  );
}

/** Used by the page so the content sections are never missing, even with no live offers. */
export function OffersContent() {
  return (
    <Container className="pb-10">
      <HowOffersWork />
      <OffersFaq />
      <OffersContactBand className="mt-10" />
    </Container>
  );
}
