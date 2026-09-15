"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  Plane,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const DESTINATIONS = [
  { code: "BOM", label: "Mumbai (BOM)" },
  { code: "BLR", label: "Bengaluru (BLR)" },
];

interface SearchFormProps {
  compact?: boolean;
  className?: string;
}

/** Floating-label bordered field — OTA-style compact control */
function FloatField({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <span className="absolute -top-2 left-2.5 z-10 bg-white px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-600">
        {label}
      </span>
      <div className="flex min-h-[42px] items-center gap-2 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/15">
        {icon && (
          <span className="shrink-0 text-ink-subtle" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

const controlClass =
  "h-8 w-full min-w-0 border-0 bg-transparent px-0 text-[13px] font-medium text-ink shadow-none outline-none ring-0 focus:border-transparent focus:ring-0";

export function SearchForm({ compact = false, className }: SearchFormProps) {
  const router = useRouter();
  const [origin] = useState("DEL");
  const [destination, setDestination] = useState("BOM");
  const [date, setDate] = useState("2026-08-20");
  const [passengers, setPassengers] = useState("1");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      origin,
      destination,
      date,
      passengers,
    });
    router.push(`/flights?${params.toString()}`);
  }

  if (compact) {
    return (
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex flex-wrap items-end gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-soft",
          className,
        )}
      >
        <Input value="Delhi" readOnly className="h-9 max-w-[100px] text-sm" />
        <Select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="h-9 min-w-[120px] text-sm"
        >
          {DESTINATIONS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.label}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm" variant="accent">
          <Search className="size-3.5" aria-hidden />
          Search
        </Button>
      </form>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-neutral-200 bg-white p-3.5 shadow-medium sm:p-4",
        className,
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">
            <span className="size-1.5 rounded-full bg-primary-600" aria-hidden />
            One Way
          </span>
          <span className="text-[11px] text-ink-subtle">Domestic from Delhi</span>
        </div>

        {/* From | To — full width of left column */}
        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <FloatField
            label="From"
            icon={<Plane className="size-3.5 rotate-[-45deg]" />}
          >
            <Input
              value="Delhi (DEL)"
              readOnly
              aria-readonly
              className={controlClass}
            />
          </FloatField>

          <span
            className="absolute left-1/2 top-1/2 z-20 hidden size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary-200 bg-primary-600 text-white shadow-soft sm:flex"
            aria-hidden
          >
            <ArrowLeftRight className="size-3.5" />
          </span>

          <FloatField
            label="To"
            icon={<Plane className="size-3.5 rotate-45" />}
          >
            <Select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={cn(controlClass, "cursor-pointer appearance-auto pr-5")}
            >
              {DESTINATIONS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.label}
                </option>
              ))}
            </Select>
          </FloatField>
        </div>

        {/* Date | Travellers + Search */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 sm:items-end">
          <FloatField
            label="Depart date"
            icon={<CalendarDays className="size-3.5" />}
          >
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(controlClass, "cursor-pointer")}
            />
          </FloatField>

          <div className="flex items-end gap-2">
            <FloatField
              label="Travellers"
              icon={<Users className="size-3.5" />}
              className="min-w-0 flex-1"
            >
              <Select
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                className={cn(controlClass, "cursor-pointer appearance-auto pr-5")}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {n === 1 ? "Traveller" : "Travellers"}
                  </option>
                ))}
              </Select>
            </FloatField>

            <Button
              type="submit"
              variant="accent"
              size="md"
              className="h-[42px] shrink-0 gap-1.5 rounded-lg px-4 text-xs font-bold shadow-soft"
            >
              <Search className="size-3.5" aria-hidden />
              Search
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
