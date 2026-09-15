"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getAdminThemes, updateAdminThemes } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminEmptyState } from "./ui/admin-empty-state";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminSection } from "./ui/admin-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import type { CustomTheme, CustomThemeKind } from "@/types";

const EMPTY_FORM = {
  name: "",
  previewUrl: "",
  active: true,
};

function newId(kind: CustomThemeKind) {
  return `theme_${kind.slice(0, 4)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

function nextName(items: CustomTheme[], kind: CustomThemeKind) {
  const prefix = kind === "desktop" ? "Desktop" : "Mobile";
  const used = items
    .filter((item) => item.kind === kind)
    .map((item) => {
      const match = item.name.match(new RegExp(`^${prefix}\\s+(\\d+)$`, "i"));
      return match ? Number(match[1]) : 0;
    });
  return `${prefix} ${Math.max(0, ...used) + 1}`;
}

export function AdminThemesView() {
  const handleAuthError = useAdminAuthError();
  const [items, setItems] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<CustomThemeKind>("desktop");
  const [editing, setEditing] = useState<CustomTheme | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [removeKind, setRemoveKind] = useState<CustomThemeKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminThemes();
        if (cancelled) return;
        setItems(data);
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

  const desktop = useMemo(() => items.filter((item) => item.kind === "desktop"), [items]);
  const mobile = useMemo(() => items.filter((item) => item.kind === "mobile"), [items]);

  async function persist(next: CustomTheme[], message: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminThemes(next);
      setItems(updated);
      setNotice(message);
      setModalOpen(false);
      setRemoveKind(null);
      return true;
    } catch (err) {
      if (handleAuthError(err)) return false;
      setError(getErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openAdd(kind: CustomThemeKind) {
    setEditing(null);
    setModalKind(kind);
    setForm({ name: nextName(items, kind), previewUrl: "", active: true });
    setModalOpen(true);
    setError("");
  }

  function openEdit(item: CustomTheme) {
    setEditing(item);
    setModalKind(item.kind);
    setForm({ name: item.name, previewUrl: item.previewUrl, active: item.active });
    setModalOpen(true);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    const payload: CustomTheme = {
      id: editing?.id ?? newId(modalKind),
      kind: editing?.kind ?? modalKind,
      name: form.name.trim(),
      previewUrl: form.previewUrl.trim(),
      active: form.active,
      selected: editing?.selected ?? false,
    };
    const next = editing
      ? items.map((item) => (item.id === editing.id ? payload : item))
      : [...items, payload];
    await persist(next, editing ? "Theme updated" : "Theme added");
  }

  function selectTheme(id: string, kind: CustomThemeKind) {
    void persist(
      items.map((item) =>
        item.kind === kind ? { ...item, selected: item.id === id } : item,
      ),
      "Theme selected",
    );
  }

  function toggleActive(id: string) {
    void persist(
      items.map((item) => (item.id === id ? { ...item, active: !item.active } : item)),
      "Theme status updated",
    );
  }

  function clearSelected() {
    void persist(
      items.map((item) => ({ ...item, selected: false })),
      "Selection cleared",
    );
  }

  if (loading) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={6} />;
  }

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Custom Themes"
        action={
          <>
            <Button
              size="sm"
              className="bg-danger-500 hover:bg-danger-700"
              onClick={clearSelected}
              disabled={saving || !items.some((item) => item.selected)}
            >
              CLR
            </Button>
            <Button size="sm" variant="admin" onClick={() => openAdd("desktop")}>
              Add Desktop
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAdd("mobile")}>
              Add Mobile
            </Button>
          </>
        }
      />
      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      <ThemeKindSection
        title="Desktop Themes"
        kind="desktop"
        items={desktop}
        saving={saving}
        onSelect={selectTheme}
        onToggleActive={toggleActive}
        onEdit={openEdit}
        onRemove={() => setRemoveKind("desktop")}
      />
      <ThemeKindSection
        title="Mobile Themes"
        kind="mobile"
        items={mobile}
        saving={saving}
        onSelect={selectTheme}
        onToggleActive={toggleActive}
        onEdit={openEdit}
        onRemove={() => setRemoveKind("mobile")}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit theme" : `Add ${modalKind} theme`}
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
          <Field label="Preview image URL" hint="Paste a public image URL.">
            <Input
              value={form.previewUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, previewUrl: e.target.value }))}
              placeholder="https://"
            />
          </Field>
          {form.previewUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.previewUrl} alt="" className="h-28 w-full rounded-md object-cover" />
          ) : null}
          <label className="flex items-center gap-2 text-[12px] font-medium text-admin-ink">
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
            <Button type="submit" variant="admin" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(removeKind)}
        onClose={() => setRemoveKind(null)}
        title="Remove selected theme?"
      >
        {removeKind ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Remove the selected {removeKind} theme? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoveKind(null)}>
                Cancel
              </Button>
              <Button
                className="bg-danger-500 hover:bg-danger-700"
                disabled={saving}
                onClick={() => {
                  const selected = items.find(
                    (item) => item.kind === removeKind && item.selected,
                  );
                  if (!selected) {
                    setError(`Select a ${removeKind} theme first.`);
                    setRemoveKind(null);
                    return;
                  }
                  void persist(
                    items.filter((item) => item.id !== selected.id),
                    "Theme removed",
                  );
                }}
              >
                {saving ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function ThemeKindSection({
  title,
  kind,
  items,
  saving,
  onSelect,
  onToggleActive,
  onEdit,
  onRemove,
}: {
  title: string;
  kind: CustomThemeKind;
  items: CustomTheme[];
  saving: boolean;
  onSelect: (id: string, kind: CustomThemeKind) => void;
  onToggleActive: (id: string) => void;
  onEdit: (item: CustomTheme) => void;
  onRemove: () => void;
}) {
  const selected = items.find((item) => item.selected);

  return (
    <AdminSection
      title={title}
      action={
        <div className="flex items-center gap-1.5">
          {kind === "desktop" || selected ? (
            <Button
              size="xs"
              className="bg-danger-500 hover:bg-danger-700"
              disabled={saving || !selected}
              onClick={onRemove}
            >
              Remove
            </Button>
          ) : null}
          <Select
            className="h-7 w-[140px] rounded-md px-2 text-[11px]"
            value={selected?.id ?? ""}
            onChange={(e) => {
              if (e.target.value) onSelect(e.target.value, kind);
            }}
          >
            <option value="">Select.</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      {items.length === 0 ? (
        <AdminEmptyState
          title={`No ${kind} themes`}
          description={`Use Add ${kind === "desktop" ? "Desktop" : "Mobile"} to create one.`}
        />
      ) : (
        <div className="flex flex-wrap gap-4">
          {items.map((item) => (
            <article key={item.id} className="w-[168px]">
              <button
                type="button"
                onClick={() => onSelect(item.id, kind)}
                className={cn(
                  "block w-full overflow-hidden rounded-md border bg-white",
                  item.selected ? "border-amber-400" : "border-admin-border",
                )}
              >
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center bg-admin-muted text-[11px] text-admin-ink-subtle">
                    No preview
                  </div>
                )}
              </button>
              <p className="mt-1.5 text-center text-[12px] font-semibold text-admin-ink">
                {item.name}
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleActive(item.id)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    item.active
                      ? "bg-success-50 text-success-700"
                      : "bg-admin-muted text-admin-ink-muted",
                  )}
                >
                  {item.active ? "Active" : "Inactive"}
                </button>
                {item.selected ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Selected
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800"
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminSection>
  );
}
