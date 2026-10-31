"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AppWindow,
  Building2,
  Bus,
  ImageIcon,
  LayoutGrid,
  Landmark,
  Palmtree,
  Plane,
  Plus,
  Sparkles,
  Umbrella,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getAdminWebsite,
  updateAdminWebsiteBanners,
  updateAdminWebsiteDeals,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import {
  applyOfferForm,
  emptyOfferForm,
  formFromItem,
  LINK_TYPES,
  validateOfferForm,
  type OfferFormErrors,
  type OfferFormState,
} from "@/lib/offers/offer-form";
import { formatIsoDate, isExpired } from "@/lib/offers/offers";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminCategoryTabs } from "./ui/admin-category-tabs";
import { AdminEmptyState } from "./ui/admin-empty-state";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminPromoCard } from "./ui/admin-promo-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { PromoLinkType, WebsiteBanners, WebsiteDeals, WebsitePromoItem } from "@/types";

type Tab = { id: string; label: string; icon: LucideIcon };

const ALL_TAB = "all";

const BANNER_TABS: Tab[] = [
  { id: "flight", label: "Flight", icon: Plane },
  { id: "hotel", label: "Hotel", icon: Building2 },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "holiday", label: "Holiday", icon: Palmtree },
  { id: "hotel-background", label: "Hotel Background", icon: ImageIcon },
  { id: "bus-background", label: "Bus Background", icon: Bus },
  { id: "holiday-background", label: "Holiday Background", icon: Umbrella },
];

const DEAL_TABS: Tab[] = [
  { id: ALL_TAB, label: "All Offers", icon: LayoutGrid },
  { id: "holiday", label: "Holidays", icon: Palmtree },
  { id: "hotel", label: "Hotels", icon: Building2 },
  { id: "flight", label: "Flights", icon: Plane },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "bank", label: "Bank Offers", icon: Landmark },
  { id: "activity", label: "Activities", icon: Sparkles },
  { id: "popup", label: "Popup", icon: AppWindow },
];

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function badgeLabel(tabs: Tab[], category: string) {
  return tabs.find((tab) => tab.id === category)?.label ?? category;
}

