import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { EnquiryStatus } from "@/types";

const ENQUIRY_TONES: Record<EnquiryStatus, string> = {
  NEW: "bg-amber-50 text-amber-800",
  CONTACTED: "bg-admin-slate-soft text-admin-slate",
  CLOSED: "bg-success-50 text-success-700",
};

export function AdminStatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent" | EnquiryStatus;
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-admin-muted text-admin-ink-muted",
    success: "bg-success-50 text-success-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-danger-50 text-danger-700",
    accent: "bg-admin-accent-soft text-admin-accent",
    ...ENQUIRY_TONES,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
        tones[tone] ?? tones.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}
