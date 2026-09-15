"use client";

import Image from "next/image";
import { FileCheck2, FileText, Globe2, ShieldCheck, Zap } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/home/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { FaqList } from "@/components/marketing/faq-list";
import { Card } from "@/components/ui/card";
import { LeadEnquiryForm } from "@/components/enquiries/lead-enquiry-form";

const FEATURES = [
  {
    icon: Zap,
    title: "Fast Processing",
    body: "Streamlined applications with expert review to avoid delays.",
  },
  {
    icon: FileText,
    title: "Document Guidance",
    body: "Clear checklists so you submit the right documents the first time.",
  },
  {
    icon: FileCheck2,
    title: "Transparent Pricing",
    body: "No hidden fees — know the service and embassy costs upfront.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Handling",
    body: "Your personal documents are handled with strict confidentiality.",
  },
  {
    icon: Globe2,
    title: "24/7 Support",
    body: "Visa experts available to answer questions at every step.",
  },
] as const;

const DESTINATIONS = [
  { country: "United States", type: "Tourist / Business" },
  { country: "United Kingdom", type: "Tourist" },
  { country: "Schengen (Europe)", type: "Tourist" },
  { country: "Thailand", type: "Tourist" },
  { country: "Singapore", type: "Tourist / Transit" },
  { country: "UAE", type: "Tourist / Business" },
] as const;

const STEPS = [
  {
    number: "01",
    title: "Choose Destination",
    body: "Select your travel country and visa type from our popular destinations.",
  },
  {
    number: "02",
    title: "Submit Documents",
    body: "Upload required documents online — our team verifies everything for you.",
  },
  {
    number: "03",
    title: "Application Processing",
    body: "We submit your application and track status with the embassy or consulate.",
  },
  {
    number: "04",
    title: "Receive Your Visa",
    body: "Get your approved visa delivered or ready for collection — then fly!",
  },
] as const;

const FAQS = [
  {
    question: "How long does visa processing take?",
    answer:
      "Processing times vary by country and visa type — typically 3 to 30 business days. Each destination card shows an estimated timeline.",
  },
  {
    question: "What documents do I need?",
    answer:
      "Requirements vary by destination and visa type; our team provides a checklist once you choose a destination.",
  },
  {
    question: "Is the visa fee refundable if my application is rejected?",
    answer: "Embassy fees are generally non-refundable; service fees follow our refund policy.",
  },
  {
    question: "Can Tripime guarantee visa approval?",
    answer:
      "No agency can guarantee approval — final decisions rest with the embassy or consulate.",
  },
];

const HERO_IMAGE =
  "https://images.pexels.com/photos/2402926/pexels-photo-2402926.jpeg?auto=compress&cs=tinysrgb&w=1200";

export function VisaPageView() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-neutral-200">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-br from-primary-900/95 via-primary-900/80 to-primary-800/55" />
        <Container className="relative py-14 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
            Visa assistance
          </p>
          <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Visas made <span className="text-accent">simple</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
            Tourist, business and transit visas — expert assistance from application to approval.
          </p>
          <div className="mt-8 max-w-md rounded-2xl bg-white/95 p-5 shadow-elevated ring-1 ring-neutral-900/5 backdrop-blur-sm sm:p-6">
            <LeadEnquiryForm
              source="service"
              serviceType="visa"
              title="Visa enquiry"
              submitLabel="Start visa application"
            />
          </div>
        </Container>
      </section>

      <section className="py-10 sm:py-14">
        <Container>
          <Reveal>
            <SectionHeading
              title="Why apply with Tripime?"
              subtitle="Hassle-free visa assistance for your next international trip."
            />
          </Reveal>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delayMs={i * 50}>
                <Card className="h-full">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-bold text-ink">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-neutral-200 bg-white py-10 sm:py-14">
        <Container>
          <Reveal>
            <SectionHeading title="Popular destinations" />
          </Reveal>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DESTINATIONS.map((d, i) => (
              <Reveal key={d.country} delayMs={i * 40}>
                <Card className="group h-full overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-medium">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary-600 to-primary-800 text-sm font-bold text-white">
                      {d.country.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{d.country}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">{d.type}</p>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-10 sm:py-14">
        <Container>
          <Reveal>
            <SectionHeading title="How it works" subtitle="Get your visa in 4 simple steps." />
          </Reveal>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.number} delayMs={i * 50}>
                <Card>
                  <p className="text-sm font-bold text-primary-600">{s.number}</p>
                  <h3 className="mt-2 font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-muted">{s.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-neutral-200 bg-white py-10 sm:py-14">
        <Container narrow>
          <Reveal>
            <SectionHeading
              align="center"
              title="Visa FAQs"
              subtitle="Quick answers before you talk to an expert."
            />
          </Reveal>
          <Reveal className="mt-6" delayMs={80}>
            <FaqList items={[...FAQS]} />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
