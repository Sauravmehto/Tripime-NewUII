"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className={className}>
      <form onSubmit={handleSubmit} role="search" aria-label="Search holiday packages" className="space-y-2 sm:flex sm:items-end sm:gap-2 sm:space-y-0">
        <label className="block sm:flex-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/80">Where do you want to go?</span>
          <span className="relative block">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-accent" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Goa, Kerala, Bali, Dubai…"
              list="home-holiday-destinations"
              autoComplete="off"
              enterKeyHint="search"
              className="min-h-11 rounded-xl border-white/40 pl-9 shadow-elevated placeholder:text-neutral-400 lg:h-11 lg:min-h-11 lg:text-sm"
            />
          </span>
          <datalist id="home-holiday-destinations">
            {HOLIDAY_DESTINATIONS.map((dest) => (
              <option key={dest} value={dest} />
            ))}
          </datalist>
        </label>
        <Button type="submit" size="lg" variant="accent" className="h-11 w-full shrink-0 rounded-xl text-sm sm:w-auto sm:px-5">
          <Search className="size-4" aria-hidden />
          Find holidays
        </Button>
      </form>
      <div className="no-scrollbar mt-2.5 flex items-center gap-1.5 overflow-x-auto">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/60">Popular</span>
        {HERO_QUICK_PICKS.map(({ label, icon: Icon, term }) => (
          <button
            key={label}
            type="button"
            onClick={() => go(term)}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <Icon className="size-3 text-accent" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
