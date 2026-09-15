"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Hotel,
  Plane,
  UtensilsCrossed,
  Car,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";

function dayIcon(text: string): LucideIcon {
  const t = text.toLowerCase();
  if (t.includes("arrive") || t.includes("airport") || t.includes("depart") || t.includes("flight")) {
    return Plane;
  }
  if (
    t.includes("hotel") ||
    t.includes("check in") ||
    t.includes("check into") ||
    t.includes("resort") ||
    t.includes("villa")
  ) {
    return Hotel;
  }
  if (t.includes("dinner") || t.includes("lunch") || t.includes("breakfast") || t.includes("meal")) {
    return UtensilsCrossed;
  }
  if (t.includes("transfer") || t.includes("cruise") || t.includes("catamaran") || t.includes("drive")) {
    return Car;
  }
  return MapPin;
}

export function AdminItineraryEditor({
  days,
  onChange,
}: {
  days: string[];
  onChange: (days: string[]) => void;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const allOpen = useMemo(
    () => days.length > 0 && days.every((_, i) => open[i] !== false),
    [days, open],
  );

  function setDay(index: number, value: string) {
    onChange(days.map((day, i) => (i === index ? value : day)));
  }

  function addDay() {
    onChange([...days, ""]);
    setOpen((prev) => ({ ...prev, [days.length]: true }));
  }

  function removeDay(index: number) {
    onChange(days.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= days.length) return;
    const copy = [...days];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    onChange(copy);
  }

  function toggleAll() {
    const nextOpen = !allOpen;
    const map: Record<number, boolean> = {};
    days.forEach((_, i) => {
      map[i] = nextOpen;
    });
    setOpen(map);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-admin-ink-subtle">
          Day-by-day itinerary
        </p>
        <div className="flex gap-1">
          {days.length > 0 ? (
            <Button type="button" variant="ghost" size="xs" onClick={toggleAll} className="text-admin-ink-muted">
              {allOpen ? "Collapse" : "Expand"} all
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="xs" onClick={addDay}>
            <Plus className="size-3" />
            Add day
          </Button>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="rounded-md border border-dashed border-admin-border px-3 py-4 text-center text-[12px] text-admin-ink-subtle">
          No days yet. Add Day 1 to start the timeline.
        </p>
      ) : (
        <ol className="relative space-y-1.5 border-l border-admin-border pl-3">
          {days.map((day, index) => {
            const Icon = dayIcon(day);
            const expanded = open[index] !== false;
            return (
              <li key={index} className="relative">
                <span className="absolute -left-[22px] top-2 flex size-4 items-center justify-center rounded-full bg-admin-muted text-admin-slate">
                  <Icon className="size-2.5" aria-hidden />
                </span>
                <div className="rounded-md border border-admin-border bg-admin-canvas">
                  <div className="flex items-center gap-1 px-2 py-1">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => setOpen((prev) => ({ ...prev, [index]: !expanded }))}
                    >
                      <span className="text-[11px] font-semibold text-admin-accent">
                        Day {index + 1}
                      </span>
                      {!expanded ? (
                        <span className="truncate text-[12px] text-admin-ink-muted">
                          {day || "Empty day"}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="size-6 rounded text-admin-ink-subtle hover:bg-admin-muted disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label="Move day up"
                    >
                      <ChevronUp className="mx-auto size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="size-6 rounded text-admin-ink-subtle hover:bg-admin-muted disabled:opacity-30"
                      disabled={index === days.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label="Move day down"
                    >
                      <ChevronDown className="mx-auto size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="size-6 rounded text-danger-700 hover:bg-danger-50"
                      onClick={() => removeDay(index)}
                      aria-label={`Remove day ${index + 1}`}
                    >
                      <Trash2 className="mx-auto size-3.5" />
                    </button>
                  </div>
                  {expanded ? (
                    <div className="border-t border-admin-border p-2">
                      <Textarea
                        rows={2}
                        value={day}
                        placeholder="Describe this day's activities, stays, or transfers"
                        onChange={(e) => setDay(index, e.target.value)}
                        className={cn("min-h-[64px] text-[13px]")}
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
