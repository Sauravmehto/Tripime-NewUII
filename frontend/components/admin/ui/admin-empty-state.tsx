import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function AdminEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="flex size-8 items-center justify-center rounded-md bg-admin-muted text-admin-ink-subtle">
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="mt-2 text-[13px] font-semibold text-admin-ink">{title}</p>
      {description ? (
        <p className="mt-0.5 max-w-sm text-[12px] text-admin-ink-subtle">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
