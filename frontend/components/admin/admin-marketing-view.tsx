"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Play, Plus, Search } from "lucide-react";
import {
  getAdminMarketing,
  getAdminMarketingVideos,
  updateAdminMarketing,
  updateAdminMarketingVideos,
} from "@/lib/api/admin";
import { MARKETING_CATEGORIES, marketingCategoryLabel } from "@/lib/admin/marketing-categories";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminCategoryTabs } from "./ui/admin-category-tabs";
import { AdminEmptyState } from "./ui/admin-empty-state";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { MarketingBanner, MarketingVideo } from "@/types";

type Kind = "banners" | "videos";

const EMPTY_BANNER = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  category: "flight",
  active: true,
};

const EMPTY_VIDEO = {
  title: "",
  thumbnailUrl: "",
  videoUrl: "",
  category: "flight",
  active: true,
};

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function AdminMarketingBannersView() {
  return <AdminMarketingLibrary kind="banners" />;
}

export function AdminMarketingVideoView() {
  return <AdminMarketingLibrary kind="videos" />;
}

function AdminMarketingLibrary({ kind }: { kind: Kind }) {
  const video = kind === "videos";
  const handleAuthError = useAdminAuthError();
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [videos, setVideos] = useState<MarketingVideo[]>([]);
  const [category, setCategory] = useState("flight");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<MarketingBanner | null>(null);
  const [editingVideo, setEditingVideo] = useState<MarketingVideo | null>(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER);
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (video) {
          const data = await getAdminMarketingVideos();
          if (cancelled) return;
          setVideos(data);
        } else {
          const data = await getAdminMarketing();
          if (cancelled) return;
          setBanners(data);
        }
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
  }, [handleAuthError, video]);

  const visibleBanners = useMemo(() => {
    const needle = appliedQuery.trim().toLowerCase();
    return banners.filter((item) => {
      if (item.category !== category) return false;
      if (!needle) return true;
      return `${item.title} ${item.subtitle}`.toLowerCase().includes(needle);
    });
  }, [appliedQuery, banners, category]);

  const visibleVideos = useMemo(() => {
    const needle = appliedQuery.trim().toLowerCase();
    return videos.filter((item) => {
      if (item.category !== category) return false;
      if (!needle) return true;
      return item.title.toLowerCase().includes(needle);
    });
  }, [appliedQuery, category, videos]);

  async function persistBanners(next: MarketingBanner[], message: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminMarketing(next);
      setBanners(updated);
      setNotice(message);
      setModalOpen(false);
      setDeleteId(null);
      return true;
    } catch (err) {
      if (handleAuthError(err)) return false;
      setError(getErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function persistVideos(next: MarketingVideo[], message: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminMarketingVideos(next);
      setVideos(updated);
      setNotice(message);
      setModalOpen(false);
      setDeleteId(null);
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
    if (video) {
      setEditingVideo(null);
      setVideoForm({ ...EMPTY_VIDEO, category });
    } else {
      setEditingBanner(null);
      setBannerForm({ ...EMPTY_BANNER, category });
    }
    setModalOpen(true);
    setError("");
  }

  function openEditBanner(item: MarketingBanner) {
    setEditingBanner(item);
    setBannerForm({
      title: item.title,
      subtitle: item.subtitle,
      imageUrl: item.imageUrl,
      linkUrl: item.linkUrl,
      category: item.category,
      active: item.active,
    });
    setModalOpen(true);
    setError("");
  }

  function openEditVideo(item: MarketingVideo) {
    setEditingVideo(item);
    setVideoForm({
      title: item.title,
      thumbnailUrl: item.thumbnailUrl,
      videoUrl: item.videoUrl,
      category: item.category,
      active: item.active,
    });
    setModalOpen(true);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (video) {
      if (!videoForm.thumbnailUrl.trim() || !videoForm.videoUrl.trim()) {
        setError("Thumbnail URL and video URL are required.");
        return;
      }
      const payload: MarketingVideo = {
        id: editingVideo?.id ?? newId("mvid"),
        category: videoForm.category,
        title: videoForm.title.trim(),
        thumbnailUrl: videoForm.thumbnailUrl.trim(),
        videoUrl: videoForm.videoUrl.trim(),
        active: videoForm.active,
      };
      const next = editingVideo
        ? videos.map((item) => (item.id === editingVideo.id ? payload : item))
        : [...videos, payload];
      const ok = await persistVideos(next, editingVideo ? "Video updated" : "Video added");
      if (ok) setCategory(payload.category);
      return;
    }
    if (!bannerForm.imageUrl.trim()) {
      setError("Image URL is required.");
      return;
    }
    const payload: MarketingBanner = {
      id: editingBanner?.id ?? newId("mkt"),
      category: bannerForm.category,
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim(),
      imageUrl: bannerForm.imageUrl.trim(),
      linkUrl: bannerForm.linkUrl.trim(),
      active: bannerForm.active,
    };
    const next = editingBanner
      ? banners.map((item) => (item.id === editingBanner.id ? payload : item))
      : [...banners, payload];
    const ok = await persistBanners(next, editingBanner ? "Banner updated" : "Banner added");
    if (ok) setCategory(payload.category);
  }

  if (loading) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={6} />;
  }

  const visibleCount = video ? visibleVideos.length : visibleBanners.length;

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title={video ? "Marketing Videos" : "Marketing Banners"}
        action={
          <Button size="sm" variant="admin" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add New
          </Button>
        }
      />
      <AdminCategoryTabs
        wrap
        tabs={MARKETING_CATEGORIES}
        value={category}
        onChange={setCategory}
      />
      <form
        className="flex flex-wrap gap-2 rounded-md border border-admin-border bg-sky-50/80 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQuery(query);
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keyword."
          className="min-w-[200px] flex-1 bg-white"
        />
        <Button type="submit" size="sm" variant="admin">
          <Search className="size-3.5" />
          SEARCH
        </Button>
      </form>

      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      {visibleCount === 0 ? (
        <AdminEmptyState
          title={video ? "No videos in this category" : "No banners in this category"}
          description="Try another tab, clear search, or add a new item."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {video
            ? visibleVideos.map((item) => (
                <MarketingTile
                  key={item.id}
                  imageUrl={item.thumbnailUrl}
                  title={item.title}
                  play
                  onPlay={
                    item.videoUrl
                      ? () => window.open(item.videoUrl, "_blank", "noopener,noreferrer")
                      : undefined
                  }
                  onEdit={() => openEditVideo(item)}
                  onDelete={() => setDeleteId(item.id)}
                />
              ))
            : visibleBanners.map((item) => (
                <MarketingTile
                  key={item.id}
                  imageUrl={item.imageUrl}
                  title={item.title}
                  subtitle={item.subtitle}
                  onEdit={() => openEditBanner(item)}
                  onDelete={() => setDeleteId(item.id)}
                />
              ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          video
            ? editingVideo
              ? "Edit marketing video"
              : "Add marketing video"
            : editingBanner
              ? "Edit marketing banner"
              : "Add marketing banner"
        }
        className="sm:max-w-lg"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <Field label="Category">
            <Select
              value={video ? videoForm.category : bannerForm.category}
              onChange={(e) =>
                video
                  ? setVideoForm((prev) => ({ ...prev, category: e.target.value }))
                  : setBannerForm((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              {MARKETING_CATEGORIES.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input
              value={video ? videoForm.title : bannerForm.title}
              onChange={(e) =>
                video
                  ? setVideoForm((prev) => ({ ...prev, title: e.target.value }))
                  : setBannerForm((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </Field>
          {video ? (
            <>
              <Field label="Thumbnail URL" hint="Paste a public image URL.">
                <Input
                  required
                  value={videoForm.thumbnailUrl}
                  onChange={(e) =>
                    setVideoForm((prev) => ({ ...prev, thumbnailUrl: e.target.value }))
                  }
                  placeholder="https://"
                />
              </Field>
              <Field label="Video URL">
                <Input
                  required
                  value={videoForm.videoUrl}
                  onChange={(e) =>
                    setVideoForm((prev) => ({ ...prev, videoUrl: e.target.value }))
                  }
                  placeholder="https://"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Subtitle">
                <Input
                  value={bannerForm.subtitle}
                  onChange={(e) =>
                    setBannerForm((prev) => ({ ...prev, subtitle: e.target.value }))
                  }
                />
              </Field>
              <Field label="Image URL" hint="Paste a public image URL.">
                <Input
                  required
                  value={bannerForm.imageUrl}
                  onChange={(e) =>
                    setBannerForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  placeholder="https://"
                />
              </Field>
              <Field label="Link URL">
                <Input
                  value={bannerForm.linkUrl}
                  onChange={(e) =>
                    setBannerForm((prev) => ({ ...prev, linkUrl: e.target.value }))
                  }
                  placeholder="/flights"
                />
              </Field>
            </>
          )}
          <div className="flex justify-end gap-2">
            {(editingBanner || editingVideo) && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-danger-700"
                onClick={() => {
                  setDeleteId(editingBanner?.id ?? editingVideo?.id ?? null);
                  setModalOpen(false);
                }}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="admin" disabled={saving}>
              {saving ? "Saving…" : editingBanner || editingVideo ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title={video ? "Delete this video?" : "Delete this banner?"}
      >
        {deleteId ? (
          <div className="space-y-4">
            <p className="text-sm text-admin-ink-muted">
              Remove this {video ? "video" : "banner"} from {marketingCategoryLabel(category)}?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                className="bg-danger-500 hover:bg-danger-700"
                disabled={saving}
                onClick={() =>
                  video
                    ? void persistVideos(
                        videos.filter((item) => item.id !== deleteId),
                        "Video deleted",
                      )
                    : void persistBanners(
                        banners.filter((item) => item.id !== deleteId),
                        "Banner deleted",
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

function MarketingTile({
  imageUrl,
  title,
  subtitle,
  play,
  onPlay,
  onEdit,
  onDelete,
}: {
  imageUrl: string;
  title: string;
  subtitle?: string;
  play?: boolean;
  onPlay?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-md border border-admin-border bg-admin-surface shadow-xs">
      <div className="relative aspect-square bg-admin-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-admin-ink-subtle">
            No image
          </div>
        )}
        {title ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
            <p className="text-[12px] font-bold uppercase leading-tight text-white">{title}</p>
            {subtitle ? (
              <p className="mt-0.5 line-clamp-2 text-[10px] text-white/85">{subtitle}</p>
            ) : null}
          </div>
        ) : null}
        {play ? (
          <button
            type="button"
            onClick={onPlay}
            className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
            aria-label="Play video"
          >
            <Play className="size-4 fill-white" />
          </button>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-admin-border px-2 py-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-semibold text-danger-700"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
