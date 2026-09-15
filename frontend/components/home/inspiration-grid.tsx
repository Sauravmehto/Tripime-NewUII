import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";
import { INSPIRATION_STORIES } from "@/lib/home/home-data";

export function InspirationGrid() {
  return (
    <Section className="border-t border-neutral-200 bg-white">
      <Reveal>
        <SectionHeading
          eyebrow="Travel inspiration"
          title="Stories to spark your next trip"
          subtitle="Editorial picks — static content today, CMS-ready tomorrow."
        />
      </Reveal>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {INSPIRATION_STORIES.map((story, i) => (
          <Reveal key={story.id} delayMs={i * 70}>
            <Link
              href={story.href}
              className="group relative block overflow-hidden rounded-xl border border-neutral-200 shadow-xs transition hover:shadow-medium"
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src={story.image}
                  alt={story.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="text-sm font-bold">{story.title}</p>
                  <p className="mt-1 text-xs text-white/80">{story.subtitle}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold">
                    Read more
                    <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
