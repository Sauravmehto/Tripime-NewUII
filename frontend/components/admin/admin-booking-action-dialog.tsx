"use client";

import { useState } from "react";
import {
  confirmAdminBooking,
  confirmAdminPayment,
  failAdminBooking,
  failAdminPayment,
  issueAdminTicket,
  reopenAdminPayment,
  type ManualPaymentInput,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { Booking, BookingState } from "@/types";

export type AdminAction = "payment" | "paymentFail" | "paymentReopen" | "airline" | "ticket" | "bookingFail";

const TITLES: Record<AdminAction, string> = {
  payment: "Record verified payment",
  paymentFail: "Mark payment as not received",
  paymentReopen: "Reopen for payment",
  airline: "Record airline confirmation",
  ticket: "Record issued tickets",
  bookingFail: "Mark airline booking as failed",
};

/** The admin's next step(s) for a booking in each state. */
export function actionsFor(state: BookingState): AdminAction[] {
  switch (state) {
    case "PAYMENT_PENDING":
      return ["payment", "paymentFail"];
    case "PAYMENT_FAILED":
      return ["payment", "paymentReopen"];
    case "PAYMENT_CONFIRMED":
      return ["airline", "bookingFail"];
    case "BOOKING_CONFIRMED":
      return ["ticket", "bookingFail"];
    default:
      return [];
  }
}

export const ACTION_LABELS: Record<AdminAction, string> = {
  payment: "Record payment",
  paymentFail: "Not paid",
  paymentReopen: "Reopen",
  airline: "Add airline PNR",
  ticket: "Issue tickets",
  bookingFail: "Booking failed",
};

export function AdminBookingActionDialog({
  booking,
  action,
  onClose,
  onDone,
}: {
  booking: Booking | null;
  action: AdminAction | null;
  onClose: () => void;
  onDone: (updated: Booking, message: string) => void;
}) {
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState<ManualPaymentInput["method"]>("upi");
  const [amount, setAmount] = useState("");
  const [pnr, setPnr] = useState("");
  const [tickets, setTickets] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setReference("");
    setAmount("");
    setPnr("");
    setTickets("");
    setNote("");
    setError("");
    onClose();
  }

  async function submit() {
    if (!booking || !action) return;
    setBusy(true);
    setError("");
    try {
      let updated: Booking;
      let message: string;
      if (action === "payment") {
        updated = await confirmAdminPayment(booking.bookingId, {
          reference: reference.trim(),
          method,
          amount: Number(amount),
          note: note.trim(),
        });
        message = `Payment recorded for ${booking.bookingId}.`;
      } else if (action === "paymentFail") {
        updated = await failAdminPayment(booking.bookingId, note.trim());
        message = `${booking.bookingId} marked as not paid.`;
      } else if (action === "paymentReopen") {
        updated = await reopenAdminPayment(booking.bookingId, note.trim());
        message = `${booking.bookingId} is awaiting payment again.`;
      } else if (action === "airline") {
        updated = await confirmAdminBooking(booking.bookingId, pnr.trim(), note.trim());
        message = `Airline PNR ${updated.pnr} recorded.`;
      } else if (action === "ticket") {
        const numbers = tickets.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
        updated = await issueAdminTicket(booking.bookingId, numbers, note.trim());
        message = `Tickets recorded — the e-ticket is now available to the traveller.`;
      } else {
        updated = await failAdminBooking(booking.bookingId, note.trim());
        message = `${booking.bookingId} marked as failed; seats released.`;
      }
      onDone(updated, `${message} Notifications are being attempted; see delivery status.`);
      close();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(booking && action)} onClose={close} title={action ? TITLES[action] : ""}>
      {booking && action && (
        <div className="space-y-3 text-sm">
          <p className="text-ink-muted">
            {booking.bookingId} · {booking.flight.origin.code} → {booking.flight.destination.code} · total{" "}
            <strong className="text-ink">{formatINR(booking.totalAmount)}</strong>
          </p>
          {action === "payment" && (
            <>
              <p className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-ink">
                Only record a payment you have seen in the bank statement or UPI app. This can&apos;t be done
                automatically from a screenshot or a reference the traveller sends.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select aria-label="Payment method" value={method} onChange={(e) => setMethod(e.target.value as ManualPaymentInput["method"])}>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card_link">Card payment link</option>
                  <option value="other">Other</option>
                </Select>
                <Input
                  aria-label="Amount received (INR)"
                  inputMode="numeric"
                  placeholder={`Amount (${booking.totalAmount})`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <Input
                aria-label="Bank / UPI transaction reference"
                placeholder="Bank / UPI transaction reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </>
          )}
          {action === "airline" && (
            <Input
              aria-label="Airline PNR"
              placeholder="Airline PNR (e.g. 7F3K2Q)"
              value={pnr}
              maxLength={8}
              onChange={(e) => setPnr(e.target.value.toUpperCase())}
              className="font-mono"
            />
          )}
          {action === "ticket" && (
            <Textarea
              aria-label="Ticket numbers"
              placeholder={`One ticket number per traveller (${booking.passengerCount}), separated by commas or new lines`}
              value={tickets}
              onChange={(e) => setTickets(e.target.value)}
              rows={3}
              className="font-mono"
            />
          )}
          <Textarea
            aria-label="Note"
            placeholder="Note for the status history (optional)"
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          {error && (
            <p role="alert" className="text-danger-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button variant="admin" disabled={busy} onClick={() => void submit()}>
              {busy ? "Saving…" : TITLES[action]}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
