"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, X } from "lucide-react";
import { getAdminCustomers, resetAdminCustomerPassword, type TemporaryPasswordResult } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatAdminDate } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminDataTable, type AdminTableColumn } from "./ui/admin-data-table";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminSection } from "./ui/admin-section";
import type { CustomerLogin } from "@/types";

export function AdminCustomersView() {
  const handleAuthError = useAdminAuthError();
  const [rows, setRows] = useState<CustomerLogin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [issued, setIssued] = useState<TemporaryPasswordResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function resetPassword(row: CustomerLogin) {
    setResettingId(row.id);
    setError("");
    setCopied(false);
    try {
      setIssued(await resetAdminCustomerPassword(row.id));
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setResettingId(null);
      setConfirmingId(null);
    }
  }

  async function copyPassword() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.temporaryPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminCustomers();
        if (cancelled) return;
        setRows(data);
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

  const columns: AdminTableColumn<CustomerLogin>[] = [
    {
      key: "index",
      header: "#",
      className: "w-10",
      render: (row) => rows.findIndex((item) => item.id === row.id) + 1,
    },
    { key: "name", header: "Customer Name", render: (row) => row.name || "----" },
    { key: "email", header: "Email", render: (row) => row.email },
    { key: "mobile", header: "Mobile", render: (row) => row.mobile },
    {
      key: "signupPage",
      header: "Signed up on",
      render: (row) => row.signupPage || "—",
    },
    {
      key: "loginCount",
      header: "Logins",
      render: (row) => row.loginCount ?? 0,
    },
    {
      key: "firstLogin",
      header: "First login",
      render: (row) => formatAdminDate(row.firstLoginAt),
    },
    {
      key: "lastLogin",
      header: "Last login",
      render: (row) => (row.lastLoginAt ? formatAdminDate(row.lastLoginAt) : "—"),
    },
    {
      key: "password",
      header: "Password",
      render: (row) =>
        !row.email ? (
          "—"
        ) : confirmingId === row.id ? (
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void resetPassword(row)}
              disabled={resettingId === row.id}
              className="rounded-md bg-admin-accent px-2 py-1 text-[11px] font-semibold text-white hover:bg-admin-accent-hover disabled:opacity-60"
            >
              {resettingId === row.id ? "Resetting…" : "Confirm reset"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingId(null)}
              aria-label="Cancel reset"
              className="rounded-md p-1 text-admin-ink-subtle hover:bg-admin-canvas"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingId(row.id)}
            className="inline-flex items-center gap-1 rounded-md border border-admin-border px-2 py-1 text-[11px] font-semibold text-admin-ink hover:bg-admin-canvas"
          >
            <KeyRound className="size-3" aria-hidden />
            Reset password
          </button>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      {error ? <AdminErrorState message={error} /> : null}
      {issued && (
        <div role="status" className="rounded-md border border-admin-border bg-admin-surface p-3 text-[12px] text-admin-ink">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              Temporary password for <strong>{issued.email}</strong>. Share it privately; it is shown only once. They
              must choose their own password after signing in.
            </p>
            <button
              type="button"
              onClick={() => setIssued(null)}
              aria-label="Dismiss"
              className="rounded-md p-1 text-admin-ink-subtle hover:bg-admin-canvas"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded bg-admin-canvas px-2 py-1 font-mono text-[13px] tracking-wider">{issued.temporaryPassword}</code>
            <button
              type="button"
              onClick={() => void copyPassword()}
              className="inline-flex items-center gap-1 rounded-md border border-admin-border px-2 py-1 text-[11px] font-semibold hover:bg-admin-canvas"
            >
              {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
      <AdminSection title="Customer Login Data" padded={false}>
        <AdminDataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          emptyTitle="No customer logins"
          emptyDescription="Login records will appear here."
          className="rounded-none border-0"
        />
      </AdminSection>
    </div>
  );
}
