import { cn } from "@/lib/cn";

const STEPS = [
  { id: "passengers", label: "Passengers" },
  { id: "review", label: "Review" },
  { id: "seats", label: "Seats" },
  { id: "payment", label: "Payment" },
] as const;

export type BookingStepId = (typeof STEPS)[number]["id"];

interface StepperProps {
  current: BookingStepId;
  variant?: "pills" | "compact";
  className?: string;
}

export function Stepper({ current, variant = "pills", className }: StepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

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
                index <= currentIndex ? "bg-primary-600" : "bg-neutral-200",
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
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-1">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  active && "bg-primary-600 text-white",
                  done && !active && "bg-primary-50 text-primary-700",
                  !done && !active && "bg-neutral-100 text-ink-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-[9px] font-bold",
                    active && "bg-white/20",
                    done && !active && "bg-primary-200 text-primary-800",
                    !done && !active && "bg-neutral-200",
                  )}
                >
                  {index + 1}
                </span>
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <span className="h-px w-3 bg-neutral-200" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
