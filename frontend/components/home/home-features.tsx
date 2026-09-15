import { Clock3, Sparkles, Zap } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { Card } from "@/components/ui/card";
import { HOME_FEATURES } from "@/lib/home/home-data";

const ICONS = [Zap, Sparkles, Clock3];

export function HomeFeatures() {
  return (
    <Section>
      <Reveal>
        <SectionHeading
          align="center"
          title="Reasons you'll love booking with us"
          subtitle="Unmatched value, seamless experience."
        />
      </Reveal>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HOME_FEATURES.map((feature, i) => {
          const Icon = ICONS[i] ?? Sparkles;
          return (
            <Reveal key={feature.id} delayMs={i * 70}>
              <Card className="h-full transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-medium">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <Icon className="size-5" aria-hidden />
                </div>
                <p className="mt-3 text-sm font-bold text-ink">{feature.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{feature.body}</p>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
