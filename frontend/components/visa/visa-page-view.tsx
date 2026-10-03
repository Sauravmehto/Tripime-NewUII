"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Clock,
  FileCheck2,
  MessageCircle,
  Phone,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/home/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { FaqList } from "@/components/marketing/faq-list";
import { LeadEnquiryForm } from "@/components/enquiries/lead-enquiry-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { telLink, whatsappLink } from "@/lib/contact";
import {
  VISA_DESTINATIONS,
  VISA_FAQS,
  VISA_FILTERS,
  VISA_HERO_POSTER,
  VISA_HERO_VIDEO,
  VISA_STEPS,
  VISA_TRUST,
  visaEnquiryMessage,
  visaWhatsAppMessage,
  type VisaDestination,
  type VisaKind,
} from "@/lib/visa/visa-data";
import { VisaStickyHelp } from "./visa-sticky-help";

const TRUST_ICONS = [Receipt, FileCheck2, MessageCircle];

const QUICK_LINKS = [
  { href: "#destinations", label: "Destinations" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#why-tripime", label: "Why Tripime" },
  { href: "#visa-faqs", label: "FAQs" },
] as const;

export function VisaPageView() {
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<"all" | VisaKind>("all");
  const [selected, setSelected] = useState<VisaDestination | null>(null);

  const destinations = useMemo(
    () =>
      filter === "all"
        ? VISA_DESTINATIONS
        : VISA_DESTINATIONS.filter((d) => d.visaKinds.includes(filter)),
    [filter],
  );

  const enquiryMessage = selected
    ? visaEnquiryMessage(selected.country, selected.type)
    : "";

  function enquireFor(dest: VisaDestination) {
    setSelected(dest);
    requestAnimationFrame(() => {
      document.getElementById("visa-enquiry")?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  const fade = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-neutral-200">
        <div className="absolute inset-0" aria-hidden>
          {!reduceMotion ? (
            <video
              className="absolute inset-0 size-full object-cover"
              src={VISA_HERO_VIDEO}
              poster={VISA_HERO_POSTER}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <Image
              src={VISA_HERO_POSTER}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-br from-primary-900/95 via-primary-900/82 to-accent/35" />
          <div className="absolute inset-0 bg-linear-to-t from-ink/45 via-transparent to-ink/20" />
        </div>

        <Container className="relative py-10 sm:py-12 lg:py-16">
          <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div className="max-w-xl">
              <motion.p
                {...fade(0.05)}
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70"
              >
                Visa assistance
              </motion.p>
              <motion.h1
                {...fade(0.1)}
                className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-[1.1]"
              >
                Visa help with a{" "}
                <span className="text-accent">Tripime expert</span>
              </motion.h1>
              <motion.p
                {...fade(0.16)}
                className="mt-3 text-sm leading-relaxed text-white/80 sm:text-[0.9375rem]"
              >
                Tourist, business, and transit visas — honest guidance from checklist to
                decision. No chatbots. No hidden fees.
              </motion.p>
              <motion.p
                {...fade(0.2)}
                className="mt-3 inline-flex items-start gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/85 ring-1 ring-white/15"
              >
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                Online applications launching soon — talk to an expert today.
              </motion.p>

              <motion.div
                {...fade(0.28)}
                className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
              >
                <a
                  href={whatsappLink(
                    "Hi Tripime, I need help with a visa. Please guide me.",
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button variant="accent" size="lg" className="w-full sm:w-auto">
                    <MessageCircle className="size-4" aria-hidden />
                    Enquire on WhatsApp
                  </Button>
                </a>
                <a href={telLink()} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
                  >
                    <Phone className="size-4" aria-hidden />
                    Request a callback
                  </Button>
                </a>
              </motion.div>
            </div>

            <motion.div
              {...fade(0.22)}
              id="visa-enquiry"
              className="scroll-mt-24 rounded-2xl bg-white/95 p-5 shadow-elevated ring-1 ring-neutral-900/5 backdrop-blur-sm sm:p-6"
            >
              <LeadEnquiryForm
                source="service"
                serviceType="visa"
                title="Visa enquiry"
                submitLabel="Get visa help"
                showTravelFields
                initialMessage={enquiryMessage}
                messageKey={selected?.id ?? "none"}
                redirectToWhatsapp
              />
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Quick links */}
      <div className="border-b border-neutral-200 bg-white">
        <Container className="py-3">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="min-h-9 shrink-0 rounded-full border border-neutral-200 bg-canvas px-3.5 py-2 text-xs font-semibold text-ink-muted transition hover:border-primary-200 hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <a
              href={whatsappLink("Hi Tripime, I need help with a visa.")}
              target="_blank"
              rel="noreferrer"
              className="min-h-9 shrink-0 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-2 text-xs font-semibold text-accent transition hover:border-accent"
            >
              WhatsApp
            </a>
          </div>
        </Container>
      </div>

      {/* Destinations */}
      <Section id="destinations" className="bg-canvas">
        <Reveal>
          <SectionHeading
            eyebrow="Destinations"
            title="Where do you need a visa?"
            subtitle="Indicative timelines only — tap a destination to enquire or WhatsApp an expert."
          />
        </Reveal>

        <Reveal className="mt-5" delayMs={40}>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {VISA_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "min-h-9 shrink-0 rounded-lg border px-3.5 py-2 text-xs font-semibold transition",
                  filter === id
                    ? "border-primary-600 bg-primary-700 text-white"
                    : "border-neutral-200 bg-white text-ink-muted hover:border-primary-200 hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest, i) => (
            <Reveal key={dest.id} delayMs={i * 40}>
              <article className="group overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs transition hover:shadow-medium">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={dest.image}
                    alt={`${dest.country} visa assistance`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-ink/55 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="text-base font-bold">{dest.country}</p>
                    <p className="text-xs text-white/80">{dest.type}</p>
                  </div>
                </div>
                <div className="p-3.5">
                  <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                    <Clock className="size-3.5 shrink-0 text-primary-600" aria-hidden />
                    {dest.timeline}
                    <span className="text-ink-subtle">· indicative</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={whatsappLink(
                        visaWhatsAppMessage(dest.country, dest.type),
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="accent" size="sm">
                        <MessageCircle className="size-3.5" aria-hidden />
                        WhatsApp
                      </Button>
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => enquireFor(dest)}
                    >
                      Enquire
                    </Button>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {destinations.length === 0 && (
          <p className="mt-6 text-sm text-ink-muted">No destinations match this filter.</p>
        )}
      </Section>

      {/* How it works */}
      <Section id="how-it-works" className="border-y border-neutral-200 bg-white">
        <Reveal>
          <SectionHeading
            title="How it works"
            subtitle="Three honest steps — assisted by a real expert, not a fake online portal."
          />
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {VISA_STEPS.map((step, i) => (
            <Reveal key={step.number} delayMs={i * 50}>
              <div className="h-full rounded-xl border border-neutral-200 bg-canvas p-5">
                <p className="text-sm font-bold text-primary-600">{step.number}</p>
                <h3 className="mt-2 text-base font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Why Tripime */}
      <Section id="why-tripime">
        <Reveal>
          <SectionHeading
            align="center"
            title="Why plan your visa with Tripime"
            subtitle="High-stakes paperwork deserves clear fees and human help."
          />
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {VISA_TRUST.map((item, i) => {
            const Icon = TRUST_ICONS[i] ?? ShieldCheck;
            return (
              <Reveal key={item.title} delayMs={i * 50}>
                <div className="text-center sm:text-left">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 sm:mx-0">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal className="mt-6 text-center" delayMs={120}>
          <p className="text-sm text-ink-muted">
            See our{" "}
            <Link href="/privacy" className="font-semibold text-primary-700 hover:text-primary-800">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/refund-policy"
              className="font-semibold text-primary-700 hover:text-primary-800"
            >
              Refund Policy
            </Link>
            . Embassy fees are usually non-refundable.
          </p>
        </Reveal>
      </Section>

      {/* FAQs */}
      <Section
        id="visa-faqs"
        spacing="md"
        containerSize="narrow"
        className="border-t border-neutral-200 bg-white"
      >
        <Reveal>
          <SectionHeading
            align="center"
            title="Visa FAQs"
            subtitle="Quick answers before you talk to an expert."
          />
        </Reveal>
        <Reveal className="mt-5" delayMs={80}>
          <FaqList items={[...VISA_FAQS]} />
        </Reveal>
      </Section>

      {/* Final CTA */}
      <Section spacing="lg" containerSize="narrow" className="bg-ink text-white">
        <Reveal>
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-h1">
              Ready to get visa help?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
              Tell us your destination — a Tripime expert will share the checklist and next
              steps on WhatsApp or call.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <a
                href={whatsappLink("Hi Tripime, I need help with a visa.")}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="accent" size="lg">
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp Tripime
                </Button>
              </a>
              <a href={telLink()}>
                <Button variant="secondary" size="lg">
                  <Phone className="size-4" aria-hidden />
                  Call expert
                </Button>
              </a>
              <a href="#visa-enquiry">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white/90 hover:bg-white/10"
                >
                  Get visa help
                </Button>
              </a>
            </div>
          </div>
        </Reveal>
      </Section>

      <VisaStickyHelp />
      {/* Spacer so sticky bar doesn't cover final content on mobile */}
      <div className="h-16 md:hidden" aria-hidden />
    </>
  );
}
