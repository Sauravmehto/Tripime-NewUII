import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        align === "center" && "mx-auto max-w-2xl text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-700">
          {eyebrow}
        </p>
      )}
      <h2 className={cn("text-xl font-bold text-ink sm:text-h2", eyebrow && "mt-1")}>
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-body leading-relaxed text-ink-muted">{subtitle}</p>
      )}
    </div>
  );
}
