import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AdminSection({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  padded = true,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-admin-border bg-admin-surface",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-admin-border bg-admin-muted px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <Icon className="size-3.5 shrink-0 text-admin-ink-subtle" aria-hidden />
          ) : null}
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-admin-ink">{title}</h2>
            {description ? (
              <p className="text-[11px] text-admin-ink-subtle">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      <div className={padded ? "p-3" : ""}>{children}</div>
    </section>
  );
}
