import { Eye, MessageCircle, Sparkles } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { WHY_CHOOSE_US } from "@/lib/home/home-data";

const ICONS = [Sparkles, MessageCircle, Eye];

export function WhyTripime() {
  return (
    <Section>
      <Reveal>
        <SectionHeading
          align="center"
          title="Why plan with Tripime"
          subtitle="Real experts, honest pricing, and a platform that tells you what's live."
        />
      </Reveal>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {WHY_CHOOSE_US.map((item, i) => {
          const Icon = ICONS[i] ?? Sparkles;
          return (
            <Reveal key={item.title} delayMs={i * 60}>
              <div className="h-full">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
