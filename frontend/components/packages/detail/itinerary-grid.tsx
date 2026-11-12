"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { DetailSection } from "@/components/packages/detail/detail-section";
import { cn } from "@/lib/cn";
import { splitItineraryDay } from "@/lib/packages/package-display";
import { PACKAGE_ICONS, iconKeyForText } from "@/lib/packages/package-icons";

/**
 * Lines are normally written "Headline — detail". For long lines with no dash, the first comma-separated
 * part becomes the headline and the rest the detail. Only the original words are used.
 */
function splitDay(text: string): { title: string; detail: string } {
  const parts = splitItineraryDay(text);
  if (parts.detail || parts.title.length < 40) return parts;
  const comma = parts.title.indexOf(",");
  if (comma < 8) return parts;
  const rest = parts.title.slice(comma + 1).trim();
  return { title: parts.title.slice(0, comma).trim(), detail: rest.charAt(0).toUpperCase() + rest.slice(1) };
}

function ItineraryDayCard({
  index,
  text,
  open,
  onToggle,
}: {
  index: number;
  text: string;
  open: boolean;
  onToggle: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { title, detail } = splitDay(text);
  const Icon = PACKAGE_ICONS[iconKeyForText(text)];
  const panelId = `itinerary-day-${index}`;
  const expandable = detail.length > 0;

  const header = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700">
          Day {String(index + 1).padStart(2, "0")}
        </span>
        <Icon className="size-4 shrink-0 text-accent" aria-hidden />
      </span>
      <span className="mt-1.5 block text-[13px] font-semibold leading-snug text-ink">{title}</span>
      {expandable ? (
        <span className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-primary-700">
          {open ? "Hide details" : "View details"}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        </span>
      ) : null}
    </>
  );

  return (
    <li
      className={cn(
        "rounded-xl border bg-white transition-colors",
        open ? "border-primary-300 bg-primary-50/30 shadow-xs" : "border-neutral-200",
      )}
    >
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="block w-full rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {header}
        </button>
      ) : (
        <div className="p-3">{header}</div>
      )}
      <AnimatePresence initial={false}>
        {expandable && open && (
          <motion.div
            id={panelId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-3 text-xs leading-relaxed text-ink-muted">{detail}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function ItineraryGrid({ days }: { days: string[] }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const expandable = days.map((day) => splitDay(day).detail.length > 0);
  const expandableCount = expandable.filter(Boolean).length;
  const allOpen = expandableCount > 0 && days.every((_, i) => !expandable[i] || open.has(i));

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  if (days.length === 0) return null;

  return (
    <DetailSection
      id="package-itinerary-title"
      title="Day-by-day itinerary"
      description="Tap a day to see what is planned."
      action={
        expandableCount > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(allOpen ? new Set() : new Set(days.map((_, i) => i)))}
            className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        ) : null
      }
    >
      <ol className="grid items-start gap-2.5 sm:grid-cols-2">
        {days.map((day, i) => (
          <ItineraryDayCard key={i} index={i} text={day} open={open.has(i)} onToggle={() => toggle(i)} />
        ))}
      </ol>
    </DetailSection>
  );
}
