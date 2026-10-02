"use client";

import Link from "next/link";
import { Plane } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { Card } from "@/components/ui/card";
import { POPULAR_ROUTES } from "@/lib/home/home-data";
import { useBooking } from "@/context/booking-provider";

const SEARCH_DATE = "2026-08-10";

export function PopularRoutes({ compact = false }: { compact?: boolean }) {
  const { setSearch } = useBooking();

  function routeHref(fromCode: string, toCode: string) {
    return `/flights?origin=${fromCode}&destination=${toCode}&date=${SEARCH_DATE}&passengers=1`;
  }

  function onRouteClick(fromCode: string, toCode: string) {
    setSearch({
      origin: fromCode,
      destination: toCode,
      date: SEARCH_DATE,
      passengers: 1,
    });
  }

  if (compact) {
    return (
      <div>
        <p className="text-sm font-semibold text-ink">Popular flights from Delhi</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Illustrative fares — tap to search live prices.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {POPULAR_ROUTES.map((route) => (
            <Link
              key={route.toCode}
              href={routeHref(route.fromCode, route.toCode)}
              onClick={() => onRouteClick(route.fromCode, route.toCode)}
              className="group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 shadow-xs transition hover:border-primary-200 hover:shadow-soft"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {route.fromCode} → {route.toCode}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {route.from} to {route.to} · {route.duration}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-primary-700">
                {route.price}
                <span className="ml-1 text-[9px] font-medium uppercase tracking-wide text-ink-subtle">
                  illus.
                </span>
              </p>
              <Plane
                className="size-3.5 shrink-0 text-primary-400 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Section className="border-y border-neutral-200 bg-white">
      <Reveal>
        <SectionHeading
          title="Popular routes"
          subtitle="Illustrative starting fares — tap a route to search live prices for your dates."
        />
      </Reveal>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {POPULAR_ROUTES.map((route, i) => (
          <Reveal key={route.toCode} delayMs={i * 60}>
            <Link
              href={routeHref(route.fromCode, route.toCode)}
              onClick={() => onRouteClick(route.fromCode, route.toCode)}
              className="group block"
            >
              <Card className="h-full transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary-200 group-hover:shadow-medium">
                <div className="flex items-center gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{route.from}</p>
                    <p className="text-xs text-ink-subtle">{route.fromCode}</p>
                  </div>
                  <div className="flex flex-1 items-center gap-2 text-primary-400">
                    <span className="h-px flex-1 bg-neutral-200" />
                    <Plane className="size-4 shrink-0" aria-hidden />
                    <span className="h-px flex-1 bg-neutral-200" />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="truncate font-semibold text-ink">{route.to}</p>
                    <p className="text-xs text-ink-subtle">{route.toCode}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                    One way · {route.duration}
                  </span>
                  <span className="text-sm text-ink-muted">
                    from{" "}
                    <span className="text-base font-bold text-primary-700">{route.price}</span>
                    <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
                      illus.
                    </span>
                  </span>
                </div>
              </Card>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
