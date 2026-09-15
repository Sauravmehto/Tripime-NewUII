"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Building2, Bus, Palmtree, Plane, Plus } from "lucide-react";
import { updateAdminWebsiteFaqs } from "@/lib/api/admin";
import { cmsId, useAdminCmsList } from "@/lib/admin/use-admin-cms-list";
import { AdminCategoryTabs } from "./ui/admin-category-tabs";
import { AdminEmptyState } from "./ui/admin-empty-state";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminRowActions } from "./ui/admin-row-actions";
import { AdminSection } from "./ui/admin-section";
import { AdminStatusBadge } from "./ui/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { WebsiteFaqItem } from "@/types";

const TABS = [
  { id: "flight", label: "Flight", icon: Plane },
  { id: "hotel", label: "Hotel", icon: Building2 },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "holiday", label: "Holiday", icon: Palmtree },
];

const EMPTY: Omit<WebsiteFaqItem, "id"> = {
  category: "flight",
  question: "",
  answer: "",
  status: "Active",
};

export function AdminWebsiteFaqsView() {
  const list = useAdminCmsList(
    (cms) => cms.faqs.items,
    (items) => updateAdminWebsiteFaqs({ items }),
    (cms) => cms.faqs.items,
  );
  const [category, setCategory] = useState("flight");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteFaqItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteFaqItem | null>(null);

  const visible = useMemo(
    () => list.items.filter((item) => item.category === category),
    [category, list.items],
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, category });
    setModalOpen(true);
  }

  function openEdit(row: WebsiteFaqItem) {
    setEditing(row);
    setForm({
      category: row.category,
      question: row.question,
      answer: row.answer,
      status: row.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: WebsiteFaqItem = {
      id: editing?.id ?? cmsId("faq"),
      category: form.category,
      question: form.question.trim(),
      answer: form.answer.trim(),
      status: form.status === "Inactive" ? "Inactive" : "Active",
    };
    const next = editing
      ? list.items.map((row) => (row.id === editing.id ? payload : row))
      : [...list.items, payload];
    const ok = await list.persist(next, editing ? "FAQ updated" : "FAQ added");
    if (ok) {
      setModalOpen(false);
      setCategory(payload.category);
    }
  }

  return (
    <div className="space-y-3">
      <AdminCategoryTabs tabs={TABS} value={category} onChange={setCategory} />
      {list.error ? <AdminErrorState message={list.error} /> : null}
      {list.notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {list.notice}
        </p>
      ) : null}

      <AdminSection
        title="Faqs"
        action={
          <Button size="xs" variant="admin" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add New
          </Button>
        }
      >
        {list.loading ? (
          <AdminLoading rows={4} />
        ) : visible.length === 0 ? (
          <AdminEmptyState title="No FAQs in this category" />
        ) : (
          <div className="space-y-2">
            {visible.map((item, index) => (
              <article key={item.id} className="overflow-hidden rounded-md border border-admin-border">
                <div className="flex flex-wrap items-center gap-2 bg-admin-muted px-3 py-2">
                  <p className="min-w-0 flex-1 text-[13px] font-semibold text-admin-ink">
                    {index + 1} {item.question}
                  </p>
                  <AdminStatusBadge tone={item.status === "Active" ? "success" : "neutral"}>
                    {item.status}
                  </AdminStatusBadge>
                  <span className="text-[11px] capitalize text-admin-ink-subtle">{item.category}</span>
                  <AdminRowActions onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
                </div>
                <p className="px-3 py-2 text-[12px] leading-5 text-admin-ink-muted">{item.answer}</p>
              </article>
            ))}
          </div>
        )}
      </AdminSection>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit FAQ" : "Add FAQ"} className="sm:max-w-lg">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            >
              {TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Question">
            <Input
              required
              value={form.question}
              onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
            />
          </Field>
          <Field label="Answer">
            <Textarea
              required
              rows={5}
              value={form.answer}
              onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value }))}
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete FAQ?">
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">{deleteTarget.question}</p>
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
                    "FAQ deleted",
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
