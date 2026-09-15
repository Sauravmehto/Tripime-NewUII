"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AppWindow,
  Building2,
  Bus,
  ImageIcon,
  Palmtree,
  Plane,
  Plus,
  Umbrella,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getAdminWebsite,
  updateAdminWebsiteBanners,
  updateAdminWebsiteDeals,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminCategoryTabs } from "./ui/admin-category-tabs";
import { AdminEmptyState } from "./ui/admin-empty-state";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminPromoCard } from "./ui/admin-promo-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { WebsiteBanners, WebsiteDeals, WebsitePromoItem } from "@/types";

const BANNER_TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "flight", label: "Flight", icon: Plane },
  { id: "hotel", label: "Hotel", icon: Building2 },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "holiday", label: "Holiday", icon: Palmtree },
  { id: "hotel-background", label: "Hotel Background", icon: ImageIcon },
  { id: "bus-background", label: "Bus Background", icon: Bus },
  { id: "holiday-background", label: "Holiday Background", icon: Umbrella },
];

const DEAL_TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "flight", label: "Flight", icon: Plane },
  { id: "hotel", label: "Hotel", icon: Building2 },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "holiday", label: "Holiday", icon: Palmtree },
  { id: "popup", label: "Popup", icon: AppWindow },
];

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function badgeLabel(category: string) {
  return (
    BANNER_TABS.concat(DEAL_TABS).find((tab) => tab.id === category)?.label ?? category
  );
}

export function AdminWebsiteBannersView() {
  return (
    <AdminWebsitePromoView
      kind="banners"
      title="Promotional Banner"
      description="Home and landing banners by product. Image URL only — no file upload."
      tabs={BANNER_TABS}
      showDelete={false}
    />
  );
}

export function AdminWebsiteDealsView() {
  return (
    <AdminWebsitePromoView
      kind="deals"
      title="Deals & Offers"
      description="Offer banners by product, plus homepage popup."
      tabs={DEAL_TABS}
      showDelete
    />
  );
}

function AdminWebsitePromoView({
  kind,
  title,
  description,
  tabs,
  showDelete,
}: {
  kind: "banners" | "deals";
  title: string;
  description: string;
  tabs: { id: string; label: string; icon: LucideIcon }[];
  showDelete: boolean;
}) {
  const handleAuthError = useAdminAuthError();
  const [items, setItems] = useState<WebsitePromoItem[]>([]);
  const [category, setCategory] = useState(tabs[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsitePromoItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebsitePromoItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    imageUrl: "",
    linkUrl: "",
    category: tabs[0].id,
    active: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminWebsite();
        if (cancelled) return;
        setItems(kind === "banners" ? data.banners.items : data.deals.items);
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
  }, [handleAuthError, kind]);

  const visible = useMemo(
    () => items.filter((item) => item.category === category),
    [category, items],
  );

  async function persist(next: WebsitePromoItem[], message: string) {
    setSaving(true);
    setError("");
    try {
      const payload: WebsiteBanners | WebsiteDeals = { items: next };
      const updated =
        kind === "banners"
          ? await updateAdminWebsiteBanners(payload)
          : await updateAdminWebsiteDeals(payload);
      setItems(kind === "banners" ? updated.banners.items : updated.deals.items);
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

  function openCreate() {
    setEditing(null);
    setForm({
      title: "",
      imageUrl: "",
      linkUrl: "",
      category,
      active: true,
    });
    setModalOpen(true);
    setError("");
  }

  function openEdit(item: WebsitePromoItem) {
    setEditing(item);
    setForm({
      title: item.title,
      imageUrl: item.imageUrl,
      linkUrl: item.linkUrl,
      category: item.category,
      active: item.active,
    });
    setModalOpen(true);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.imageUrl.trim()) {
      setError("Image URL is required.");
      return;
    }
    const payload: WebsitePromoItem = {
      id: editing?.id ?? newId(kind === "banners" ? "ban" : "deal"),
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      linkUrl: form.linkUrl.trim(),
      category: form.category,
      active: form.active,
    };
    const next = editing
      ? items.map((item) => (item.id === editing.id ? payload : item))
      : [...items, payload];
    await persist(next, editing ? "Updated" : "Added");
    setCategory(payload.category);
  }

  if (loading) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={6} />;
  }

  return (
    <div className="space-y-3">
      <AdminCategoryTabs tabs={tabs} value={category} onChange={setCategory} />
      <AdminPageHeader
        title={title}
        description={description}
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

      {visible.length === 0 ? (
        <AdminEmptyState
          title="No banners in this category"
          description="Add a new item or pick another tab."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <AdminPromoCard
              key={item.id}
              imageUrl={item.imageUrl}
              title={item.title}
              badge={badgeLabel(item.category)}
              active={item.active}
              showDelete={showDelete}
              onEdit={() => openEdit(item)}
              onToggle={() =>
                void persist(
                  items.map((row) =>
                    row.id === item.id ? { ...row, active: !row.active } : row,
                  ),
                  item.active ? "Marked closed" : "Marked done",
                )
              }
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`}
        className="sm:max-w-lg"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </Field>
          <Field label="Image URL" hint="Paste a public image URL.">
            <Input
              required
              value={form.imageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://"
            />
          </Field>
          {form.imageUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageUrl} alt="" className="h-28 w-full rounded-md object-cover" />
          ) : null}
          <Field label="Link URL">
            <Input
              value={form.linkUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
              placeholder="/flights"
            />
          </Field>
          <label className="flex items-center gap-2 text-[12px] font-medium text-admin-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Active (Done)
          </label>
          <div className="flex justify-end gap-2">
            {editing && !showDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-danger-700"
                onClick={() => {
                  setDeleteTarget(editing);
                  setModalOpen(false);
                }}
              >
                Delete
              </Button>
            ) : null}
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
        title="Delete this item?"
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Remove <strong className="text-admin-ink">{deleteTarget.title || "this banner"}</strong>?
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
                    items.filter((item) => item.id !== deleteTarget.id),
                    "Deleted",
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
