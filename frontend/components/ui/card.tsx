import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200/80 bg-white shadow-xs",
        padded && "p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type BadgeTone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-neutral-100 text-neutral-700",
    primary: "bg-primary-50 text-primary-700",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-500",
    danger: "bg-danger-50 text-danger-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-neutral-200/80", className)} />;
}
