"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { HERO_QUICK_PICKS } from "@/lib/packages/package-landing-data";
import { HOLIDAY_DESTINATIONS } from "@/lib/packages/holidays-data";

/** Destination search for holiday packages; results open on /packages?q=… */
export function HolidaySearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function go(term: string) {
    const q = term.trim();
    router.push(q ? `/packages?q=${encodeURIComponent(q)}#all-packages` : "/packages");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    go(query);
  }

  return (
    <div className={cn("rounded-2xl bg-white p-3 shadow-elevated", className)}>
      <form onSubmit={handleSubmit} role="search" aria-label="Search holiday packages" className="space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Where do you want to go?</span>
          <span className="relative block">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Goa, Kerala, Bali, Dubai…"
              list="home-holiday-destinations"
              autoComplete="off"
              enterKeyHint="search"
              className="min-h-12 pl-9"
            />
          </span>
          <datalist id="home-holiday-destinations">
            {HOLIDAY_DESTINATIONS.map((dest) => (
              <option key={dest} value={dest} />
            ))}
          </datalist>
        </label>
        <Button type="submit" size="xl" variant="accent" className="w-full">
          <Search className="size-4" aria-hidden />
          Find holidays
        </Button>
      </form>
      <div className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3">
        {HERO_QUICK_PICKS.map(({ label, icon: Icon, term }) => (
          <button
            key={label}
            type="button"
            onClick={() => go(term)}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 text-sm font-medium text-ink"
          >
            <Icon className="size-3.5 text-primary-600" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
