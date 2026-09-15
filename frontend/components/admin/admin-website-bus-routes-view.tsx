"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { updateAdminWebsiteBusRoutes } from "@/lib/api/admin";
import { cmsId, useAdminCmsList } from "@/lib/admin/use-admin-cms-list";
import { AdminDataTable, type AdminTableColumn } from "./ui/admin-data-table";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminRowActions } from "./ui/admin-row-actions";
import { AdminSection } from "./ui/admin-section";
import { AdminStatusBadge } from "./ui/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { WebsiteBusRoute } from "@/types";

const EMPTY: Omit<WebsiteBusRoute, "id"> = { fromCity: "", toCity: "", status: "Active" };

export function AdminWebsiteBusRoutesView() {
  const list = useAdminCmsList(
    (cms) => cms.busRoutes?.items ?? [],
    (items) => updateAdminWebsiteBusRoutes({ items }),
    (cms) => cms.busRoutes.items,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteBusRoute | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteBusRoute | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
  }

  function openEdit(row: WebsiteBusRoute) {
    setEditing(row);
    setForm({ fromCity: row.fromCity, toCity: row.toCity, status: row.status });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: WebsiteBusRoute = {
      id: editing?.id ?? cmsId("bus"),
      fromCity: form.fromCity.trim(),
      toCity: form.toCity.trim(),
      status: form.status === "Inactive" ? "Inactive" : "Active",
    };
    const next = editing
      ? list.items.map((row) => (row.id === editing.id ? payload : row))
      : [...list.items, payload];
    const ok = await list.persist(next, editing ? "Bus route updated" : "Bus route added");
    if (ok) setModalOpen(false);
  }

  const columns: AdminTableColumn<WebsiteBusRoute>[] = [
    {
      key: "index",
      header: "#",
      render: (row) => list.items.findIndex((item) => item.id === row.id) + 1,
    },
    { key: "from", header: "From City", render: (row) => row.fromCity },
    { key: "to", header: "To City", render: (row) => row.toCity },
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
        title="Top Bus Routes"
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit bus route" : "Add bus route"}>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Field label="From city">
            <Input
              required
              value={form.fromCity}
              onChange={(e) => setForm((prev) => ({ ...prev, fromCity: e.target.value }))}
            />
          </Field>
          <Field label="To city">
            <Input
              required
              value={form.toCity}
              onChange={(e) => setForm((prev) => ({ ...prev, toCity: e.target.value }))}
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete bus route?">
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Remove {deleteTarget.fromCity} → {deleteTarget.toCity}?
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
                    "Bus route deleted",
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
