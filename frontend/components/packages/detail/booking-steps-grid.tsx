import { CheckCircle2, ClipboardList, Headset, type LucideIcon } from "lucide-react";
import { DetailSection } from "@/components/packages/detail/detail-section";

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ClipboardList,
    title: "Send a booking request",
    body: "Pick a month and tell us who's travelling. It takes a minute and costs nothing.",
  },
  {
    icon: Headset,
    title: "Get your final quote",
    body: "A travel expert checks availability and confirms hotels, dates and the final price with you.",
  },
  {
    icon: CheckCircle2,
    title: "Confirm and pay",
    body: "Your trip is booked once you approve the quote and your payment is received.",
  },
];

export function BookingStepsGrid() {
  return (
    <DetailSection
      id="package-steps-title"
      title="How booking works"
      description="Three simple steps. No payment until you approve the quote."
    >
      <ol className="grid gap-2.5 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li
            key={title}
            className="relative flex flex-col rounded-xl border border-neutral-200 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-soft motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="text-2xl font-extrabold tabular-nums leading-none text-primary-100" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Step {i + 1}</p>
            <h3 className="text-[13px] font-semibold leading-snug text-ink">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden
                className="absolute -right-2.5 top-1/2 hidden h-px w-2.5 bg-primary-200 md:block"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </DetailSection>
  );
}
