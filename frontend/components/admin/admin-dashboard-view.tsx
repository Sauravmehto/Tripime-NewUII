"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock,
  IndianRupee,
  MessageSquare,
  Package,
  RefreshCw,
  Ticket,
} from "lucide-react";
import {
  getAdminStats,
  listAdminBookings,
  listAdminEnquiries,
  listAdminPackages,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatINR } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { Badge, Card, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AdminStats, Booking, Enquiry, TravelPackage } from "@/types";

function relativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: typeof Ticket;
  tone?: "primary" | "success" | "warning" | "accent";
}) {
  const tones = {
    primary: "bg-primary-50 text-primary-700",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-500",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <Card className="flex items-start gap-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-bold text-ink">{value}</p>
      </div>
    </Card>
  );
}

export function AdminDashboardView() {
  const handleAuthError = useAdminAuthError();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const [statsData, bookingsData, packagesData, enquiriesData] =
          await Promise.all([
            getAdminStats(),
            listAdminBookings(),
            listAdminPackages(),
            listAdminEnquiries(),
          ]);
        setStats(statsData);
        setBookings(bookingsData);
        setPackages(packagesData);
        setEnquiries(enquiriesData);
      } catch (err) {
        if (handleAuthError(err)) return;
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handleAuthError],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch, not a render-time state sync
    void load();
  }, [load]);

  const pendingBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "PROCESSING")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [bookings],
  );

  const activePackages = useMemo(
    () => packages.filter((p) => p.active).length,
    [packages],
  );
  const newEnquiries = useMemo(
    () => enquiries.filter((e) => e.status === "NEW").length,
    [enquiries],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Live bookings, packages, and enquiries
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total bookings" value={stats.totalBookings} icon={Ticket} />
          <StatCard
            label="Confirmed"
            value={stats.confirmedBookings}
            icon={CircleCheck}
            tone="success"
          />
          <StatCard
            label="Pending"
            value={stats.pendingBookings}
            icon={Clock}
            tone="warning"
          />
          <StatCard
            label="Today"
            value={stats.bookingsToday}
            icon={CalendarDays}
            tone="accent"
          />
          <StatCard
            label="Revenue"
            value={formatINR(stats.totalRevenue)}
            icon={IndianRupee}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin/bookings"
          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-xs transition hover:border-primary-200 hover:shadow-soft"
        >
          <div className="flex items-center gap-2.5">
            <Ticket className="size-4 text-primary-600" />
            <span className="text-sm font-semibold text-ink">Booking requests</span>
          </div>
          <ChevronRight className="size-4 text-ink-subtle" />
        </Link>
        <Link
          href="/admin/packages/itinerary"
          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-xs transition hover:border-primary-200 hover:shadow-soft"
        >
          <div className="flex items-center gap-2.5">
            <Package className="size-4 text-primary-600" />
            <div>
              <p className="text-sm font-semibold text-ink">Packages</p>
              <p className="text-[11px] text-ink-subtle">{activePackages} active</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-ink-subtle" />
        </Link>
        <Link
          href="/admin/enquiries"
          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-xs transition hover:border-primary-200 hover:shadow-soft"
        >
          <div className="flex items-center gap-2.5">
            <MessageSquare className="size-4 text-primary-600" />
            <div>
              <p className="text-sm font-semibold text-ink">Enquiries</p>
              <p className="text-[11px] text-ink-subtle">{newEnquiries} new</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-ink-subtle" />
        </Link>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Pending bookings</h2>
          <Link href="/admin/bookings" className="text-xs font-semibold text-primary-700">
            View all
          </Link>
        </div>
        {pendingBookings.length === 0 ? (
          <p className="text-sm text-ink-muted">No pending booking requests.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {pendingBookings.map((b) => (
              <li key={b.bookingId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {b.flight.origin.code} → {b.flight.destination.code}
                    <span className="ml-2 font-normal text-ink-subtle">· {b.pnr}</span>
                  </p>
                  <p className="text-[11px] text-ink-subtle">
                    {b.contact.email} · {relativeTime(b.createdAt)}
                  </p>
                </div>
                <Badge tone="warning">PROCESSING</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
