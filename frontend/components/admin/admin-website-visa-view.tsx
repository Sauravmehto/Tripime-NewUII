"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Stamp, Trash2 } from "lucide-react";
import { getAdminWebsite, updateAdminWebsiteVisa } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminDataTable, type AdminTableColumn } from "./ui/admin-data-table";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminRowMenuStop } from "./ui/admin-row-menu";
import { AdminSection } from "./ui/admin-section";
import { AdminStatusBadge } from "./ui/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { WebsiteVisaType } from "@/types";

const EMPTY: Omit<WebsiteVisaType, "id"> = {
  imageUrl: "",
  visaType: "",
  location: "",
  b2cPrice: 0,
  b2bPrice: 0,
  duration: "",
  status: "Active",
};

function newId() {
  return `visa_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminWebsiteVisaView() {
  const handleAuthError = useAdminAuthError();
  const [types, setTypes] = useState<WebsiteVisaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteVisaType | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteVisaType | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminWebsite();
        if (cancelled) return;
        setTypes(data.visa.types);
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

  function openEdit(row: WebsiteVisaType) {
    setEditing(row);
    setForm({
      imageUrl: row.imageUrl,
      visaType: row.visaType,
      location: row.location,
      b2cPrice: row.b2cPrice,
      b2bPrice: row.b2bPrice,
      duration: row.duration,
      status: row.status,
    });
    setModalOpen(true);
    setError("");
  }

  async function persist(next: WebsiteVisaType[], message: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminWebsiteVisa({ types: next });
      setTypes(updated.visa.types);
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
    if (!form.visaType.trim() || !form.location.trim()) {
      setError("Visa type and location are required.");
      return;
    }
    const payload: WebsiteVisaType = {
      id: editing?.id ?? newId(),
      imageUrl: form.imageUrl.trim(),
      visaType: form.visaType.trim(),
      location: form.location.trim(),
      b2cPrice: Number(form.b2cPrice) || 0,
      b2bPrice: Number(form.b2bPrice) || 0,
      duration: form.duration.trim(),
      status: form.status === "Inactive" ? "Inactive" : "Active",
    };
    const next = editing
      ? types.map((row) => (row.id === editing.id ? payload : row))
      : [...types, payload];
    await persist(next, editing ? "Visa type updated" : "Visa type added");
  }

  const columns: AdminTableColumn<WebsiteVisaType>[] = [
    {
      key: "index",
      header: "#",
      className: "w-10",
      render: (row) => types.findIndex((item) => item.id === row.id) + 1,
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
    { key: "visaType", header: "Visa Type", render: (row) => row.visaType },
    { key: "location", header: "Visa Location", render: (row) => row.location },
    { key: "b2c", header: "B2C Price", render: (row) => money(row.b2cPrice) },
    { key: "b2b", header: "B2B Price", render: (row) => money(row.b2bPrice) },
    { key: "duration", header: "Duration", render: (row) => row.duration || "—" },
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
      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      <AdminSection
        title="Visa Setting"
        icon={Stamp}
        action={
          <Button size="xs" variant="admin" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add Visa Type
          </Button>
        }
      >
        <div className="-m-3">
          <AdminDataTable
            columns={columns}
            rows={types}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle="No Data Found."
            emptyDescription="Add a visa type with image URL, prices, and duration."
            className="rounded-none border-0"
          />
        </div>
      </AdminSection>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit visa type" : "Add visa type"}
        className="sm:max-w-lg"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Visa type">
              <Input
                required
                value={form.visaType}
                onChange={(e) => setForm((prev) => ({ ...prev, visaType: e.target.value }))}
                placeholder="Tourist"
              />
            </Field>
            <Field label="Visa location">
              <Input
                required
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Dubai"
              />
            </Field>
            <Field label="B2C price (INR)">
              <Input
                type="number"
                min={0}
                value={form.b2cPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, b2cPrice: Number(e.target.value) }))}
              />
            </Field>
            <Field label="B2B price (INR)">
              <Input
                type="number"
                min={0}
                value={form.b2bPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, b2bPrice: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Duration">
              <Input
                value={form.duration}
                onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                placeholder="30 Days"
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
          </div>
          <Field label="Image URL">
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://"
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
        title="Delete visa type?"
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Permanently delete <strong className="text-admin-ink">{deleteTarget.visaType}</strong>?
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
                    types.filter((row) => row.id !== deleteTarget.id),
                    "Visa type deleted",
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
