import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
  error?: string;
}

export function Field({ label, children, className, hint, error }: FieldProps) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-[11px] text-ink-subtle">{hint}</span>
      )}
      {error && (
        <span role="alert" className="mt-1 block text-[11px] font-medium text-danger-700">
          {error}
        </span>
      )}
    </label>
  );
}
