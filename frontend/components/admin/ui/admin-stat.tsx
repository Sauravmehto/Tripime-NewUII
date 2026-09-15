import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function AdminStat({
  label,
  value,
  icon: Icon,
  href,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      {Icon ? (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-admin-muted text-admin-slate">
          <Icon className="size-3.5" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-admin-ink-subtle">
          {label}
        </p>
        <p className="text-[15px] font-semibold tabular-nums text-admin-ink">{value}</p>
      </div>
    </>
  );

  const className = cn(
    "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition",
    active
      ? "border-admin-accent/30 bg-admin-accent-soft"
      : "border-admin-border bg-admin-surface hover:border-admin-ink/15",
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
