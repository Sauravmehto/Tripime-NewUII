"use client";

import { useEffect, useState } from "react";
import { getAdminCustomers } from "@/lib/api/admin";
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
      key: "firstLogin",
      header: "First Time Login",
      render: (row) => formatAdminDate(row.firstLoginAt),
    },
  ];

  return (
    <div className="space-y-3">
      {error ? <AdminErrorState message={error} /> : null}
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
