import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { Card } from "@/components/ui/card";
import { WHY_CHOOSE_US } from "@/lib/home/home-data";

export function WhyTripime() {
  return (
    <Section>
      <Reveal>
        <SectionHeading
          align="center"
          title="Why travel with Tripime"
          subtitle="We're new — here's exactly what that means for you."
        />
      </Reveal>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WHY_CHOOSE_US.map((item, i) => (
          <Reveal key={item.title} delayMs={i * 60}>
            <Card className="h-full transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-medium">
              <p className="font-semibold text-ink">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