function captionFor(item: WebsitePromoItem): string {
  const parts = [
    item.discountText,
    item.couponCode ? `Code ${item.couponCode}` : "",
    item.validUntil ? `Till ${formatIsoDate(item.validUntil) || item.validUntil}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
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
      description="Offers shown on the website's Offers Zone, plus the homepage popup. Inactive and expired offers are hidden from visitors."
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
  tabs: Tab[];
  showDelete: boolean;
}) {
  const rich = kind === "deals";
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
  const [form, setForm] = useState<OfferFormState>(() => emptyOfferForm(rich ? "holiday" : tabs[0].id));
  const [fieldErrors, setFieldErrors] = useState<OfferFormErrors>({});

  const categoryOptions = tabs.filter((tab) => tab.id !== ALL_TAB);

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

  const visible = useMemo(() => {
    const rows = category === ALL_TAB ? items : items.filter((item) => item.category === category);
    return rich ? [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : rows;
  }, [category, items, rich]);

  async function persist(next: WebsitePromoItem[], message: string): Promise<boolean> {
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
      return true;
    } catch (err) {
      if (handleAuthError(err)) return false;
      setError(getErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyOfferForm(category === ALL_TAB ? "holiday" : category));
    setFieldErrors({});
    setModalOpen(true);
    setError("");
  }

  function openEdit(item: WebsitePromoItem) {
    setEditing(item);
    setForm(formFromItem(item));
    setFieldErrors({});
    setModalOpen(true);
    setError("");
  }

  function setField<K extends keyof OfferFormState>(key: K, value: OfferFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validateOfferForm(form, rich);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    const payload = applyOfferForm(editing, editing?.id ?? newId(rich ? "deal" : "ban"), form, rich);
    const next = editing
      ? items.map((item) => (item.id === editing.id ? payload : item))
      : [...items, payload];
    const ok = await persist(next, editing ? "Updated" : "Added");
    if (ok && category !== ALL_TAB) setCategory(payload.category);
  }

  if (loading) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={6} />;
  }

  const linkMeta = LINK_TYPES.find((type) => type.id === form.linkType) ?? LINK_TYPES[0];
  const noun = rich ? "offer" : "banner";

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
      {error && !modalOpen ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <AdminEmptyState
          title={`No ${noun}s in this category`}
          description="Add a new item or pick another tab."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <AdminPromoCard
              key={item.id}
              imageUrl={item.imageUrl}
              title={item.title}
              badge={badgeLabel(tabs, item.category)}
              active={item.active}
              caption={rich ? captionFor(item) : undefined}
              expired={rich && isExpired(item.validUntil ?? "")}
              showDelete={showDelete}
              onEdit={() => openEdit(item)}
              onToggle={() =>
                void persist(
                  items.map((row) =>
                    row.id === item.id ? { ...row, active: !row.active } : row,
                  ),
                  item.active ? "Deactivated" : "Activated",
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
        title={editing ? `Edit ${noun}` : `Add ${noun}`}
        className={rich ? "sm:max-w-2xl" : "sm:max-w-lg"}
      >
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-3">
          {error ? (
            <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-[12px] font-medium text-danger-700">
              {error}
            </p>
          ) : null}

          <div className={rich ? "grid gap-3 sm:grid-cols-2" : undefined}>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setField("category", e.target.value)}>
                {categoryOptions.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </Select>
            </Field>
            {rich ? (
              <Field label="Sort order" hint="Lower numbers show first. The first offer is the featured one." error={fieldErrors.sortOrder}>
                <Input
                  type="number"
                  min={0}
                  max={9999}
                  step={1}
                  inputMode="numeric"
                  value={form.sortOrder}
                  onChange={(e) => setField("sortOrder", e.target.value)}
                />
              </Field>
            ) : null}
          </div>

          <Field label={rich ? "Title *" : "Title"} error={fieldErrors.title}>
            <Input value={form.title} maxLength={200} onChange={(e) => setField("title", e.target.value)} />
          </Field>

          {rich ? (
            <>
              <Field label="Subtitle" error={fieldErrors.subtitle}>
                <Input value={form.subtitle} maxLength={240} onChange={(e) => setField("subtitle", e.target.value)} />
              </Field>
              <Field label="Description" error={fieldErrors.description}>
                <Textarea
                  rows={3}
                  value={form.description}
                  maxLength={1000}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </Field>
            </>
          ) : null}

          <Field label="Image URL *" hint="Paste a public https:// image URL." error={fieldErrors.imageUrl}>
            <Input
              value={form.imageUrl}
              onChange={(e) => setField("imageUrl", e.target.value)}
              placeholder="https://"
            />
          </Field>
          {form.imageUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageUrl} alt="" className="h-28 w-full rounded-md object-cover" />
          ) : null}

          {rich ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Discount label" hint="Shown as a badge, e.g. the exact discount you are offering." error={fieldErrors.discountText}>
                  <Input
                    value={form.discountText}
                    maxLength={80}
                    onChange={(e) => setField("discountText", e.target.value)}
                  />
                </Field>
                <Field label="Coupon code" hint="Leave empty if no code is needed." error={fieldErrors.couponCode}>
                  <Input
                    value={form.couponCode}
                    maxLength={40}
                    autoCapitalize="characters"
                    spellCheck={false}
                    onChange={(e) => setField("couponCode", e.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="Valid until" hint="Last day the offer is valid. Leave empty for no end date." error={fieldErrors.validUntil}>
                  <Input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setField("validUntil", e.target.value)}
                  />
                </Field>
                <Field label="Minimum booking amount (₹)" hint="Leave empty if there is no minimum." error={fieldErrors.minBookingValue}>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={form.minBookingValue}
                    onChange={(e) => setField("minBookingValue", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Terms & conditions" error={fieldErrors.terms}>
                <Textarea
                  rows={3}
                  value={form.terms}
                  maxLength={1200}
                  onChange={(e) => setField("terms", e.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Button label" hint="Defaults to “View offer”." error={fieldErrors.ctaLabel}>
                  <Input value={form.ctaLabel} maxLength={40} onChange={(e) => setField("ctaLabel", e.target.value)} />
                </Field>
                <Field label="Link type">
                  <Select value={form.linkType} onChange={(e) => setField("linkType", e.target.value as PromoLinkType)}>
                    {LINK_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Link target" hint={linkMeta.hint} error={fieldErrors.linkUrl}>
                <Input
                  value={form.linkUrl}
                  onChange={(e) => setField("linkUrl", e.target.value)}
                  placeholder={linkMeta.placeholder}
                />
              </Field>
              {form.category === "bank" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Bank name" error={fieldErrors.bankName}>
                    <Input value={form.bankName} maxLength={80} onChange={(e) => setField("bankName", e.target.value)} />
                  </Field>
                  <Field label="Bank logo URL" hint="Optional https:// image." error={fieldErrors.bankLogoUrl}>
                    <Input
                      value={form.bankLogoUrl}
                      onChange={(e) => setField("bankLogoUrl", e.target.value)}
                      placeholder="https://"
                    />
                  </Field>
                </div>
              ) : null}
            </>
          ) : (
            <Field label="Link URL" error={fieldErrors.linkUrl}>
              <Input
                value={form.linkUrl}
                onChange={(e) => setField("linkUrl", e.target.value)}
                placeholder="/flights"
              />
            </Field>
          )}

          <label className="flex items-center gap-2 text-[12px] font-medium text-admin-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField("active", e.target.checked)}
            />
            Active (visible on the website)
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
