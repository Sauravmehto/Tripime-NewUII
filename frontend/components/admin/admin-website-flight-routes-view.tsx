"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { updateAdminWebsiteFlightRoutes } from "@/lib/api/admin";
import { cmsId, useAdminCmsList } from "@/lib/admin/use-admin-cms-list";
import { AdminDataTable, type AdminTableColumn } from "./ui/admin-data-table";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminRowActions, AdminThumb } from "./ui/admin-row-actions";
import { AdminSection } from "./ui/admin-section";
import { AdminStatusBadge } from "./ui/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { WebsiteFlightRoute } from "@/types";

const EMPTY: Omit<WebsiteFlightRoute, "id"> = {
  fromCity: "",
  fromCode: "",
  toCity: "",
  toCode: "",
  price: 0,
  airlineName: "",
  airlineLogoUrl: "",
  status: "Active",
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function AdminWebsiteFlightRoutesView() {
  const list = useAdminCmsList(
    (cms) => cms.flightRoutes.items,
    (items) => updateAdminWebsiteFlightRoutes({ items }),
    (cms) => cms.flightRoutes.items,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteFlightRoute | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteFlightRoute | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
  }

  function openEdit(row: WebsiteFlightRoute) {
    setEditing(row);
    setForm({
      fromCity: row.fromCity,
      fromCode: row.fromCode,
      toCity: row.toCity,
      toCode: row.toCode,
      price: row.price,
      airlineName: row.airlineName,
      airlineLogoUrl: row.airlineLogoUrl,
      status: row.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: WebsiteFlightRoute = {
      id: editing?.id ?? cmsId("rt"),
      fromCity: form.fromCity.trim(),
      fromCode: form.fromCode.trim().toUpperCase(),
      toCity: form.toCity.trim(),
      toCode: form.toCode.trim().toUpperCase(),
      price: Number(form.price) || 0,
      airlineName: form.airlineName.trim(),
      airlineLogoUrl: form.airlineLogoUrl.trim(),
      status: form.status === "Inactive" ? "Inactive" : "Active",
    };
    const next = editing
      ? list.items.map((row) => (row.id === editing.id ? payload : row))
      : [...list.items, payload];
    const ok = await list.persist(next, editing ? "Route updated" : "Route added");
    if (ok) setModalOpen(false);
  }

  const columns: AdminTableColumn<WebsiteFlightRoute>[] = [
    {
      key: "index",
      header: "#",
      render: (row) => list.items.findIndex((item) => item.id === row.id) + 1,
    },
    {
      key: "from",
      header: "Departure",
      render: (row) => `${row.fromCity.toUpperCase()} (${row.fromCode})`,
    },
    {
      key: "to",
      header: "Arrival",
      render: (row) => `${row.toCity} (${row.toCode})`,
    },
    { key: "price", header: "Price", render: (row) => money(row.price) },
    {
      key: "airline",
      header: "Airline",
      render: (row) =>
        row.airlineLogoUrl ? (
          <AdminThumb src={row.airlineLogoUrl} alt={row.airlineName} />
        ) : (
          <span className="text-[12px]">{row.airlineName || "—"}</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <AdminStatusBadge tone={row.status === "Active" ? "success" : "neutral"}>
          {row.status}
        </AdminStatusBadge>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <AdminRowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteTarget(row)} />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {list.error ? <AdminErrorState message={list.error} /> : null}
      {list.notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {list.notice}
        </p>
      ) : null}
      <AdminSection
        title="Top Flight Routes"
        action={
          <Button size="xs" variant="admin" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add New
          </Button>
        }
      >
        <div className="-m-3">
          <AdminDataTable
            columns={columns}
            rows={list.items}
            rowKey={(row) => row.id}
            loading={list.loading}
            emptyTitle="No Data Found."
            className="rounded-none border-0"
          />
        </div>
      </AdminSection>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit route" : "Add route"}
        className="sm:max-w-lg"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Departure city">
              <Input
                required
                value={form.fromCity}
                onChange={(e) => setForm((prev) => ({ ...prev, fromCity: e.target.value }))}
              />
            </Field>
            <Field label="Departure code">
              <Input
                required
                maxLength={8}
                value={form.fromCode}
                onChange={(e) => setForm((prev) => ({ ...prev, fromCode: e.target.value }))}
                placeholder="DEL"
              />
            </Field>
            <Field label="Arrival city">
              <Input
                required
                value={form.toCity}
                onChange={(e) => setForm((prev) => ({ ...prev, toCity: e.target.value }))}
              />
            </Field>
            <Field label="Arrival code">
              <Input
                required
                maxLength={8}
                value={form.toCode}
                onChange={(e) => setForm((prev) => ({ ...prev, toCode: e.target.value }))}
                placeholder="BOM"
              />
            </Field>
            <Field label="Price (INR)">
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Airline">
              <Input
                value={form.airlineName}
                onChange={(e) => setForm((prev) => ({ ...prev, airlineName: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Airline logo URL">
            <Input
              value={form.airlineLogoUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, airlineLogoUrl: e.target.value }))}
              placeholder="https://"
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="admin" disabled={list.saving}>
              {list.saving ? "Saving…" : editing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete route?">
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Remove {deleteTarget.fromCode} → {deleteTarget.toCode}?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                className="bg-danger-500 hover:bg-danger-700"
                disabled={list.saving}
                onClick={async () => {
                  const ok = await list.persist(
                    list.items.filter((row) => row.id !== deleteTarget.id),
                    "Route deleted",
                  );
                  if (ok) setDeleteTarget(null);
                }}
              >
                {list.saving ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
