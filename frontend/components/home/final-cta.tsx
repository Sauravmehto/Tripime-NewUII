"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Atmosphere } from "@/components/home/section-atmosphere";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mailLink, telLink, whatsappLink } from "@/lib/contact";

export function FinalCta() {
  const [email, setEmail] = useState("");

  function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    window.open(
      `${mailLink()}?subject=${encodeURIComponent("Newsletter subscription")}&body=${encodeURIComponent(
      `Please subscribe this email to Tripime updates: ${email.trim()}`,
    )}`,
      "_self",
    );
    setEmail("");
  }

  return (
    <Section spacing="xl" containerSize="narrow" className="relative isolate overflow-hidden bg-ink text-white">
      <Atmosphere variant="dark" />
      <Reveal>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-h1">
            Ready to plan your next trip?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
            Tell us where you want to go — a travel expert will help with packages and
            itineraries over call or WhatsApp.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <a
              href={whatsappLink("Hi Tripime, I want to plan a trip.")}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="accent" size="lg">
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp Tripime
              </Button>
            </a>
            <a href={telLink()}>
              <Button variant="secondary" size="lg">
                <Phone className="size-4" aria-hidden />
                Call expert
              </Button>
            </a>
            <Link href="/packages">
              <Button
                variant="ghost"
                size="lg"
                className="text-white/90 hover:bg-white/10"
              >
                Explore packages
              </Button>
            </Link>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-10" delayMs={100}>
        <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-center text-sm font-semibold">Get fare drops & route news</p>
          <p className="mt-1 text-center text-xs text-white/60">
            Newsletter signup — we&apos;ll never spam you.
          </p>
          <form onSubmit={handleSubscribe} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              required
              aria-label="Email address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border-transparent bg-white text-ink"
            />
            <Button type="submit" variant="secondary" className="sm:w-auto">
              Subscribe
            </Button>
          </form>
        </div>
      </Reveal>
    </Section>
  );
}
