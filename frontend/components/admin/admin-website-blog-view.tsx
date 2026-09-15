"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { updateAdminWebsiteBlogs, updateAdminWebsiteVideoBlogs } from "@/lib/api/admin";
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
import type { WebsiteBlogPost } from "@/types";

const EMPTY: Omit<WebsiteBlogPost, "id"> = {
  imageUrl: "",
  heading: "",
  videoUrl: "",
  excerpt: "",
  content: "",
  status: "Active",
};

export function AdminWebsiteBlogView() {
  return <BlogCollection kind="blog" />;
}

export function AdminWebsiteVideoBlogView() {
  return <BlogCollection kind="video" />;
}

function BlogCollection({ kind }: { kind: "blog" | "video" }) {
  const video = kind === "video";
  const list = useAdminCmsList(
    (cms) => (video ? cms.videoBlogs?.items ?? [] : cms.blogs?.items ?? []),
    (items) =>
      video ? updateAdminWebsiteVideoBlogs({ items }) : updateAdminWebsiteBlogs({ items }),
    (cms) => (video ? cms.videoBlogs?.items ?? [] : cms.blogs?.items ?? []),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteBlogPost | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteBlogPost | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
    list.setError("");
  }

  function openEdit(row: WebsiteBlogPost) {
    setEditing(row);
    setForm({
      imageUrl: row.imageUrl,
      heading: row.heading,
      videoUrl: row.videoUrl,
      excerpt: row.excerpt,
      content: row.content,
      status: row.status,
    });
    setModalOpen(true);
    list.setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.heading.trim()) {
      list.setError("Heading is required.");
      return;
    }
    const payload: WebsiteBlogPost = {
      id: editing?.id ?? cmsId(video ? "vblog" : "blog"),
      imageUrl: form.imageUrl.trim(),
      heading: form.heading.trim(),
      videoUrl: form.videoUrl.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content,
      status: form.status === "Inactive" ? "Inactive" : "Active",
    };
    const next = editing
      ? list.items.map((row) => (row.id === editing.id ? payload : row))
      : [...list.items, payload];
    const ok = await list.persist(next, editing ? "Blog updated" : "Blog added");
    if (ok) setModalOpen(false);
  }

  const columns: AdminTableColumn<WebsiteBlogPost>[] = [
    {
      key: "index",
      header: "#",
      className: "w-10",
      render: (row) => list.items.findIndex((item) => item.id === row.id) + 1,
    },
    { key: "image", header: "Image", render: (row) => <AdminThumb src={row.imageUrl} /> },
    { key: "heading", header: "Heading", render: (row) => row.heading },
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
        title={video ? "Manage Video Blogs" : "Manage Blogs"}
        action={
          <Button size="xs" variant="admin" onClick={openCreate}>
            <Plus className="size-3.5" />
            {video ? "Add Blog" : "+ Add Blog"}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit blog" : "Add blog"}
        className="sm:max-w-lg"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Field label="Heading">
            <Input
              required
              value={form.heading}
              onChange={(e) => setForm((prev) => ({ ...prev, heading: e.target.value }))}
            />
          </Field>
          <Field label="Image URL">
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://"
            />
          </Field>
          {video ? (
            <Field label="Video URL" hint="YouTube or public video link.">
              <Input
                value={form.videoUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://"
              />
            </Field>
          ) : null}
          <Field label="Excerpt">
            <Textarea
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
            />
          </Field>
          <Field label="Content">
            <Textarea
              rows={5}
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete blog?">
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
                    "Blog deleted",
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
