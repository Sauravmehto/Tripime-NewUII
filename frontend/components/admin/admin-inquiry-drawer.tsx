"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  UserCheck,
  X,
} from "lucide-react";
import {
  addAdminInquiryNote,
  getAdminInquiry,
  updateAdminInquiry,
  type AdminInquiry,
  type InquiryChanges,
  type InquiryDetail,
  type InquiryPriority,
  type InquiryStatus,
} from "@/lib/api/admin-inquiries";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatINR } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import {
  ACTION_LABEL,
  PRIORITY_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  followUpMessage,
  phoneLinks,
} from "./inquiry-labels";
import { AdminErrorState, AdminLoading, AdminStatusBadge } from "./ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-admin-border px-4 py-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-admin-ink-subtle">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-0.5 text-[13px]">
      <dt className="text-admin-ink-subtle">{label}</dt>
      <dd className="min-w-0 break-words text-admin-ink">{children}</dd>
    </div>
  );
}

const actionButton =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-admin-border bg-admin-surface px-2.5 text-[12px] font-medium text-admin-ink transition hover:bg-admin-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent";

export function AdminInquiryDrawer({
  inquiryId,
  team,
  onClose,
  onChanged,
}: {
  inquiryId: string;
  team: string[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const handleAuthError = useAdminAuthError();
  const panel = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [bookingRef, setBookingRef] = useState("");

  const load = useCallback(async () => {
    try {
      const next = await getAdminInquiry(inquiryId);
      setDetail(next);
      setFollowUp(next.inquiry.follow_up_date ?? "");
      setBookingRef(next.inquiry.converted_booking_id ?? "");
      setLoadError("");
    } catch (err) {
      if (handleAuthError(err)) return;
      setLoadError(getErrorMessage(err));
    }
  }, [inquiryId, handleAuthError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the selected inquiry when the drawer opens
    void load();
  }, [load]);

  // Escape closes, Tab stays inside the drawer, the page behind does not scroll.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function save(label: string, changes: InquiryChanges) {
    setSaving(label);
    setMessage(null);
    try {
      await updateAdminInquiry(inquiryId, changes);
      await load();
      onChanged();
      setMessage({ kind: "ok", text: `${label} saved.` });
    } catch (err) {
      if (handleAuthError(err)) return;
      setMessage({ kind: "error", text: getErrorMessage(err) });
    } finally {
      setSaving(null);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setSaving("Note");
    setMessage(null);
    try {
      await addAdminInquiryNote(inquiryId, note.trim());
      setNote("");
      await load();
      onChanged();
      setMessage({ kind: "ok", text: "Note added." });
    } catch (err) {
      if (handleAuthError(err)) return;
      setMessage({ kind: "error", text: getErrorMessage(err) });
    } finally {
      setSaving(null);
    }
  }

  const inquiry: AdminInquiry | undefined = detail?.inquiry;
  const links = inquiry ? phoneLinks(inquiry.customer_phone, followUpMessage(inquiry.customer_name, inquiry.package_name)) : null;
  const assignees = inquiry && inquiry.assigned_to && !team.includes(inquiry.assigned_to) ? [inquiry.assigned_to, ...team] : team;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-drawer-title"
        tabIndex={-1}
        className="relative flex h-full w-full flex-col bg-admin-surface shadow-2xl outline-none sm:w-[540px]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-admin-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="inquiry-drawer-title" className="truncate text-[15px] font-semibold text-admin-ink">
              {inquiry ? inquiry.customer_name || inquiry.customer_email || "Inquiry" : "Inquiry"}
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-admin-ink-subtle">{inquiryId}</p>
            {inquiry ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <AdminStatusBadge tone={STATUS_TONE[inquiry.inquiry_status]}>{STATUS_LABEL[inquiry.inquiry_status]}</AdminStatusBadge>
                <AdminStatusBadge>{SOURCE_LABEL[inquiry.inquiry_source]}</AdminStatusBadge>
                <AdminStatusBadge tone={inquiry.is_registered ? "accent" : "neutral"}>{inquiry.is_registered ? "Registered user" : "Guest"}</AdminStatusBadge>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close inquiry" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-admin-border text-admin-ink-muted hover:bg-admin-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent">
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadError ? (
            <div className="p-4">
              <AdminErrorState message={loadError} action={<Button variant="outline" size="sm" onClick={() => void load()}>Try again</Button>} />
            </div>
          ) : !inquiry ? (
            <div className="p-4"><AdminLoading rows={5} /></div>
          ) : (
            <>
              {message ? (
                <p role={message.kind === "error" ? "alert" : "status"} className={`mx-4 mt-3 rounded-md px-3 py-2 text-[12px] ${message.kind === "error" ? "bg-danger-50 text-danger-700" : "bg-success-50 text-success-700"}`}>
                  {message.text}
                </p>
              ) : null}

              <Section title="Contact the customer">
                <div className="flex flex-wrap gap-2">
                  {links ? (
                    <>
                      <a href={links.tel} className={actionButton}><Phone className="size-3.5" aria-hidden />Call customer</a>
                      <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={actionButton}><MessageCircle className="size-3.5" aria-hidden />Open WhatsApp chat</a>
                    </>
                  ) : null}
                  {inquiry.customer_email ? (
                    <a href={`mailto:${inquiry.customer_email}?subject=${encodeURIComponent(`Your Tripime inquiry${inquiry.package_name ? ` about ${inquiry.package_name}` : ""}`)}`} className={actionButton}>
                      <Mail className="size-3.5" aria-hidden />Send email
                    </a>
                  ) : null}
                </div>
                {!links ? (
                  <p className="mt-2 text-[12px] text-admin-ink-subtle">
                    No phone number was provided for this customer, so calling and WhatsApp chat are not available. Use email, or ask for a number.
                  </p>
                ) : null}
              </Section>

              <Section title="Customer">
                <dl>
                  <Row label="Name">{inquiry.customer_name || <span className="text-admin-ink-subtle">Not provided</span>}</Row>
                  <Row label="Email">{inquiry.customer_email || <span className="text-admin-ink-subtle">Not provided</span>}</Row>
                  <Row label="Phone">{inquiry.customer_phone || <span className="text-admin-ink-subtle">Not provided</span>}</Row>
                  <Row label="Account">{inquiry.is_registered ? "Registered user" : "Guest (no account)"}</Row>
                </dl>
              </Section>

              <Section title="Package">
                {inquiry.package_name ? (
                  <dl>
                    <Row label="Package">{inquiry.package_name}</Row>
                    <Row label="Package ID"><span className="font-mono text-[12px]">{inquiry.package_id}</span></Row>
                    <Row label="Destination">{inquiry.destination || "—"}</Row>
                    <Row label="Starting price">{inquiry.package_price != null ? formatINR(inquiry.package_price) : "—"}</Row>
                    <Row label="Package page">
                      {inquiry.package_url ? (
                        <a href={inquiry.package_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-admin-accent hover:underline">
                          {inquiry.package_url}<ArrowUpRight className="size-3.5" aria-hidden />
                        </a>
                      ) : "—"}
                    </Row>
                  </dl>
                ) : (
                  <p className="text-[13px] text-admin-ink-subtle">This inquiry is not about a specific package.</p>
                )}
              </Section>

              <Section title="Inquiry">
                <dl>
                  <Row label="Source">{SOURCE_LABEL[inquiry.inquiry_source]}</Row>
                  <Row label="Type"><span className="capitalize">{inquiry.inquiry_type.replace(/_/g, " ")}</span></Row>
                  <Row label="Received">{formatDateTime(inquiry.created_at)}</Row>
                  {inquiry.whatsapp_clicked_at ? (
                    <Row label="WhatsApp opened">
                      {formatDateTime(inquiry.whatsapp_clicked_at)}
                      <span className="block text-[11px] text-admin-ink-subtle">The customer opened WhatsApp. This does not confirm a message was sent.</span>
                    </Row>
                  ) : null}
                </dl>
                <p className="mb-1 mt-2 text-[11px] font-medium text-admin-ink-subtle">Message</p>
                <p className="whitespace-pre-wrap rounded-md bg-admin-muted px-3 py-2 text-[13px] text-admin-ink">
                  {inquiry.inquiry_message || "No message."}
                </p>
                {detail && detail.whatsapp_messages.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1 text-[11px] font-medium text-admin-ink-subtle">WhatsApp messages received from this customer</p>
                    <ul className="space-y-1.5">
                      {detail.whatsapp_messages.map((m) => (
                        <li key={m.message_id} className="rounded-md border border-admin-border px-3 py-2 text-[13px]">
                          <p className="whitespace-pre-wrap text-admin-ink">{m.body}</p>
                          <p className="mt-0.5 text-[11px] text-admin-ink-subtle">+{m.sender_phone} · {formatDateTime(m.message_timestamp)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Section>

              <Section title="Manage">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[11px] font-medium text-admin-ink-subtle">
                    Status
                    <Select
                      value={inquiry.inquiry_status}
                      disabled={saving !== null}
                      onChange={(e) => void save("Status", { inquiry_status: e.target.value as InquiryStatus })}
                      className="mt-1 h-8 text-[13px]"
                    >
                      {(Object.keys(STATUS_LABEL) as InquiryStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </Select>
                  </label>
                  <label className="block text-[11px] font-medium text-admin-ink-subtle">
                    Priority
                    <Select
                      value={inquiry.priority}
                      disabled={saving !== null}
                      onChange={(e) => void save("Priority", { priority: e.target.value as InquiryPriority })}
                      className="mt-1 h-8 text-[13px]"
                    >
                      {(Object.keys(PRIORITY_LABEL) as InquiryPriority[]).map((p) => (
                        <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                      ))}
                    </Select>
                  </label>
                  <label className="block text-[11px] font-medium text-admin-ink-subtle">
                    <span className="inline-flex items-center gap-1"><UserCheck className="size-3" aria-hidden />Assigned to</span>
                    <Select
                      value={inquiry.assigned_to}
                      disabled={saving !== null}
                      onChange={(e) => void save("Assignment", { assigned_to: e.target.value })}
                      className="mt-1 h-8 text-[13px]"
                    >
                      <option value="">Unassigned</option>
                      {assignees.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </Select>
                  </label>
                  <div>
                    <label className="block text-[11px] font-medium text-admin-ink-subtle" htmlFor="followup-date">
                      <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" aria-hidden />Follow-up date</span>
                    </label>
                    <div className="mt-1 flex gap-1.5">
                      <Input id="followup-date" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="h-8 text-[13px]" />
                      <Button size="sm" variant="outline" disabled={saving !== null || followUp === (inquiry.follow_up_date ?? "")} onClick={() => void save("Follow-up date", { follow_up_date: followUp })}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-md border border-admin-border px-3 py-2">
                  <label className="block text-[11px] font-medium text-admin-ink-subtle" htmlFor="booking-ref">
                    Linked booking reference
                  </label>
                  <div className="mt-1 flex gap-1.5">
                    <Input id="booking-ref" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} placeholder="e.g. TRQ-…" className="h-8 text-[13px]" maxLength={60} />
                    <Button size="sm" variant="outline" disabled={saving !== null || bookingRef.trim() === (inquiry.converted_booking_id ?? "")} onClick={() => void save("Booking link", { converted_booking_id: bookingRef.trim() })}>
                      Link
                    </Button>
                  </div>
                  <p className="mt-1 text-[11px] text-admin-ink-subtle">
                    Marking an inquiry converted does not confirm a booking. The customer sees &quot;Booking confirmed&quot; only when the linked booking itself is confirmed.
                  </p>
                </div>
              </Section>

              <Section title="Internal notes">
                <label className="sr-only" htmlFor="inquiry-note">Add an internal note</label>
                <textarea
                  id="inquiry-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Only the Tripime team can see notes."
                  className="w-full resize-y rounded-md border border-admin-border bg-white px-3 py-2 text-[13px] text-admin-ink focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] text-admin-ink-subtle">{note.length}/2000</span>
                  <Button size="sm" variant="outline" disabled={saving !== null || !note.trim()} onClick={() => void addNote()}>
                    <StickyNote className="size-3.5" aria-hidden />Add note
                  </Button>
                </div>
              </Section>

              <Section title="Activity history">
                {detail && detail.activities.length > 0 ? (
                  <ol className="relative space-y-3 border-l border-admin-border pl-4">
                    {detail.activities.map((a) => (
                      <li key={a.activity_id} className="relative">
                        <span className="absolute -left-[21px] top-1 flex size-3 items-center justify-center rounded-full bg-admin-accent text-white ring-2 ring-admin-surface">
                          <Check className="size-2" aria-hidden />
                        </span>
                        <p className="text-[13px] font-medium text-admin-ink">
                          {ACTION_LABEL[a.action] ?? a.action}
                          {a.old_value || a.new_value ? (
                            <span className="font-normal text-admin-ink-muted"> · {a.old_value ? `${labelFor(a.action, a.old_value)} → ` : ""}{labelFor(a.action, a.new_value)}</span>
                          ) : null}
                        </p>
                        {a.detail ? <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-admin-ink-muted">{a.detail}</p> : null}
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-admin-ink-subtle">
                          <Clock className="size-3" aria-hidden />
                          {formatDateTime(a.created_at)} · {a.actor_type === "admin" ? `by ${a.actor}` : a.actor_type === "customer" ? "customer" : a.actor_type === "whatsapp" ? `WhatsApp +${a.actor}` : "system"}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[13px] text-admin-ink-subtle">No activity recorded yet.</p>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function labelFor(action: string, value: string): string {
  if (action === "status_changed" && value in STATUS_LABEL) return STATUS_LABEL[value as InquiryStatus];
  if (action === "priority_changed" && value in PRIORITY_LABEL) return PRIORITY_LABEL[value as InquiryPriority];
  return value || "none";
}
