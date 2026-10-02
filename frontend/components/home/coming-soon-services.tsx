import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { COMING_SOON_SERVICES } from "@/lib/home/home-data";

export function ComingSoonServices() {
  return (
    <Section spacing="sm" className="bg-primary-900 text-white">
      <Reveal>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              What&apos;s next
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
              Plan your next escape — more ways to travel coming soon
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Hotels, buses, visa, and experiences are on the roadmap. Flights and holiday packages
              are live today.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {COMING_SOON_SERVICES.map((service) => (
              <Link
                key={service.id}
                href={service.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 transition hover:text-white"
              >
                {service.title}
                <span className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                  {service.eta}
                </span>
                <ArrowRight className="size-3.5 text-white/50" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
