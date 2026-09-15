"use client";

import { useEffect, useState } from "react";
import { getAdminFlightSearches } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatAdminDate } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminDataTable, type AdminTableColumn } from "./ui/admin-data-table";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminSection } from "./ui/admin-section";
import type { FlightSearchLog } from "@/types";

function place(code: string, city: string) {
  return `${code}-${city}`;
}

export function AdminFlightSearchView() {
  const handleAuthError = useAdminAuthError();
  const [rows, setRows] = useState<FlightSearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminFlightSearches();
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

  const columns: AdminTableColumn<FlightSearchLog>[] = [
    {
      key: "index",
      header: "#",
      className: "w-10",
      render: (row) => rows.findIndex((item) => item.id === row.id) + 1,
    },
    {
      key: "from",
      header: "From",
      render: (row) => place(row.fromCode, row.fromCity),
    },
    {
      key: "to",
      header: "To",
      render: (row) => place(row.toCode, row.toCity),
    },
    { key: "ip", header: "IP", render: (row) => row.ip },
    {
      key: "date",
      header: "Search Date",
      render: (row) => formatAdminDate(row.searchedAt),
    },
  ];

  return (
    <div className="space-y-3">
      {error ? <AdminErrorState message={error} /> : null}
      <AdminSection title="Flight Search Data" padded={false}>
        <AdminDataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          emptyTitle="No flight searches"
          emptyDescription="Search logs will appear here."
          className="rounded-none border-0"
        />
      </AdminSection>
    </div>
  );
}
