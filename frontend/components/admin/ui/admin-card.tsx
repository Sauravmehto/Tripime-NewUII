import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AdminCard({
  children,
  className,
  padded = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; padded?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border border-admin-border bg-admin-surface",
        padded && "p-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
