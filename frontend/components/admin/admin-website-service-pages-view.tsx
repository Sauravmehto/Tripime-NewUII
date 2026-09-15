"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getAdminWebsite, updateAdminWebsiteServicePages } from "@/lib/api/admin";
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
import type { WebsiteCms, WebsiteServicePage } from "@/types";

const EMPTY: Omit<WebsiteServicePage, "id"> = {
  title: "",
  link: "",
  status: "Active",
  metaTitle: "",
  metaKeywords: "",
  metaDescription: "",
  content: "",
};

function newId() {
  return `svc_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function AdminWebsiteServicePagesView() {
  const handleAuthError = useAdminAuthError();
  const [cms, setCms] = useState<WebsiteCms | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteServicePage | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteServicePage | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminWebsite();
        if (cancelled) return;
        setCms(data);
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

  const pages = cms?.servicePages.pages ?? [];

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
    setError("");
  }

  function openEdit(page: WebsiteServicePage) {
    setEditing(page);
    setForm({
      title: page.title,
      link: page.link,
      status: page.status,
      metaTitle: page.metaTitle,
      metaKeywords: page.metaKeywords,
      metaDescription: page.metaDescription,
      content: page.content,
    });
    setModalOpen(true);
    setError("");
  }

  async function persist(nextPages: WebsiteServicePage[], message: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminWebsiteServicePages({ pages: nextPages });
      setCms(updated);
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
    if (!form.title.trim() || !form.link.trim()) {
      setError("Title and link are required.");
      return;
    }
    const payload: WebsiteServicePage = {
      id: editing?.id ?? newId(),
      title: form.title.trim(),
      link: form.link.trim(),
      status: form.status === "Inactive" ? "Inactive" : "Active",
      metaTitle: form.metaTitle.trim(),
      metaKeywords: form.metaKeywords.trim(),
      metaDescription: form.metaDescription.trim(),
      content: form.content,
    };
    const next = editing
      ? pages.map((page) => (page.id === editing.id ? payload : page))
      : [...pages, payload];
    await persist(next, editing ? "Service page updated" : "Service page added");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await persist(
      pages.filter((page) => page.id !== deleteTarget.id),
      "Service page deleted",
    );
  }

  const columns: AdminTableColumn<WebsiteServicePage>[] = [
    {
      key: "index",
      header: "#",
      className: "w-10",
      render: (row) => pages.findIndex((page) => page.id === row.id) + 1,
    },
    {
      key: "title",
      header: "Title",
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "link",
      header: "Link",
      render: (row) => <span className="font-mono text-[12px] text-admin-ink-muted">{row.link}</span>,
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
        title="Seo Service Pages"
        description="Landing pages and slugs used for B2C SEO routes."
        action={
          <Button size="sm" variant="admin" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add
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
        rows={pages}
        rowKey={(row) => row.id}
        loading={loading}
        emptyTitle="No Data Found."
        emptyDescription="Add a service page to manage its title, link, and status."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit service page" : "Add service page"}
        className="sm:max-w-lg"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Field label="Title">
            <Input
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </Field>
          <Field label="Link" hint="Path or slug, for example /holiday-india">
            <Input
              required
              value={form.link}
              onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
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
          <Field label="Meta title">
            <Input
              value={form.metaTitle}
              onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
            />
          </Field>
          <Field label="Meta keywords">
            <Input
              value={form.metaKeywords}
              onChange={(e) => setForm((prev) => ({ ...prev, metaKeywords: e.target.value }))}
            />
          </Field>
          <Field label="Meta description">
            <Textarea
              rows={2}
              value={form.metaDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
            />
          </Field>
          <Field label="Page content">
            <Textarea
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
        title="Delete service page?"
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Permanently delete <strong className="text-admin-ink">{deleteTarget.title}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                className="bg-danger-500 hover:bg-danger-700"
                disabled={saving}
                onClick={() => void handleDelete()}
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
