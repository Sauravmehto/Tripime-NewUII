import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Container } from "@/components/layout/container";
import { PageTransition } from "@/components/motion/page-transition";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import {
  HELPLINE_DISPLAY,
  SUPPORT_EMAIL,
  mailLink,
  telLink,
  whatsappLink,
} from "@/lib/contact";
import type { LegalDocContent } from "@/lib/legal/privacy-content";

export function LegalDocView({ content }: { content: LegalDocContent }) {
  return (
    <PageTransition>
      <div className="border-b border-neutral-200/80 bg-canvas">
        <Container className="py-10 sm:py-14">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              {content.eyebrow}
            </p>
            <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {content.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-[0.9375rem]">
              {content.intro}
            </p>
            <p className="mt-4 text-xs font-medium text-ink-subtle">
              Last updated: {content.lastUpdated}
            </p>
          </Reveal>
        </Container>
      </div>

      <Container className="py-8 sm:py-12">
        {/* Mobile TOC */}
        <Reveal className="mb-8 lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            On this page
          </p>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {content.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="min-h-9 shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-ink-muted transition hover:border-primary-200 hover:text-ink"
              >
                {section.title}
              </a>
            ))}
          </div>
        </Reveal>

        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          {/* Desktop TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                On this page
              </p>
              <nav className="mt-3 space-y-1" aria-label="Privacy sections">
                {content.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-md px-2 py-1.5 text-sm text-ink-muted transition hover:bg-primary-50 hover:text-primary-800"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 max-w-3xl">
            {content.sections.map((section, i) => (
              <Reveal key={section.id} delayMs={Math.min(i * 30, 120)}>
                <section
                  id={section.id}
                  className="scroll-mt-24 border-b border-neutral-200/80 py-8 first:pt-0 last:border-b-0"
                >
                  <h2 className="text-xl font-bold tracking-tight text-ink">
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-muted">
                    {section.paragraphs.map((p, pi) => (
                      <p key={`${section.id}-p-${pi}`}>{p}</p>
                    ))}
                    {section.bullets && section.bullets.length > 0 ? (
                      <ul className="list-disc space-y-2 pl-5">
                        {section.bullets.map((item, bi) => (
                          <li key={`${section.id}-b-${bi}`}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              </Reveal>
            ))}

            <Reveal className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="text-base font-bold text-ink">Need help?</h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                Privacy questions or data requests — talk to Tripime directly.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={mailLink()}>
                  <Button variant="outline" size="sm">
                    <Mail className="size-3.5" aria-hidden />
                    {SUPPORT_EMAIL}
                  </Button>
                </a>
                <a href={telLink()}>
                  <Button variant="outline" size="sm">
                    <Phone className="size-3.5" aria-hidden />
                    {HELPLINE_DISPLAY}
                  </Button>
                </a>
                <a
                  href={whatsappLink("Hi Tripime, I have a privacy question.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="accent" size="sm">
                    <MessageCircle className="size-3.5" aria-hidden />
                    WhatsApp
                  </Button>
                </a>
              </div>
              <p className="mt-4 text-xs text-ink-subtle">
                Also see our{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-primary-700 hover:text-primary-800"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/refund-policy"
                  className="font-semibold text-primary-700 hover:text-primary-800"
                >
                  Refund policy
                </Link>
                .
              </p>
            </Reveal>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
}
