"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { telLink, whatsappLink } from "@/lib/contact";

export function FinalCta() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  }

  return (
    <Section spacing="xl" containerSize="narrow" className="bg-ink text-white">
      <Reveal>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-h1">
            Ready to plan your next trip?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
            Tell us where you want to go — a travel expert will help with flights, packages, and
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
            <Link href="/flights?origin=DEL&destination=BOM&date=2026-08-20&passengers=1">
              <Button
                variant="ghost"
                size="lg"
                className="text-white/90 hover:bg-white/10"
              >
                Search flights
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
          {subscribed ? (
            <p className="mt-4 text-center text-sm font-medium text-success-500">
              Thanks — we&apos;ll keep you posted!
            </p>
          ) : (
            <form
              onSubmit={handleSubscribe}
              className="mt-4 flex flex-col gap-2 sm:flex-row"
            >
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
          )}
        </div>
      </Reveal>
    </Section>
  );
}
