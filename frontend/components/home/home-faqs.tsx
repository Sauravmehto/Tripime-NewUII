import Link from "next/link";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { FaqList } from "@/components/marketing/faq-list";
import { HOME_FAQS } from "@/lib/home/home-data";

export function HomeFaqs() {
  return (
    <Section containerSize="narrow">
      <Reveal>
        <SectionHeading
          align="center"
          title="Frequently asked questions"
          subtitle="Quick, honest answers — call us if you need more."
        />
      </Reveal>
      <Reveal className="mt-6" delayMs={80}>
        <FaqList items={[...HOME_FAQS]} />
      </Reveal>
      <Reveal className="mt-4" delayMs={120}>
        <p className="text-center text-sm text-ink-muted">
          Read the full details in our{" "}
          <Link href="/privacy" className="font-semibold text-primary-700 hover:text-primary-800">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/refund-policy"
            className="font-semibold text-primary-700 hover:text-primary-800"
          >
            Refund Policy
          </Link>
          .
        </p>
      </Reveal>
    </Section>
  );
}
