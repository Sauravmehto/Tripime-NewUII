"use client";

import { Mail, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { formatDateTime, formatINR } from "@/lib/format";
import type { Booking, NotificationRecord } from "@/types";

type Tone = "success" | "warning" | "danger" | "neutral";

const PAYMENT_TONE: Record<Booking["paymentStatus"], Tone> = { paid: "success", pending: "warning", failed: "danger" };
const BOOKING_TONE: Record<Booking["bookingStatus"], Tone> = {
  confirmed: "success",
  pending: "warning",
  cancelled: "danger",
};
const NOTIFY_TONE: Record<NotificationRecord["status"], Tone> = {
  sent: "success",
  failed: "danger",
  not_configured: "neutral",
};
const NOTIFY_LABEL: Record<NotificationRecord["status"], string> = {
  sent: "Sent",
  failed: "Failed",
  not_configured: "Not configured",
};
const EVENT_LABEL: Record<string, string> = {
  booking_created: "Booking created",
  payment_paid: "Payment received",
  payment_failed: "Payment failed",
  booking_confirmed: "Booking confirmed",
  booking_cancelled: "Booking cancelled",
};

/** `labelled` adds "Payment:" — for places without a column header. */
export function PaymentStatusBadge({ booking, labelled }: { booking: Booking; labelled?: boolean }) {
  return (
    <Badge tone={PAYMENT_TONE[booking.paymentStatus]}>
      {labelled && "Payment: "}
      {booking.paymentStatus.toUpperCase()}
    </Badge>
  );
}

export function BookingStatusBadge({ booking, labelled }: { booking: Booking; labelled?: boolean }) {
  return (
    <Badge tone={BOOKING_TONE[booking.bookingStatus]}>
      {labelled && "Booking: "}
      {booking.bookingStatus.toUpperCase()}
    </Badge>
  );
}

/** Compact delivery summary for the table: "3 sent", "2 not configured", … */
export function NotificationSummary({ records }: { records: NotificationRecord[] }) {
  if (records.length === 0) return <span className="text-[11px] text-ink-subtle">—</span>;
  const counts = records.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  return (
    <div className="flex flex-wrap gap-1">
      {(["sent", "failed", "not_configured"] as const)
        .filter((status) => counts[status])
        .map((status) => (
          <Badge key={status} tone={NOTIFY_TONE[status]}>
            {counts[status]} {NOTIFY_LABEL[status].toLowerCase()}
          </Badge>
        ))}
    </div>
  );
}

export function PaymentAttempts({ booking }: { booking: Booking }) {
  if (booking.payments.length === 0) {
    return <p className="text-xs text-ink-muted">No payment attempts yet.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {booking.payments.map((p) => (
        <li key={p.paymentId} className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-ink">
              {p.method.toUpperCase()} · {formatINR(p.amount)}
              {p.testMode && <span className="ml-1.5 text-[10px] font-bold text-warning-500">TEST</span>}
            </span>
            <Badge tone={p.status === "SUCCESS" ? "success" : "danger"}>{p.status}</Badge>
          </div>
          <p className="mt-0.5 font-mono text-[10.5px] text-ink-subtle">
            {p.transactionId} · {formatDateTime(p.paidAt)}
            {p.payee ? ` · to ${p.payee}` : ""}
          </p>
          {p.failureReason && <p className="text-[11px] text-danger-700">{p.failureReason}</p>}
        </li>
      ))}
    </ul>
  );
}

export function StatusTimeline({ booking }: { booking: Booking }) {
  return (
    <ol className="relative space-y-2 border-l border-neutral-200 pl-3">
      {booking.statusHistory.map((change, i) => (
        <li key={i} className="text-xs">
          <span
            aria-hidden
            className={`absolute -left-[4.5px] mt-1 size-2 rounded-full ${
              change.field === "payment" ? "bg-primary-500" : "bg-accent"
            }`}
          />
          <p className="text-ink">
            <span className="font-semibold capitalize">{change.field}</span>{" "}
            {change.fromStatus ? `${change.fromStatus} → ` : ""}
            <strong>{change.toStatus}</strong>
            <span className="text-ink-subtle"> · {change.actor}</span>
          </p>
          <p className="text-[11px] text-ink-subtle">
            {formatDateTime(change.at)}
            {change.note ? ` — ${change.note}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function NotificationLog({ records }: { records: NotificationRecord[] }) {
  if (records.length === 0) {
    return <p className="text-xs text-ink-muted">No notifications recorded yet.</p>;
  }
  const sorted = [...records].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <ul className="space-y-1.5">
      {sorted.map((record) => {
        const Icon = record.channel === "email" ? Mail : MessageCircle;
        return (
          <li key={record.key} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-ink">
                <Icon className="size-3.5 shrink-0 text-ink-subtle" aria-label={record.channel} />
                <span className="truncate">
                  <strong>{EVENT_LABEL[record.event] ?? record.event}</strong> → {record.recipient}
                  <span className="text-ink-subtle"> ({record.audience})</span>
                </span>
              </span>
              <Badge tone={NOTIFY_TONE[record.status]}>{NOTIFY_LABEL[record.status]}</Badge>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-subtle">
              {formatDateTime(record.at)} · {record.provider} · {record.detail}
            </p>
            {record.preview && (
              <details className="mt-1">
                <summary className="cursor-pointer text-[11px] font-semibold text-primary-700">
                  {record.status === "sent" ? "Message" : "Preview (not delivered)"}
                </summary>
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 text-[10.5px] text-ink-muted">
                  {record.preview}
                </pre>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
