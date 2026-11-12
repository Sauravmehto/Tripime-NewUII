"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Headphones,
  Mail,
  MessageCircle,
  Phone,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import {
  getAdminInquiryStats,
  getAdminInquiryTeam,
  listAdminInquiries,
  type AdminInquiry,
  type InquiryPage,
  type InquiryPriority,
  type InquirySource,
  type InquiryStats,
  type InquiryStatus,
} from "@/lib/api/admin-inquiries";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminInquiryDrawer } from "./admin-inquiry-drawer";
import { PRIORITY_LABEL, PRIORITY_TONE, SOURCE_LABEL, STATUS_LABEL, STATUS_TONE, followUpMessage, phoneLinks } from "./inquiry-labels";
import {
  AdminDataTable,
  AdminErrorState,
  AdminStat,
  AdminStatusBadge,
  type AdminTableColumn,
} from "./ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

const PAGE_SIZES = [10, 25, 50] as const;
const SORTS = [
  ["created_at:desc", "Newest first"],
  ["created_at:asc", "Oldest first"],
  ["updated_at:desc", "Recently updated"],
  ["customer_name:asc", "Customer A–Z"],
  ["package_name:asc", "Package A–Z"],
  ["inquiry_status:asc", "Status"],
  ["priority:asc", "Priority (high first)"],
] as const;

interface Filters {
  search: string;
  status: InquiryStatus | "";
  source: InquirySource | "";
  assigned_to: string;
  priority: InquiryPriority | "";
  date_from: string;
  date_to: string;
  sort: string;
}

const EMPTY: Filters = { search: "", status: "", source: "", assigned_to: "", priority: "", date_from: "", date_to: "", sort: "created_at:desc" };

