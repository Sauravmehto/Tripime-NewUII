import type { ReactNode } from "react";
import { ReceiptText, ShieldCheck } from "lucide-react";
import { formatINR } from "@/lib/format";

interface FareRow {
  label: string;
  amount: number;
  hint?: string;
}

interface FareSummaryCardProps {
  title?: string;
  rows: FareRow[];
  total: number;
  totalLabel?: string;
  note?: ReactNode;
  children?: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function FareSummaryCard({
  title = "Fare summary",
  rows,
  total,
  totalLabel = "Total fare",
  note,
  children,
  className = "",
  sticky = true,
}: FareSummaryCardProps) {
  return (
    <aside
      className={`h-fit overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs ${
        sticky ? "lg:sticky lg:top-20" : ""
      } ${className}`}
    >
      <header className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/70 px-4 py-2.5">
        <ReceiptText className="size-4 text-primary-600" aria-hidden />
        <h2 className="text-sm font-bold text-ink">{title}</h2>
      </header>

      <dl className="space-y-2.5 px-4 py-4 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3">
            <dt className="text-ink-muted">
              {row.label}
              {row.hint && <span className="block text-[11px] text-ink-subtle">{row.hint}</span>}
            </dt>
            <dd className="shrink-0 font-medium tabular-nums text-ink">{formatINR(row.amount)}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-3 border-y border-neutral-100 bg-primary-50/60 px-4 py-3">
        <p className="text-sm font-bold text-ink">{totalLabel}</p>
        <p className="text-lg font-bold text-primary-700">{formatINR(total)}</p>
      </div>

      <div className="space-y-3 px-4 py-4">
        {children}
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-subtle">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-success-700" aria-hidden />
          {note ?? "Prices include all taxes and fees. No hidden charges at checkout."}
        </p>
      </div>
    </aside>
  );
}
