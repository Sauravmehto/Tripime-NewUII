"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Users,
} from "lucide-react";
import { getAdminEnquiryStats, listAdminEnquiries, updateAdminEnquiryStatus } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import {
  AdminDataTable,
  AdminErrorState,
  AdminLoading,
  AdminRowMenu,
  AdminRowMenuStop,
  AdminStat,
  AdminStatusBadge,
  type AdminTableColumn,
} from "./ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { Enquiry, EnquirySource, EnquiryStats, EnquiryStatus } from "@/types";

const STATUS_OPTIONS: EnquiryStatus[] = ["NEW", "CONTACTED", "CLOSED"];
const PAGE_SIZES = [25, 50] as const;

const SOURCE_LABEL: Record<EnquirySource, string> = {
  package: "Package",
  group: "Group",
  itinerary: "Itinerary",
  contact: "Contact",
  service: "Service",
};

const TITLES: Record<EnquirySource, string> = {
  package: "Package enquiries",
  group: "Group enquiries",
  itinerary: "Itinerary enquiries",
  contact: "Contact us enquiries",
  service: "Service page enquiries",
};

type SortKey = "createdAt" | "name" | "status";

export function AdminEnquiriesView({
  source,
  title,
  showStats = false,
}: {
  source?: EnquirySource;
  title?: string;
  showStats?: boolean;
}) {
  const handleAuthError = useAdminAuthError();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [stats, setStats] = useState<EnquiryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EnquiryStatus>("ALL");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | EnquirySource>(source ?? "ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [selected, setSelected] = useState<Enquiry | null>(null);

  const heading = title ?? (source ? TITLES[source] : "Enquiries");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs filter with the `source` route prop
    setSourceFilter(source ?? "ALL");
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [data, nextStats] = await Promise.all([
          listAdminEnquiries(source),
          showStats ? getAdminEnquiryStats() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setEnquiries(data);
        if (nextStats) setStats(nextStats);
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
  }, [handleAuthError, showStats, source]);

  async function handleStatusChange(enquiry: Enquiry, status: EnquiryStatus) {
    if (status === enquiry.status) return;
    setUpdatingId(enquiry.id);
    setError("");
    try {
      const updated = await updateAdminEnquiryStatus(enquiry.id, status);
      setEnquiries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = enquiries.filter((e) => {
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
      if (!source && sourceFilter !== "ALL" && e.source !== sourceFilter) return false;
      if (!q) return true;
      return [e.name, e.email, e.phone, e.message, e.packageTitle, e.serviceType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
    rows.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "status") return a.status.localeCompare(b.status) * dir;
      return a.createdAt.localeCompare(b.createdAt) * dir;
    });
    return rows;
  }, [enquiries, query, sortDir, sortKey, source, sourceFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const newCount = enquiries.filter((e) => e.status === "NEW").length;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets pagination when filters change
    setPage(1);
  }, [query, statusFilter, sourceFilter, sortKey, sortDir, pageSize]);

  const columns: AdminTableColumn<Enquiry>[] = [
    {
      key: "name",
      header: "Name",
      render: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-admin-ink">{e.name}</p>
          <p className="truncate text-[11px] text-admin-ink-subtle">{e.email}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Phone",
      hideOnMobile: true,
      render: (e) => <span className="text-admin-ink-muted">{e.phone}</span>,
    },
    {
      key: "source",
      header: "Source",
      render: (e) => (
        <span className="text-admin-ink-muted">
          {SOURCE_LABEL[e.source]}
          {e.serviceType ? ` · ${e.serviceType}` : ""}
        </span>
      ),
    },
    {
      key: "package",
      header: "Detail",
      hideOnMobile: true,
      render: (e) => (
        <span className="line-clamp-1 text-admin-ink-muted">
          {e.packageTitle || e.travelMonth || e.message || "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Received",
      className: "w-[110px]",
      render: (e) => (
        <span className="text-[12px] text-admin-ink-subtle" title={formatDateTime(e.createdAt)}>
          {formatRelativeTime(e.createdAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[92px]",
      render: (e) => <AdminStatusBadge tone={e.status}>{e.status}</AdminStatusBadge>,
    },
    {
      key: "actions",
      header: "",
      className: "w-10 text-right",
      render: (e) => (
        <AdminRowMenuStop>
          <AdminRowMenu
            items={[
              { label: "View", icon: Eye, onClick: () => setSelected(e) },
              ...STATUS_OPTIONS.filter((s) => s !== e.status).map((s) => ({
                label: `Mark ${s.toLowerCase()}`,
                onClick: () => void handleStatusChange(e, s),
                disabled: updatingId === e.id,
              })),
            ]}
          />
        </AdminRowMenuStop>
      ),
    },
  ];

  if (loading) return <AdminLoading rows={8} />;

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title={heading}
        description="Scan, filter, and update enquiry status without leaving the list."
        action={<AdminStatusBadge tone="warning">{newCount} new</AdminStatusBadge>}
      />

      {error ? <AdminErrorState message={error} /> : null}

      {showStats && stats ? (
        <>
          <p className="text-[11px] text-admin-ink-subtle">
            Today: {stats.today.package} package · {stats.today.group} group ·{" "}
            {stats.today.itinerary} itinerary · {stats.today.contact} contact ·{" "}
            {stats.today.service} service
          </p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            {(
              [
                ["package", Inbox, stats.total.package],
                ["group", Users, stats.total.group],
                ["itinerary", MessageSquare, stats.total.itinerary],
                ["contact", Mail, stats.total.contact],
                ["service", Phone, stats.total.service],
              ] as const
            ).map(([key, icon, value]) => (
              <AdminStat
                key={key}
                label={SOURCE_LABEL[key]}
                value={value}
                icon={icon}
                active={sourceFilter === key}
                onClick={() => setSourceFilter(sourceFilter === key ? "ALL" : key)}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-admin-ink-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone…"
            className="h-8 pl-8"
            aria-label="Search enquiries"
          />
        </div>
        {!source ? (
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as "ALL" | EnquirySource)}
            className="h-8 w-[140px] text-[12px]"
            aria-label="Filter by source"
          >
            <option value="ALL">All sources</option>
            {(Object.keys(SOURCE_LABEL) as EnquirySource[]).map((key) => (
              <option key={key} value={key}>
                {SOURCE_LABEL[key]}
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | EnquiryStatus)}
          className="h-8 w-[130px] text-[12px]"
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={`${sortKey}:${sortDir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(":") as [SortKey, "asc" | "desc"];
            setSortKey(key);
            setSortDir(dir);
          }}
          className="h-8 w-[150px] text-[12px]"
          aria-label="Sort enquiries"
        >
          <option value="createdAt:desc">Newest</option>
          <option value="createdAt:asc">Oldest</option>
          <option value="name:asc">Name A–Z</option>
          <option value="name:desc">Name Z–A</option>
          <option value="status:asc">Status</option>
        </Select>
      </div>

      <AdminDataTable
        columns={columns}
        rows={pageRows}
        rowKey={(e) => e.id}
        emptyTitle="No enquiries match"
        emptyDescription="Try a different search or filter."
        onRowClick={(e) => setSelected(e)}
      />

      <div className="flex items-center justify-between text-[11px] text-admin-ink-subtle">
        <p>
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
          {filtered.length !== enquiries.length ? ` of ${enquiries.length}` : ""}
        </p>
        <div className="flex items-center gap-1">
          <Select
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number])}
            className="h-7 w-[72px] text-[11px]"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="xs"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="px-1.5">
            {safePage} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="xs"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.name : "Enquiry"}
        className="sm:max-w-lg"
      >
        {selected ? (
          <div className="space-y-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <AdminStatusBadge tone={selected.status}>{selected.status}</AdminStatusBadge>
              <AdminStatusBadge>{SOURCE_LABEL[selected.source]}</AdminStatusBadge>
              {selected.serviceType ? <AdminStatusBadge>{selected.serviceType}</AdminStatusBadge> : null}
            </div>
            <dl className="grid grid-cols-[88px_1fr] gap-y-1.5 text-[12px]">
              <dt className="text-admin-ink-subtle">Email</dt>
              <dd>{selected.email}</dd>
              <dt className="text-admin-ink-subtle">Phone</dt>
              <dd>{selected.phone}</dd>
              {selected.packageTitle ? (
                <>
                  <dt className="text-admin-ink-subtle">Package</dt>
                  <dd>{selected.packageTitle}</dd>
                </>
              ) : null}
              {selected.travelMonth ? (
                <>
                  <dt className="text-admin-ink-subtle">Travel</dt>
                  <dd>{selected.travelMonth}</dd>
                </>
              ) : null}
              {selected.travelers ? (
                <>
                  <dt className="text-admin-ink-subtle">Travellers</dt>
                  <dd>{selected.travelers}</dd>
                </>
              ) : null}
              <dt className="text-admin-ink-subtle">Received</dt>
              <dd>{formatDateTime(selected.createdAt)}</dd>
            </dl>
            {selected.message ? (
              <p className="rounded-md bg-admin-muted px-2.5 py-2 text-[12px] leading-relaxed text-admin-ink">
                {selected.message}
              </p>
            ) : null}
            <FieldStatus
              value={selected.status}
              disabled={updatingId === selected.id}
              onChange={(status) => void handleStatusChange(selected, status)}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function FieldStatus({
  value,
  disabled,
  onChange,
}: {
  value: EnquiryStatus;
  disabled: boolean;
  onChange: (status: EnquiryStatus) => void;
}) {
  return (
    <label className="block text-[12px]">
      <span className="mb-1 block text-[11px] font-medium text-admin-ink-muted">Status</span>
      <Select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as EnquiryStatus)}
        className="h-8 text-[12px]"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
    </label>
  );
}
