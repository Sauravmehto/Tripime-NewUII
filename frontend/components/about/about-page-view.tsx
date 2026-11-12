import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  BadgeCheck,
  ClipboardList,
  FileCheck2,
  Headset,
  Mail,
  MessageCircle,
  Palmtree,
  PhoneCall,
  ShieldCheck,
  Stamp,
  type LucideIcon,
} from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { HELPLINE_DISPLAY, SUPPORT_EMAIL, mailLink, telLink, whatsappLink } from "@/lib/contact";

// Every line on this page is taken from copy already used elsewhere on the site (booking sheet, CMS
// "Home About" text, contact page). Do not add figures, years or names unless they are real and confirmed.

const WHAT_WE_DO: { icon: LucideIcon; title: string; body: string; href: string; cta: string }[] = [
  {
    icon: Palmtree,
    title: "Holiday packages",
    body: "Curated domestic and international packages for couples, families and groups, with itineraries you can customise.",
    href: "/packages",
    cta: "Browse packages",
  },
  {
    icon: Stamp,
    title: "Visa assistance",
    body: "Share your destination and dates and our experts help you with your visa enquiry.",
    href: "/visa",
    cta: "Get visa help",
  },
  {
    icon: BedDouble,
    title: "Hotels and buses on request",
    body: "Stays and intercity coaches can be added to any holiday plan. Online booking is coming soon, so for now send us an enquiry and we arrange it with you.",
    href: "/contact",
    cta: "Send an enquiry",
  },
];

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ClipboardList,
    title: "Tell us your plan",
    body: "Send a booking request or enquiry with your dates and how many people are travelling. It is free.",
  },
  {
    icon: Headset,
    title: "An expert gets in touch",
    body: "A Tripime travel expert calls or WhatsApps you to check dates and availability.",
  },
  {
    icon: FileCheck2,
    title: "Approve your quote",
    body: "You get a final quote for your group. Nothing is charged before you approve it.",
  },
  {
    icon: BadgeCheck,
    title: "Booking confirmed",
    body: "Your booking is confirmed once you accept the quote and payment is received.",
  },
];

const VALUES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Nothing charged upfront",
    body: "Booking requests are free. You pay only after an expert confirms availability and the final price.",
  },
  {
    icon: Headset,
    title: "Real human support",
    body: "Call or WhatsApp a real travel expert, not a chatbot.",
  },
  {
    icon: BadgeCheck,
    title: "Honest about what is live",
    body: "We tell you what is bookable today and what is enquiry-only, instead of overpromising.",
  },
];

const CHANNELS: { icon: LucideIcon; title: string; body: string; href: string; external?: boolean }[] = [
  { icon: PhoneCall, title: "Call us", body: HELPLINE_DISPLAY, href: telLink() },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    body: "Chat with a travel expert",
    href: whatsappLink("Hi Tripime, I'd like to plan a trip."),
    external: true,
  },
  { icon: Mail, title: "Email", body: SUPPORT_EMAIL, href: mailLink() },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";

export function AboutPageView() {
  return (
    <div className="bg-canvas">
      {/* Hero */}
      <section
        aria-labelledby="about-title"
        className="relative isolate overflow-hidden bg-linear-to-br from-primary-900 via-primary-800 to-primary-700 text-white"
      >
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 size-96 rounded-full bg-white/5" />
        <Section as="div" spacing="xl" className="py-14 sm:py-20">
          <p className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-white/25">
            About Tripime
          </p>
          <h1 id="about-title" className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Travel planned by real people
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            Tripime is a travel platform designed to make holiday planning simple, transparent and affordable. Tell us
            where you want to go and a real travel expert takes it from there.
          </p>
          <p className="mt-3 text-sm font-semibold text-white/90">Tripime — Book Smart. Travel Better.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/packages"
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-primary-800 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800`}
            >
              Explore packages
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a
              href={whatsappLink("Hi Tripime, I'd like to plan a trip.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/40 px-6 text-base font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
            >
              <MessageCircle className="size-4" aria-hidden />
              Talk to an expert
            </a>
          </div>
        </Section>
      </section>

      {/* What we do */}
      <Section id="what-we-do">
        <Reveal>
          <SectionHeading
            eyebrow="What we do"
            title="Help with the trip, from first idea to final plan"
            subtitle="We focus on what we can do well today, and tell you plainly what is still on its way."
          />
        </Reveal>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {WHAT_WE_DO.map(({ icon: Icon, title, body, href, cta }, i) => (
            <li key={title}>
              <Reveal delayMs={i * 60} className="h-full">
                <article className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition duration-300 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-medium sm:p-6">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{body}</p>
                  <Link
                    href={href}
                    className={`mt-4 inline-flex min-h-11 items-center gap-1 self-start rounded-lg text-sm font-semibold text-primary-700 hover:text-primary-800 ${focusRing}`}
                  >
                    {cta}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      {/* How it works */}
      <div className="border-y border-neutral-200 bg-white">
        <Section id="how-it-works">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="Four simple steps, no surprises"
              subtitle="Your trip is not confirmed until you approve the quote. Here is what happens next."
            />
          </Reveal>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title}>
                <Reveal delayMs={i * 70} className="h-full">
                  <div className="relative h-full rounded-2xl bg-canvas p-5 ring-1 ring-neutral-200">
                    <span
                      aria-hidden
                      className="absolute -top-4 left-5 flex size-8 items-center justify-center rounded-full bg-primary-700 text-sm font-bold text-white shadow-soft"
                    >
                      {i + 1}
                    </span>
                    <Icon className="mt-2 size-6 text-primary-700" aria-hidden />
                    <h3 className="mt-3 text-base font-bold text-ink">
                      <span className="sr-only">Step {i + 1}: </span>
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {/* Why Tripime */}
      <Section id="why-tripime">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Why plan with Tripime"
            title="What you can count on"
          />
        </Reveal>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <Reveal delayMs={i * 60} className="h-full">
                <div className="h-full rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-xs sm:p-6">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-50 text-success-700">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      {/* Contact */}
      <section aria-labelledby="about-contact-title" className="pb-14 sm:pb-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="overflow-hidden rounded-3xl bg-linear-to-br from-primary-900 via-primary-800 to-primary-700 p-6 text-white shadow-soft sm:p-10">
              <h2 id="about-contact-title" className="text-2xl font-bold sm:text-3xl">
                Ready to plan your trip?
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
                Share your trip idea and a Tripime expert will get back to you on call or WhatsApp.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {CHANNELS.map(({ icon: Icon, title, body, href, external }) => (
                  <li key={title}>
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="flex min-h-14 items-center gap-3 rounded-xl bg-white/10 p-4 ring-1 ring-white/25 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{title}</span>
                        <span className="block truncate text-sm text-white/90">{body}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className={`mt-6 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-white underline underline-offset-4 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
              >
                Or send us a message
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
