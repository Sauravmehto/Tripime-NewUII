"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { updateAdminWebsiteDestinations } from "@/lib/api/admin";
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
import type { WebsiteDestination } from "@/types";

const EMPTY: Omit<WebsiteDestination, "id"> = { imageUrl: "", city: "", status: "Active" };

export function AdminWebsiteDestinationsView() {
  const list = useAdminCmsList(
    (cms) => cms.destinations.items,
    (items) => updateAdminWebsiteDestinations({ items }),
    (cms) => cms.destinations.items,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteDestination | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteDestination | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
  }

  function openEdit(row: WebsiteDestination) {
    setEditing(row);
    setForm({ imageUrl: row.imageUrl, city: row.city, status: row.status });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: WebsiteDestination = {
      id: editing?.id ?? cmsId("dest"),
      imageUrl: form.imageUrl.trim(),
      city: form.city.trim(),
      status: form.status === "Inactive" ? "Inactive" : "Active",
    };
    const next = editing
      ? list.items.map((row) => (row.id === editing.id ? payload : row))
      : [...list.items, payload];
    const ok = await list.persist(next, editing ? "Destination updated" : "Destination added");
    if (ok) setModalOpen(false);
  }

  const columns: AdminTableColumn<WebsiteDestination>[] = [
    {
      key: "index",
      header: "#",
      render: (row) => list.items.findIndex((item) => item.id === row.id) + 1,
    },
    { key: "image", header: "Image", render: (row) => <AdminThumb src={row.imageUrl} /> },
    { key: "city", header: "City", render: (row) => row.city },
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
      header: "Active",
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
        title="Popular Destinations"
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
        title={editing ? "Edit destination" : "Add destination"}
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Field label="City">
            <Input
              required
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            />
          </Field>
          <Field label="Image URL">
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete destination?">
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Permanently delete <strong className="text-admin-ink">{deleteTarget.city}</strong>?
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
                    "Destination deleted",
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
