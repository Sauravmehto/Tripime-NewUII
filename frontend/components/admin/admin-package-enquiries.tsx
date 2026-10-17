"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Phone, RefreshCw, Users } from "lucide-react";
import { listAdminEnquiries, updateAdminEnquiryStatus } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { Enquiry, EnquiryStatus } from "@/types";

const STATUSES: EnquiryStatus[] = ["NEW", "CONTACTED", "CLOSED"];
const TONE: Record<EnquiryStatus, "warning" | "success" | "neutral"> = {
  NEW: "warning",
  CONTACTED: "success",
  CLOSED: "neutral",
};

/**
 * Enquiries sent from a package's "Enquire about this package" form.
 * Rows come from the shared enquiries store, so they also appear under Enquiries → Package.
 */
export function AdminPackageEnquiries({
  onLoaded,
}: {
  /** Reports enquiry counts per package ID so the package list can show them. */
  onLoaded?: (countsByPackage: Record<string, number>) => void;
}) {
  const handleAuthError = useAdminAuthError();
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [packageFilter, setPackageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EnquiryStatus>("ALL");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await listAdminEnquiries("package");
      setRows([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      const counts: Record<string, number> = {};
      for (const e of data) if (e.packageId) counts[e.packageId] = (counts[e.packageId] ?? 0) + 1;
      onLoaded?.(counts);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, onLoaded]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void load();
  }, [load]);

  async function changeStatus(enquiry: Enquiry, status: EnquiryStatus) {
    if (status === enquiry.status) return;
    setUpdatingId(enquiry.id);
    setError("");
    try {
      const updated = await updateAdminEnquiryStatus(enquiry.id, status);
      setRows((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  const packages = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of rows) seen.set(e.packageId ?? "", e.packageTitle || "Unnamed package");
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const visible = rows.filter(
    (e) =>
      (packageFilter === "ALL" || (e.packageId ?? "") === packageFilter) &&
      (statusFilter === "ALL" || e.status === statusFilter),
  );
  const newCount = rows.filter((e) => e.status === "NEW").length;

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <MessageSquare className="size-4 text-primary-600" aria-hidden />
            Package enquiries
            {newCount > 0 && <Badge tone="warning">{newCount} new</Badge>}
          </h2>
          <p className="text-xs text-ink-muted">
            Sent from “Enquire about this package” on the website. {rows.length} total.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filter by package"
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="h-8 w-auto text-xs"
          >
            <option value="ALL">All packages</option>
            {packages.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | EnquiryStatus)}
            className="h-8 w-auto text-xs"
          >
            <option value="ALL">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-3.5" aria-hidden /> Refresh
          </Button>
          <Link href="/admin/enquiries/package" className="text-xs font-semibold text-primary-700 hover:text-primary-800">
            Open full list
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="bg-danger-50 px-4 py-2 text-xs text-danger-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="px-4 py-6 text-sm text-ink-muted">Loading enquiries…</p>
      ) : visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-muted">
          {rows.length === 0 ? "No package enquiries yet. They appear here as soon as a customer sends one." : "No enquiries match these filters."}
        </p>
      ) : (
        <ul className="max-h-[420px] divide-y divide-neutral-100 overflow-y-auto">
          {visible.map((e) => (
            <li key={e.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_auto] md:items-start">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{e.packageTitle || "Unnamed package"}</p>
                <p className="text-[11px] text-ink-subtle">
                  {formatDateTime(e.createdAt)} · <span className="font-mono">{e.id}</span>
                </p>
                {e.message && <p className="mt-1 line-clamp-2 text-xs text-ink-muted">“{e.message}”</p>}
              </div>
              <div className="min-w-0 text-xs text-ink-muted">
                <p className="font-semibold text-ink">{e.name}</p>
                <p className="flex items-center gap-1.5">
                  <Phone className="size-3 shrink-0" aria-hidden />
                  <a href={`tel:${e.phone}`} className="hover:text-primary-700">
                    {e.phone}
                  </a>
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Mail className="size-3 shrink-0" aria-hidden />
                  <a href={`mailto:${e.email}`} className="truncate hover:text-primary-700">
                    {e.email}
                  </a>
                </p>
                <p className="flex items-center gap-1.5">
                  <Users className="size-3 shrink-0" aria-hidden />
                  {e.travelers ?? 1} traveller{(e.travelers ?? 1) === 1 ? "" : "s"}
                  {e.travelMonth ? ` · ${e.travelMonth}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 md:flex-col md:items-end">
                <Badge tone={TONE[e.status]}>{e.status}</Badge>
                <Select
                  aria-label={`Status for enquiry ${e.id}`}
                  value={e.status}
                  disabled={updatingId === e.id}
                  onChange={(ev) => void changeStatus(e, ev.target.value as EnquiryStatus)}
                  className="h-8 w-auto text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </Select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
