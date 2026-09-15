"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createAdminPackage,
  deleteAdminPackage,
  listAdminPackageThemes,
  listAdminPackages,
  updateAdminPackage,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatINR } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminItineraryEditor } from "./admin-itinerary-editor";
import {
  AdminDataTable,
  AdminErrorState,
  AdminLoading,
  AdminRowMenu,
  AdminRowMenuStop,
  AdminStatusBadge,
  type AdminTableColumn,
} from "./ui";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type {
  PackageCatalog,
  PackageCategory,
  PackageInput,
  PackageTheme,
  TravelPackage,
} from "@/types";

const CATEGORIES: { id: PackageCategory; label: string }[] = [
  { id: "domestic", label: "Domestic" },
  { id: "international", label: "International" },
  { id: "offer", label: "Offer" },
  { id: "upcoming_event", label: "Upcoming event" },
];

function emptyForm(catalog: PackageCatalog): PackageInput {
  return {
    title: "",
    tagline: "",
    destination: "",
    category: "domestic",
    catalog,
    themeId: null,
    duration: "",
    stays: "",
    guests: "2 Adults",
    highlights: [],
    itinerary: [],
    price: 0,
    priceNote: "per person",
    negotiable: true,
    imageUrl: "",
    pdfUrl: "",
    eventDate: null,
    featured: false,
    sortOrder: 0,
    active: true,
  };
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToLines(list: string[]): string {
  return list.join("\n");
}

export function AdminPackagesView({ catalog }: { catalog: PackageCatalog }) {
  const handleAuthError = useAdminAuthError();
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [themes, setThemes] = useState<PackageTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TravelPackage | null>(null);
  const [editing, setEditing] = useState<TravelPackage | null>(null);
  const [form, setForm] = useState<PackageInput>(() => emptyForm(catalog));
  const [highlightsText, setHighlightsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const heading = catalog === "flyshop" ? "Flyshop packages" : "Package itinerary";
  const themeName = (themeId: string | null) => themes.find((t) => t.id === themeId)?.name;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [data, themeList] = await Promise.all([
        listAdminPackages(catalog),
        listAdminPackageThemes(),
      ]);
      setPackages(data);
      setThemes(themeList);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch triggered by catalog change, not a render-time state sync
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(catalog));
    setHighlightsText("");
    setModalOpen(true);
  }

  function openEdit(pkg: TravelPackage) {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = pkg;
    void _id;
    void _c;
    void _u;
    setEditing(pkg);
    setForm(rest);
    setHighlightsText(listToLines(pkg.highlights));
    setModalOpen(true);
  }

  function patchForm(patch: Partial<PackageInput>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: PackageInput = {
      ...form,
      catalog,
      themeId: form.themeId || null,
      highlights: linesToList(highlightsText),
      itinerary: form.itinerary.map((day) => day.trim()).filter(Boolean),
      eventDate: form.eventDate?.trim() || null,
      price: Number(form.price) || 0,
      sortOrder: Number(form.sortOrder) || 0,
    };

    if (payload.category === "upcoming_event" && !payload.eventDate) {
      setError("Upcoming event packages need an event date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editing) {
        const updated = await updateAdminPackage(editing.id, payload);
        setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setNotice("Package updated");
      } else {
        const created = await createAdminPackage(payload);
        setPackages((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
        setNotice("Package created");
      }
      setModalOpen(false);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(pkg: TravelPackage) {
    const { id, createdAt, updatedAt, ...rest } = pkg;
    void createdAt;
    void updatedAt;
    try {
      const updated = await updateAdminPackage(id, { ...rest, active: !pkg.active });
      setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminPackage(deleteTarget.id);
      setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setNotice("Package deleted");
      setDeleteTarget(null);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminTableColumn<TravelPackage>[] = [
    {
      key: "package",
      header: "Package",
      render: (pkg) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-admin-ink">{pkg.title}</p>
          <p className="truncate text-[11px] text-admin-ink-subtle">
            {pkg.destination} · {pkg.duration}
            {themeName(pkg.themeId) ? ` · ${themeName(pkg.themeId)}` : ""}
            {pkg.itinerary.length ? ` · ${pkg.itinerary.length} days` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      hideOnMobile: true,
      render: (pkg) => (
        <AdminStatusBadge>{pkg.category.replace("_", " ")}</AdminStatusBadge>
      ),
    },
    {
      key: "price",
      header: "Price",
      className: "w-[110px]",
      render: (pkg) => <span className="font-medium tabular-nums">{formatINR(pkg.price)}</span>,
    },
    {
      key: "status",
      header: "Status",
      className: "w-[130px]",
      render: (pkg) => (
        <div className="flex flex-wrap gap-1">
          <AdminStatusBadge tone={pkg.active ? "success" : "neutral"}>
            {pkg.active ? "Active" : "Inactive"}
          </AdminStatusBadge>
          {pkg.featured ? <AdminStatusBadge tone="accent">Featured</AdminStatusBadge> : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10 text-right",
      render: (pkg) => (
        <AdminRowMenuStop>
          <AdminRowMenu
            items={[
              { label: "Edit", icon: Pencil, onClick: () => openEdit(pkg) },
              {
                label: pkg.active ? "Hide" : "Show",
                icon: pkg.active ? EyeOff : Eye,
                onClick: () => void handleToggleActive(pkg),
              },
              {
                label: "Delete",
                icon: Trash2,
                danger: true,
                onClick: () => setDeleteTarget(pkg),
              },
            ]}
          />
        </AdminRowMenuStop>
      ),
    },
  ];

  if (loading) return <AdminLoading rows={8} />;

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title={heading}
        description="Compact package list. Open a row to edit the day-by-day timeline."
        action={
          <Button size="sm" variant="admin" onClick={openCreate}>
            <Plus className="size-3.5" />
            New package
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
        rows={packages}
        rowKey={(pkg) => pkg.id}
        emptyTitle="No packages yet"
        emptyDescription="Create one to start building itineraries."
        onRowClick={openEdit}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit package" : "New package"}
        className="sm:max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-admin-ink-subtle">
              Basics
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label="Title" className="sm:col-span-2">
                <Input
                  required
                  value={form.title}
                  onChange={(e) => patchForm({ title: e.target.value })}
                />
              </Field>
              <Field label="Tagline" className="sm:col-span-2">
                <Input
                  value={form.tagline}
                  onChange={(e) => patchForm({ tagline: e.target.value })}
                />
              </Field>
              <Field label="Destination">
                <Input
                  required
                  value={form.destination}
                  onChange={(e) => patchForm({ destination: e.target.value })}
                />
              </Field>
              <Field label="Category">
                <Select
                  value={form.category}
                  onChange={(e) => patchForm({ category: e.target.value as PackageCategory })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Theme">
                <Select
                  value={form.themeId ?? ""}
                  onChange={(e) => patchForm({ themeId: e.target.value || null })}
                >
                  <option value="">None</option>
                  {themes
                    .filter((t) => t.active || t.id === form.themeId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Duration">
                <Input
                  required
                  placeholder="5N / 6D"
                  value={form.duration}
                  onChange={(e) => patchForm({ duration: e.target.value })}
                />
              </Field>
              <Field label="Stays">
                <Input value={form.stays} onChange={(e) => patchForm({ stays: e.target.value })} />
              </Field>
              <Field label="Guests">
                <Input value={form.guests} onChange={(e) => patchForm({ guests: e.target.value })} />
              </Field>
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-admin-ink-subtle">
              Pricing and media
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label="Price (INR)">
                <Input
                  type="number"
                  min={0}
                  required
                  value={form.price}
                  onChange={(e) => patchForm({ price: Number(e.target.value) })}
                />
              </Field>
              <Field label="Price note">
                <Input
                  value={form.priceNote}
                  onChange={(e) => patchForm({ priceNote: e.target.value })}
                />
              </Field>
              <Field label="Sort order">
                <Input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => patchForm({ sortOrder: Number(e.target.value) })}
                />
              </Field>
              <Field label="Image URL" className="sm:col-span-2">
                <Input
                  value={form.imageUrl}
                  onChange={(e) => patchForm({ imageUrl: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="PDF URL" className="sm:col-span-2">
                <Input value={form.pdfUrl} onChange={(e) => patchForm({ pdfUrl: e.target.value })} />
              </Field>
              {form.category === "upcoming_event" && (
                <Field label="Event date" className="sm:col-span-2">
                  <Input
                    type="date"
                    value={form.eventDate ?? ""}
                    onChange={(e) => patchForm({ eventDate: e.target.value || null })}
                  />
                </Field>
              )}
              <Field label="Highlights (one per line)" className="sm:col-span-2">
                <Textarea
                  rows={3}
                  value={highlightsText}
                  onChange={(e) => setHighlightsText(e.target.value)}
                />
              </Field>
              <label className="flex items-center gap-2 text-[12px] font-medium text-admin-ink">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => patchForm({ featured: e.target.checked })}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-[12px] font-medium text-admin-ink">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => patchForm({ active: e.target.checked })}
                />
                Active (visible on site)
              </label>
              <label className="flex items-center gap-2 text-[12px] font-medium text-admin-ink sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.negotiable}
                  onChange={(e) => patchForm({ negotiable: e.target.checked })}
                />
                Price negotiable
              </label>
            </div>
          </section>

          <section>
            <AdminItineraryEditor
              days={form.itinerary}
              onChange={(itinerary) => patchForm({ itinerary })}
            />
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="admin" size="sm" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete package?"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-[13px] text-admin-ink-muted">
              Permanently delete <strong className="text-admin-ink">{deleteTarget.title}</strong>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
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
