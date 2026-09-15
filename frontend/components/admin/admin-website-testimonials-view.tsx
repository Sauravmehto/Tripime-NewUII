"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getAdminWebsite, updateAdminWebsiteTestimonials } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminDataTable, type AdminTableColumn } from "./ui/admin-data-table";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminRowMenuStop } from "./ui/admin-row-menu";
import { AdminStatusBadge } from "./ui/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { WebsiteTestimonialItem } from "@/types";

const EMPTY: Omit<WebsiteTestimonialItem, "id"> = {
  imageUrl: "",
  name: "",
  rating: 5,
  content: "",
  status: "Active",
};

function newId() {
  return `tst_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function AdminWebsiteTestimonialsView() {
  const handleAuthError = useAdminAuthError();
  const [items, setItems] = useState<WebsiteTestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteTestimonialItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteTestimonialItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminWebsite();
        if (cancelled) return;
        setItems(data.testimonials.items);
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

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
    setError("");
  }

  function openEdit(row: WebsiteTestimonialItem) {
    setEditing(row);
    setForm({
      imageUrl: row.imageUrl,
      name: row.name,
      rating: row.rating,
      content: row.content,
      status: row.status,
    });
    setModalOpen(true);
    setError("");
  }

  async function persist(next: WebsiteTestimonialItem[], message: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminWebsiteTestimonials({ items: next });
      setItems(updated.testimonials.items);
      setNotice(message);
      setModalOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) {
      setError("Name and contents are required.");
      return;
    }
    const payload: WebsiteTestimonialItem = {
      id: editing?.id ?? newId(),
      imageUrl: form.imageUrl.trim(),
      name: form.name.trim(),
      rating: Math.min(5, Math.max(1, Number(form.rating) || 5)),
      content: form.content.trim(),
      status: form.status === "Inactive" ? "Inactive" : "Active",
    };
    const next = editing
      ? items.map((row) => (row.id === editing.id ? payload : row))
      : [...items, payload];
    await persist(next, editing ? "Testimonial updated" : "Testimonial added");
  }

  const columns: AdminTableColumn<WebsiteTestimonialItem>[] = [
    {
      key: "index",
      header: "#",
      className: "w-10",
      render: (row) => items.findIndex((item) => item.id === row.id) + 1,
    },
    {
      key: "image",
      header: "Image",
      render: (row) =>
        row.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.imageUrl} alt="" className="size-10 rounded object-cover" />
        ) : (
          <span className="text-admin-ink-subtle">—</span>
        ),
    },
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      render: (row) => row.rating,
    },
    {
      key: "content",
      header: "Contents",
      className: "max-w-[420px]",
      render: (row) => (
        <p className="line-clamp-3 text-[12px] text-admin-ink-muted">{row.content}</p>
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
        <AdminRowMenuStop>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => openEdit(row)}>
              <Pencil className="size-3" />
              Edit
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="text-danger-700"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="size-3" />
              Delete
            </Button>
          </div>
        </AdminRowMenuStop>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Testimonials"
        description="Customer quotes shown on the public site later."
        action={
          <Button size="sm" variant="admin" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add New
          </Button>
        }
      />
      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={items}
        rowKey={(row) => row.id}
        loading={loading}
        emptyTitle="No Data Found."
        emptyDescription="Add a testimonial with name, rating, and contents."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit testimonial" : "Add testimonial"}
        className="sm:max-w-lg"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Field label="Name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Rating">
              <Select
                value={String(form.rating)}
                onChange={(e) => setForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
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
          </div>
          <Field label="Image URL">
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://"
            />
          </Field>
          <Field label="Contents">
            <Textarea
              required
              rows={4}
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="admin" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete testimonial?"
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Permanently delete <strong className="text-admin-ink">{deleteTarget.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                className="bg-danger-500 hover:bg-danger-700"
                disabled={saving}
                onClick={() =>
                  void persist(
                    items.filter((row) => row.id !== deleteTarget.id),
                    "Testimonial deleted",
                  )
                }
              >
                {saving ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
