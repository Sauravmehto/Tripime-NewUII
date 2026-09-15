"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { updateAdminWebsiteWhy } from "@/lib/api/admin";
import { cmsId, useAdminCmsList } from "@/lib/admin/use-admin-cms-list";
import { AdminDataTable, type AdminTableColumn } from "./ui/admin-data-table";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminRowActions, AdminThumb } from "./ui/admin-row-actions";
import { AdminSection } from "./ui/admin-section";
import { AdminStatusBadge } from "./ui/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { WebsiteWhyItem } from "@/types";

const EMPTY: Omit<WebsiteWhyItem, "id"> = {
  iconUrl: "",
  heading: "",
  category: "Flight",
  contents: "",
  status: "Active",
};

export function AdminWebsiteWhyView() {
  const list = useAdminCmsList(
    (cms) => cms.why.items,
    (items) => updateAdminWebsiteWhy({ items }),
    (cms) => cms.why.items,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteWhyItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteWhyItem | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
  }

  function openEdit(row: WebsiteWhyItem) {
    setEditing(row);
    setForm({
      iconUrl: row.iconUrl,
      heading: row.heading,
      category: row.category,
      contents: row.contents,
      status: row.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: WebsiteWhyItem = {
      id: editing?.id ?? cmsId("why"),
      iconUrl: form.iconUrl.trim(),
      heading: form.heading.trim(),
      category: form.category,
      contents: form.contents.trim(),
      status: form.status === "Inactive" ? "Inactive" : "Active",
    };
    const next = editing
      ? list.items.map((row) => (row.id === editing.id ? payload : row))
      : [...list.items, payload];
    const ok = await list.persist(next, editing ? "Updated" : "Added");
    if (ok) setModalOpen(false);
  }

  const columns: AdminTableColumn<WebsiteWhyItem>[] = [
    {
      key: "index",
      header: "#",
      render: (row) => list.items.findIndex((item) => item.id === row.id) + 1,
    },
    { key: "icon", header: "Icon", render: (row) => <AdminThumb src={row.iconUrl} /> },
    { key: "heading", header: "Heading", render: (row) => row.heading },
    { key: "category", header: "Category", render: (row) => row.category },
    {
      key: "contents",
      header: "Contents",
      render: (row) => <p className="line-clamp-2 text-[12px] text-admin-ink-muted">{row.contents}</p>,
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
        title="Why With Us"
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit item" : "Add item"} className="sm:max-w-lg">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Field label="Heading">
            <Input
              required
              value={form.heading}
              onChange={(e) => setForm((prev) => ({ ...prev, heading: e.target.value }))}
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            >
              {["Flight", "Hotel", "Bus", "Holiday"].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Icon URL">
            <Input
              value={form.iconUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, iconUrl: e.target.value }))}
              placeholder="https://"
            />
          </Field>
          <Field label="Contents">
            <Textarea
              rows={3}
              value={form.contents}
              onChange={(e) => setForm((prev) => ({ ...prev, contents: e.target.value }))}
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete item?">
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Permanently delete <strong className="text-admin-ink">{deleteTarget.heading}</strong>?
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
                    "Deleted",
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
