import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Atmosphere } from "@/components/home/section-atmosphere";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

const CATEGORIES = [
  {
    title: "Adventure Travel",
    description: "Treks, trails and high-energy itineraries for explorers.",
    image: "https://images.pexels.com/photos/30750205/pexels-photo-30750205.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages?theme=adventure",
  },
  {
    title: "Family Holidays",
    description: "Comfort-first routes with experiences for every age.",
    image: "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages?trip=family",
  },
  {
    title: "Honeymoon Packages",
    description: "Romantic stays and private experiences curated for couples.",
    image: "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages?trip=romantic",
  },
  {
    title: "Luxury Escapes",
    description: "Premium stays, bespoke itineraries and VIP support.",
    image: "https://images.pexels.com/photos/325193/pexels-photo-325193.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages?trip=luxury",
  },
  {
    title: "Cultural Experiences",
    description: "Local heritage, cuisines and city stories worth remembering.",
    image: "https://images.pexels.com/photos/789750/pexels-photo-789750.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    title: "Wildlife Tours",
    description: "Nature-led journeys around reserves and hidden habitats.",
    image: "https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    title: "Spiritual Journeys",
    description: "Sacred routes and mindful travel experiences.",
    image: "https://images.pexels.com/photos/8274726/pexels-photo-8274726.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    title: "International Holidays",
    description: "Borderless escapes across Asia, Europe and island destinations.",
    image: "https://images.pexels.com/photos/777059/pexels-photo-777059.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages?trip=international",
  },
] as const;

export function TravelCategories() {
  return (
    <Section className="relative isolate overflow-hidden">
      <Atmosphere variant="aurora" />
      <Reveal>
        <SectionHeading
          eyebrow="Travel categories"
          title="Choose your style of travel"
          subtitle="Discovery-first categories to quickly find the kind of trip you are planning."
        />
      </Reveal>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((item, index) => (
          <Reveal key={item.title} delayMs={index * 45}>
            <Link
              href={item.href}
              className="group relative block overflow-hidden rounded-2xl border border-neutral-200 shadow-soft transition hover:shadow-medium"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-ink/20 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h3 className="text-base font-bold">{item.title}</h3>
                <p className="mt-1 text-xs text-white/85">{item.description}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold">
                  Explore
                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
