"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  confirmAdminBooking,
  downloadAdminInvoice,
  listAdminBookings,
  sendAdminInvoice,
  updateAdminInvoice,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatINR } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { Badge, Card, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { Booking, InvoiceUpdateInput } from "@/types";

const EMPTY_INVOICE_FORM: InvoiceUpdateInput = {
  notes: "",
  discountLabel: "",
  discountAmount: 0,
  extraCharges: [],
};

export function AdminBookingsView() {
  const handleAuthError = useAdminAuthError();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Booking | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<Booking | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceUpdateInput>(EMPTY_INVOICE_FORM);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await listAdminBookings();
        if (!cancelled) setBookings(data);
      } catch (err) {
        if (handleAuthError(err)) return;
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [handleAuthError]);

  function applyBookingUpdate(updated: Booking) {
    setBookings((prev) => prev.map((b) => (b.bookingId === updated.bookingId ? updated : b)));
    if (selected?.bookingId === updated.bookingId) setSelected(updated);
    if (invoiceTarget?.bookingId === updated.bookingId) setInvoiceTarget(updated);
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    const booking = confirmTarget;
    setConfirmTarget(null);
    setConfirmingId(booking.bookingId);
    setSuccess("");
    try {
      const updated = await confirmAdminBooking(booking.bookingId);
      applyBookingUpdate(updated);
      setSuccess(`Ticket confirmed · email queued for ${updated.contact.email}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setConfirmingId(null);
    }
  }

  function openInvoiceEditor(booking: Booking) {
    setInvoiceTarget(booking);
    setInvoiceForm({
      notes: booking.invoice.notes,
      discountLabel: booking.invoice.discountLabel,
      discountAmount: booking.invoice.discountAmount,
      extraCharges: booking.invoice.extraCharges,
    });
    setInvoiceError("");
  }

  function addExtraCharge() {
    setInvoiceForm((prev) => ({
      ...prev,
      extraCharges: [...prev.extraCharges, { label: "", amount: 0 }],
    }));
  }

  function updateExtraCharge(index: number, patch: Partial<{ label: string; amount: number }>) {
    setInvoiceForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.map((charge, i) =>
        i === index ? { ...charge, ...patch } : charge,
      ),
    }));
  }

  function removeExtraCharge(index: number) {
    setInvoiceForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.filter((_, i) => i !== index),
    }));
  }

  async function handleSaveInvoice() {
    if (!invoiceTarget) return;
    setSavingInvoice(true);
    setInvoiceError("");
    try {
      const updated = await updateAdminInvoice(invoiceTarget.bookingId, invoiceForm);
      applyBookingUpdate(updated);
      return updated;
    } catch (err) {
      if (handleAuthError(err)) return null;
      setInvoiceError(getErrorMessage(err));
      return null;
    } finally {
      setSavingInvoice(false);
    }
  }

  async function handleSendInvoice() {
    if (!invoiceTarget) return;
    setSendingInvoice(true);
    setInvoiceError("");
    try {
      const saved = await updateAdminInvoice(invoiceTarget.bookingId, invoiceForm);
      applyBookingUpdate(saved);
      const sent = await sendAdminInvoice(invoiceTarget.bookingId);
      applyBookingUpdate(sent);
      setInvoiceTarget(null);
      setSuccess(`Invoice emailed to ${sent.contact.email}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setInvoiceError(getErrorMessage(err));
    } finally {
      setSendingInvoice(false);
    }
  }

  async function handleDownloadInvoice(booking: Booking) {
    setDownloadingId(booking.bookingId);
    setError("");
    try {
      const blob = await downloadAdminInvoice(booking.bookingId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${booking.bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  const invoiceTotal = invoiceTarget
    ? invoiceTarget.totalAmount -
      invoiceForm.discountAmount +
      invoiceForm.extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0)
    : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Bookings"
        description="Review and confirm tickets. Confirmation emails are queued by the API."
      />

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
          {success}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] uppercase tracking-wide text-ink-subtle">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Booking</th>
                <th className="px-3 py-2.5 font-semibold">Route</th>
                <th className="px-3 py-2.5 font-semibold">Pax</th>
                <th className="px-3 py-2.5 font-semibold">Amount</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-ink-muted">
                    No bookings yet.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr
                    key={b.bookingId}
                    className={
                      selected?.bookingId === b.bookingId ? "bg-primary-50/40" : "hover:bg-neutral-50"
                    }
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-ink">{b.pnr}</p>
                      <p className="text-[11px] text-ink-subtle">{formatDateTime(b.createdAt)}</p>
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {b.flight.origin.code} → {b.flight.destination.code}
                    </td>
                    <td className="px-3 py-2.5">{b.passengerCount}</td>
                    <td className="px-3 py-2.5 font-semibold">{formatINR(b.totalAmount)}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={b.status === "CONFIRMED" ? "success" : "warning"}>
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(b)}>
                          Details
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openInvoiceEditor(b)}>
                          Invoice
                        </Button>
                        {b.status === "PROCESSING" && (
                          <Button
                            size="sm"
                            onClick={() => setConfirmTarget(b)}
                            disabled={confirmingId === b.bookingId}
                          >
                            {confirmingId === b.bookingId ? "…" : "Confirm"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>

        <Card>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
                    {selected.bookingId}
                  </p>
                  <h2 className="text-lg font-bold text-ink">{selected.pnr}</h2>
                </div>
                <Badge tone={selected.status === "CONFIRMED" ? "success" : "warning"}>
                  {selected.status}
                </Badge>
              </div>
              <p>
                <span className="text-ink-muted">Route: </span>
                <strong>
                  {selected.flight.origin.city} ({selected.flight.origin.code}) →{" "}
                  {selected.flight.destination.city} ({selected.flight.destination.code})
                </strong>
              </p>
              <p>
                <span className="text-ink-muted">Contact: </span>
                {selected.contact.email} · {selected.contact.phone}
              </p>
              <p>
                <span className="text-ink-muted">Total: </span>
                <strong>{formatINR(selected.totalAmount)}</strong>
              </p>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase text-ink-subtle">Passengers</p>
                <ul className="space-y-1">
                  {selected.passengers.map((p, i) => (
                    <li key={i} className="text-ink">
                      {p.title} {p.firstName} {p.lastName}
                      {p.seatNumber ? ` · seat ${p.seatNumber}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              {selected.invoice.sentAt && (
                <p className="text-[11px] text-ink-subtle">
                  Invoice last emailed {formatDateTime(selected.invoice.sentAt)} to{" "}
                  {selected.invoice.sentTo}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {selected.status === "PROCESSING" && (
                  <Button
                    className="flex-1"
                    onClick={() => setConfirmTarget(selected)}
                    disabled={confirmingId === selected.bookingId}
                  >
                    Confirm ticket
                  </Button>
                )}
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => openInvoiceEditor(selected)}
                >
                  Edit invoice
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => void handleDownloadInvoice(selected)}
                  disabled={downloadingId === selected.bookingId}
                >
                  {downloadingId === selected.bookingId ? "…" : "Download PDF"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Select a booking to view details.</p>
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        title="Confirm this ticket?"
      >
        {confirmTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              PNR <strong className="text-ink">{confirmTarget.pnr}</strong> ·{" "}
              {confirmTarget.flight.origin.code} → {confirmTarget.flight.destination.code}
              <br />A confirmation email will be sent to{" "}
              <strong className="text-ink">{confirmTarget.contact.email}</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmTarget(null)}>
                Cancel
              </Button>
              <Button onClick={() => void handleConfirm()}>Confirm ticket</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(invoiceTarget)}
        onClose={() => setInvoiceTarget(null)}
        title="Edit invoice"
        className="sm:max-w-lg"
      >
        {invoiceTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              {invoiceTarget.bookingId} · PNR {invoiceTarget.pnr} · fare{" "}
              {formatINR(invoiceTarget.totalAmount)}
            </p>

            {invoiceError && (
              <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
                {invoiceError}
              </p>
            )}

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
                Extra charges
              </p>
              <div className="space-y-2">
                {invoiceForm.extraCharges.map((charge, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Label (e.g. Service fee)"
                      value={charge.label}
                      onChange={(e) => updateExtraCharge(i, { label: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Amount"
                      value={charge.amount || ""}
                      onChange={(e) =>
                        updateExtraCharge(i, { amount: Number(e.target.value) || 0 })
                      }
                      className="w-28"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Remove charge"
                      onClick={() => removeExtraCharge(i)}
                    >
                      <Trash2 className="size-4 text-danger-600" />
                    </Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={addExtraCharge}>
                  <Plus className="size-3.5" />
                  Add charge
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
                  Discount label
                </label>
                <Input
                  placeholder="e.g. Loyalty discount"
                  value={invoiceForm.discountLabel}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({ ...prev, discountLabel: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
                  Discount amount
                </label>
                <Input
                  type="number"
                  min={0}
                  value={invoiceForm.discountAmount || ""}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      discountAmount: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
                Notes (printed on the PDF)
              </label>
              <Textarea
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional note for the customer…"
              />
            </div>

            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
              <span className="text-ink-muted">Adjusted total: </span>
              <strong className="text-ink">{formatINR(invoiceTotal)}</strong>
            </p>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setInvoiceTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => void handleSaveInvoice()}
                disabled={savingInvoice || sendingInvoice}
              >
                {savingInvoice ? "Saving…" : "Save changes"}
              </Button>
              <Button
                onClick={() => void handleSendInvoice()}
                disabled={savingInvoice || sendingInvoice}
              >
                {sendingInvoice ? "Sending…" : `Send to ${invoiceTarget.contact.email}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
