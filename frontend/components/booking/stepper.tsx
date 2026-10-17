"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBooking } from "@/context/booking-provider";

const STEPS = [
  { id: "passengers", label: "Passengers", href: "/booking/passengers" },
  { id: "review", label: "Review", href: "/booking/review" },
  { id: "seats", label: "Seats", href: "/booking/seats" },
  { id: "payment", label: "Payment", href: "/booking/payment" },
] as const;

export type BookingStepId = (typeof STEPS)[number]["id"];

interface StepperProps {
  current: BookingStepId;
  variant?: "pills" | "compact";
  className?: string;
}

/** Shared booking progress. Completed steps link back so details can be edited. */
export function Stepper({ current, variant = "pills", className }: StepperProps) {
  const { progress } = useBooking();
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  const reachable = [true, progress.passengersDone, progress.reviewed, progress.seatsDone];
  const complete = [progress.passengersDone, progress.reviewed, progress.seatsDone, false];

  if (variant === "compact") {
    const label = STEPS[currentIndex]?.label ?? "";
    return (
      <nav aria-label="Booking progress" className={className}>
        <p className="text-[11px] font-semibold text-ink-subtle">
          Step {currentIndex + 1} of {STEPS.length} · <span className="text-ink">{label}</span>
        </p>
        <div className="mt-1.5 flex gap-1">
          {STEPS.map((step, index) => (
            <span
              key={step.id}
              aria-hidden
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= currentIndex || complete[index] ? "bg-primary-600" : "bg-neutral-200",
              )}
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Booking progress" className={cn("overflow-x-auto", className)}>
      <ol className="flex min-w-max items-center gap-1">
        {STEPS.map((step, index) => {
          const active = index === currentIndex;
          const done = complete[index] && !active;
          const pill = (
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                active && "bg-primary-600 text-white",
                done && "bg-primary-50 text-primary-700 hover:bg-primary-100",
                !done && !active && "bg-neutral-100 text-ink-subtle",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[9px] font-bold",
                  active && "bg-white/20",
                  done && "bg-primary-600 text-white",
                  !done && !active && "bg-neutral-200",
                )}
              >
                {done ? <Check className="size-2.5" aria-hidden /> : index + 1}
              </span>
              {step.label}
              {done && <span className="sr-only"> (completed)</span>}
            </span>
          );
          return (
            <li key={step.id} className="flex items-center gap-1">
              {!active && reachable[index] ? (
                <Link href={step.href} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  {pill}
                </Link>
              ) : (
                pill
              )}
              {index < STEPS.length - 1 && <span className="h-px w-3 bg-neutral-200" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
