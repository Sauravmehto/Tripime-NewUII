import Link from "next/link";
import { Clock } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { Badge } from "@/components/ui/card";
import { COMING_SOON_SERVICES } from "@/lib/home/home-data";

export function ComingSoonServices() {
  return (
    <Section>
      <Reveal>
        <SectionHeading
          eyebrow="Expanding soon"
          title="More ways to travel"
          subtitle="Hotels, buses, visa, and experiences — clearly labeled until backend support is live."
        />
      </Reveal>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COMING_SOON_SERVICES.map((service, i) => (
          <Reveal key={service.id} delayMs={i * 60}>
            <Link
              href={service.href}
              className="group block h-full rounded-xl border border-dashed border-neutral-300 bg-white p-4 transition hover:border-primary-300 hover:shadow-soft"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">{service.title}</h3>
                <Badge tone="neutral">{service.eta}</Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                {service.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-subtle">
                <Clock className="size-3" aria-hidden />
                Not bookable yet
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
