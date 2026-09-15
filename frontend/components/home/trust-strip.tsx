import { FileCheck2, IndianRupee, MessageCircle, ShieldCheck } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { TRUST_POINTS } from "@/lib/home/home-data";

const ICONS = [FileCheck2, IndianRupee, MessageCircle, ShieldCheck];

export function TrustStrip() {
  return (
    <Section spacing="sm" className="border-b border-neutral-200 bg-white">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto no-scrollbar sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible lg:grid-cols-4">
        {TRUST_POINTS.map(({ title, body }, i) => {
          const Icon = ICONS[i] ?? ShieldCheck;
          return (
            <Reveal
              key={title}
              delayMs={i * 60}
              className="w-[72vw] shrink-0 snap-start sm:w-auto sm:shrink"
            >
              <div className="flex h-full items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <Icon className="size-4" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{body}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
