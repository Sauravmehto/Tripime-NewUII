import { FileCheck2, IndianRupee, MessageCircle, ShieldCheck } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { TRUST_POINTS } from "@/lib/home/home-data";

const ICONS = [FileCheck2, IndianRupee, MessageCircle, ShieldCheck];

export function TrustStrip() {
  return (
    <Section spacing="sm" className="border-b border-neutral-200/80 bg-white">
      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto no-scrollbar sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible lg:grid-cols-4">
        {TRUST_POINTS.map(({ title, body }, i) => {
          const Icon = ICONS[i] ?? ShieldCheck;
          return (
            <Reveal
              key={title}
              delayMs={i * 50}
              className="w-[68vw] shrink-0 snap-start sm:w-auto sm:shrink"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                  <Icon className="size-3.5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-ink">{title}</p>
                  <p className="mt-0.5 hidden text-xs leading-relaxed text-ink-muted sm:block">
                    {body}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
