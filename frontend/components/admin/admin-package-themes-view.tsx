"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createAdminPackageTheme,
  deleteAdminPackageTheme,
  listAdminPackageThemes,
  updateAdminPackageTheme,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { Badge, Card, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { PackageTheme, PackageThemeInput } from "@/types";

const EMPTY: PackageThemeInput = { name: "", active: true, sortOrder: 0 };

export function AdminPackageThemesView() {
  const handleAuthError = useAdminAuthError();
  const [themes, setThemes] = useState<PackageTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PackageTheme | null>(null);
  const [form, setForm] = useState<PackageThemeInput>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<PackageTheme | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listAdminPackageThemes();
      setThemes(data);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch, not a render-time state sync
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, sortOrder: themes.length + 1 });
    setModalOpen(true);
  }

  function openEdit(theme: PackageTheme) {
    setEditing(theme);
    setForm({ name: theme.name, active: theme.active, sortOrder: theme.sortOrder });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Theme name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: PackageThemeInput = {
        name: form.name.trim(),
        active: form.active,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        const updated = await updateAdminPackageTheme(editing.id, payload);
        setThemes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setNotice("Theme updated");
      } else {
        const created = await createAdminPackageTheme(payload);
        setThemes((prev) =>
          [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder),
        );
        setNotice("Theme created");
      }
      setModalOpen(false);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminPackageTheme(deleteTarget.id);
      setThemes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setNotice("Theme deleted");
      setDeleteTarget(null);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Package Theme"
        action={
          <Button size="sm" variant="admin" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add Package Theme
          </Button>
        }
      />

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
          {notice}
        </p>
      )}

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] uppercase tracking-wide text-ink-subtle">
            <tr>
              <th className="px-3 py-2.5 font-semibold">#</th>
              <th className="px-3 py-2.5 font-semibold">Name</th>
              <th className="px-3 py-2.5 font-semibold">Created At</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {themes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-ink-muted">
                  No package themes yet.
                </td>
              </tr>
            ) : (
              themes.map((theme, index) => (
                <tr key={theme.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2.5 font-semibold text-amber-600">{index + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-ink">{theme.name}</td>
                  <td className="px-3 py-2.5 text-ink-muted">
                    {formatDateTime(theme.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={theme.active ? "success" : "neutral"}>
                      {theme.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(theme)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger-700"
                        onClick={() => setDeleteTarget(theme)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit package theme" : "Add package theme"}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </Field>
          <Field label="Sort order">
            <Input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Active
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete theme?"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Permanently delete <strong className="text-ink">{deleteTarget.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                className="bg-danger-500 hover:bg-danger-700"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