export function AdminInquiriesView() {
  const handleAuthError = useAdminAuthError();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [data, setData] = useState<InquiryPage | null>(null);
  const [stats, setStats] = useState<InquiryStats | null>(null);
  const [team, setTeam] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const lastTrigger = useRef<HTMLElement | null>(null);

  // Debounce the search box so we do not query on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) => (prev.search === searchText.trim() ? prev : { ...prev, search: searchText.trim() }));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    getAdminInquiryTeam()
      .then((members) => !cancelled && setTeam(members))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const [sort, order] = filters.sort.split(":") as [string, "asc" | "desc"];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shows the loading state while the filtered list is fetched
    setLoading(true);
    Promise.all([
      listAdminInquiries({ ...filters, sort, order, page, page_size: pageSize }),
      getAdminInquiryStats(),
    ])
      .then(([list, nextStats]) => {
        if (cancelled) return;
        setData(list);
        setStats(nextStats);
        setError("");
      })
      .catch((err) => {
        if (handleAuthError(err)) return;
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize, handleAuthError, reloadKey]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY);
    setSearchText("");
    setPage(1);
  }

  const filtersActive = JSON.stringify({ ...filters, sort: "" }) !== JSON.stringify({ ...EMPTY, sort: "" });
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const open = useCallback((row: AdminInquiry, trigger?: HTMLElement | null) => {
    lastTrigger.current = trigger ?? null;
    setOpenId(row.inquiry_id);
  }, []);

  const close = useCallback(() => {
    setOpenId(null);
    window.setTimeout(() => lastTrigger.current?.focus(), 0);
  }, []);

  const columns: AdminTableColumn<AdminInquiry>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-admin-ink">{r.customer_name || "Unnamed customer"}</p>
          <p className="truncate text-[11px] text-admin-ink-subtle">{r.is_registered ? "Registered user" : "Guest"}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Email / phone",
      hideOnMobile: true,
      render: (r) => (
        <div className="min-w-0 text-[12px]">
          <p className="truncate text-admin-ink-muted">{r.customer_email || "—"}</p>
          <p className="truncate text-admin-ink-subtle">{r.customer_phone || "No phone provided"}</p>
        </div>
      ),
    },
    {
      key: "package",
      header: "Package",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-admin-ink">{r.package_name || "General inquiry"}</p>
          <p className="truncate text-[11px] text-admin-ink-subtle">{r.destination || "—"}</p>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      hideOnMobile: true,
      render: (r) => <span className="text-[12px] text-admin-ink-muted">{SOURCE_LABEL[r.inquiry_source]}</span>,
    },
    {
      key: "date",
      header: "Date",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-[12px] text-admin-ink-subtle" title={formatDateTime(r.created_at)}>
          {formatRelativeTime(r.created_at)}
        </span>
      ),
    },
    {
      key: "assigned",
      header: "Assigned",
      hideOnMobile: true,
      render: (r) =>
        r.assigned_to ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-admin-ink-muted">
            <UserCheck className="size-3" aria-hidden />
            {r.assigned_to}
          </span>
        ) : (
          <span className="text-[12px] text-admin-ink-subtle">Unassigned</span>
        ),
    },
    {
      key: "priority",
      header: "Priority",
      hideOnMobile: true,
      render: (r) => <AdminStatusBadge tone={PRIORITY_TONE[r.priority]}>{PRIORITY_LABEL[r.priority]}</AdminStatusBadge>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <div className="space-y-0.5">
          <AdminStatusBadge tone={STATUS_TONE[r.inquiry_status]}>{STATUS_LABEL[r.inquiry_status]}</AdminStatusBadge>
          {r.follow_up_date ? (
            <p className="flex items-center gap-1 text-[10px] text-admin-ink-subtle">
              <CalendarClock className="size-3" aria-hidden />
              {r.follow_up_date}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[132px]",
      render: (r) => {
        const links = phoneLinks(r.customer_phone, followUpMessage(r.customer_name, r.package_name));
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => open(r, e.currentTarget)}
              aria-label={`View inquiry from ${r.customer_name || r.customer_email}`}
              className="inline-flex size-7 items-center justify-center rounded border border-admin-border text-admin-ink-muted transition hover:bg-admin-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
            >
              <Eye className="size-3.5" aria-hidden />
            </button>
            {links ? (
              <>
                <a href={links.tel} aria-label={`Call ${r.customer_name || "customer"}`} className="inline-flex size-7 items-center justify-center rounded border border-admin-border text-admin-ink-muted transition hover:bg-admin-muted">
                  <Phone className="size-3.5" aria-hidden />
                </a>
                <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Open WhatsApp chat with ${r.customer_name || "customer"}`} className="inline-flex size-7 items-center justify-center rounded border border-admin-border text-admin-ink-muted transition hover:bg-admin-muted">
                  <MessageCircle className="size-3.5" aria-hidden />
                </a>
              </>
            ) : null}
            {r.customer_email ? (
              <a href={`mailto:${r.customer_email}`} aria-label={`Email ${r.customer_name || "customer"}`} className="inline-flex size-7 items-center justify-center rounded border border-admin-border text-admin-ink-muted transition hover:bg-admin-muted">
                <Mail className="size-3.5" aria-hidden />
              </a>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Inquiries"
        description="Every customer inquiry from the website in one place: WhatsApp, booking requests, brochure requests, contact and custom trips."
        action={
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <AdminErrorState
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </Button>
          }
        />
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7" aria-label="Inquiry statistics">
        <AdminStat label="Total" value={stats?.total ?? "—"} icon={Headphones} active={!filters.status} onClick={() => setFilter("status", "")} />
        <AdminStat label="New" value={stats?.new ?? "—"} active={filters.status === "new"} onClick={() => setFilter("status", filters.status === "new" ? "" : "new")} />
        <AdminStat label="Pending follow-ups" value={stats?.pending_follow_ups ?? "—"} icon={CalendarClock} />
        <AdminStat label="Contacted" value={stats?.contacted ?? "—"} active={filters.status === "contacted"} onClick={() => setFilter("status", filters.status === "contacted" ? "" : "contacted")} />
        <AdminStat label="Quotes shared" value={stats?.quote_shared ?? "—"} active={filters.status === "quote_shared"} onClick={() => setFilter("status", filters.status === "quote_shared" ? "" : "quote_shared")} />
        <AdminStat label="Converted" value={stats?.converted ?? "—"} active={filters.status === "converted"} onClick={() => setFilter("status", filters.status === "converted" ? "" : "converted")} />
        <AdminStat label="Cancelled" value={stats?.cancelled ?? "—"} active={filters.status === "cancelled"} onClick={() => setFilter("status", filters.status === "cancelled" ? "" : "cancelled")} />
      </div>

      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter inquiries">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-admin-ink-subtle" aria-hidden />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search name, email, phone, package, destination…"
            className="h-8 pl-8"
            aria-label="Search inquiries"
          />
        </div>
        <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value as Filters["status"])} className="h-8 w-[150px] text-[12px]" aria-label="Filter by status">
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as InquiryStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </Select>
        <Select value={filters.source} onChange={(e) => setFilter("source", e.target.value as Filters["source"])} className="h-8 w-[150px] text-[12px]" aria-label="Filter by source">
          <option value="">All sources</option>
          {(Object.keys(SOURCE_LABEL) as InquirySource[]).map((s) => (
            <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
          ))}
        </Select>
        <Select value={filters.assigned_to} onChange={(e) => setFilter("assigned_to", e.target.value)} className="h-8 w-[150px] text-[12px]" aria-label="Filter by assigned team member">
          <option value="">Anyone</option>
          <option value="__unassigned__">Unassigned</option>
          {team.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
        <Select value={filters.priority} onChange={(e) => setFilter("priority", e.target.value as Filters["priority"])} className="h-8 w-[120px] text-[12px]" aria-label="Filter by priority">
          <option value="">Any priority</option>
          {(Object.keys(PRIORITY_LABEL) as InquiryPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
          ))}
        </Select>
        <label className="flex items-center gap-1 text-[11px] text-admin-ink-subtle">
          From
          <Input type="date" value={filters.date_from} max={filters.date_to || undefined} onChange={(e) => setFilter("date_from", e.target.value)} className="h-8 w-[132px] text-[12px]" aria-label="From date" />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-admin-ink-subtle">
          To
          <Input type="date" value={filters.date_to} min={filters.date_from || undefined} onChange={(e) => setFilter("date_to", e.target.value)} className="h-8 w-[132px] text-[12px]" aria-label="To date" />
        </label>
        <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)} className="h-8 w-[160px] text-[12px]" aria-label="Sort inquiries">
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        {filtersActive ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-3.5" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      <AdminDataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.inquiry_id}
        loading={loading && !data}
        emptyTitle={filtersActive ? "No inquiries match these filters" : "No inquiries yet"}
        emptyDescription={
          filtersActive
            ? "Try clearing a filter or searching for something else."
            : "Customer inquiries from the website will appear here."
        }
        onRowClick={(r) => open(r)}
        className={loading && data ? "opacity-60 transition-opacity" : undefined}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-admin-ink-muted">
        <p aria-live="polite">
          {total === 0 ? "0 inquiries" : `${from}–${to} of ${total} inquiries`}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1">
            Rows
            <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }} className="h-7 w-[64px] text-[12px]" aria-label="Rows per page">
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </label>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
            <ChevronLeft className="size-3.5" aria-hidden />
          </Button>
          <span className="tabular-nums">Page {page} of {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {openId ? (
        <AdminInquiryDrawer
          inquiryId={openId}
          team={team}
          onClose={close}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      ) : null}
    </div>
  );
}
