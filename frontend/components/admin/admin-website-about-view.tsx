"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { getAdminWebsite, updateAdminWebsiteAbout } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminSection } from "./ui/admin-section";
import { AdminSectionEditBar } from "./ui/admin-section-edit-bar";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { WebsiteAbout, WebsiteAboutBlock, WebsiteCms } from "@/types";

function AboutPreview({ block }: { block: WebsiteAboutBlock }) {
  const paragraphs = block.body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2 text-[13px] leading-6 text-admin-ink">
      {block.heading.trim() ? (
        <h3 className="text-[14px] font-semibold text-admin-ink">{block.heading}</h3>
      ) : null}
      {paragraphs.map((paragraph, index) => (
        <p key={`${block.id}-p-${index}`} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
      {block.bulletsTitle.trim() ? (
        <h4 className="pt-1 text-[13px] font-semibold text-admin-ink">{block.bulletsTitle}</h4>
      ) : null}
      {block.bullets.filter(Boolean).length > 0 ? (
        <ul className="list-disc space-y-0.5 pl-5">
          {block.bullets.filter(Boolean).map((item, index) => (
            <li key={`${block.id}-b-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      {block.tagline.trim() ? (
        <p className="font-semibold text-admin-accent">{block.tagline}</p>
      ) : null}
    </div>
  );
}

export function AdminWebsiteAboutView() {
  const handleAuthError = useAdminAuthError();
  const [cms, setCms] = useState<WebsiteCms | null>(null);
  const [about, setAbout] = useState<WebsiteAbout | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminWebsite();
        if (cancelled) return;
        setCms(data);
        setAbout(data.about);
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

  const saved = cms?.about;
  const dirty = useMemo(() => {
    if (!saved || !about || !editingId) return false;
    const current = about.blocks.find((block) => block.id === editingId);
    const original = saved.blocks.find((block) => block.id === editingId);
    return JSON.stringify(current) !== JSON.stringify(original);
  }, [about, editingId, saved]);

  function patchBlock(id: string, patch: Partial<WebsiteAboutBlock>) {
    if (!about) return;
    setAbout({
      ...about,
      blocks: about.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    });
  }

  function cancel() {
    if (!saved) return;
    setAbout(saved);
    setEditingId(null);
    setError("");
    setNotice("");
  }

  async function save() {
    if (!about) return;
    setSaving(true);
    setError("");
    try {
      const payload: WebsiteAbout = {
        blocks: about.blocks.map((block) => ({
          ...block,
          bullets: block.bullets.map((item) => item.trim()).filter(Boolean),
        })),
      };
      const updated = await updateAdminWebsiteAbout(payload);
      setCms(updated);
      setAbout(updated.about);
      setEditingId(null);
      setNotice("Home about us saved");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={8} />;
  }
  if (!about) {
    return (
      <AdminErrorState
        message={error || "Home about us is not available. Restart the API server."}
      />
    );
  }

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Home about us"
        description="About copy shown on the home, hotel, holiday, and bus landing pages."
      />
      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      {about.blocks.map((block) => (
        <AdminSection
          key={block.id}
          title={block.label}
          icon={FileText}
          action={
            <AdminSectionEditBar
              editing={editingId === block.id}
              dirty={dirty}
              saving={saving}
              onEdit={() => setEditingId(block.id)}
              onCancel={cancel}
              onSave={() => void save()}
            />
          }
        >
          {editingId === block.id ? (
            <div className="grid gap-2.5">
              <Field label="Heading">
                <Input
                  value={block.heading}
                  onChange={(e) => patchBlock(block.id, { heading: e.target.value })}
                />
              </Field>
              <Field label="Body" hint="Separate paragraphs with a blank line.">
                <Textarea
                  rows={6}
                  value={block.body}
                  onChange={(e) => patchBlock(block.id, { body: e.target.value })}
                />
              </Field>
              <Field label="List heading">
                <Input
                  value={block.bulletsTitle}
                  onChange={(e) => patchBlock(block.id, { bulletsTitle: e.target.value })}
                />
              </Field>
              <Field label="Bullet points" hint="One item per line.">
                <Textarea
                  rows={4}
                  value={block.bullets.join("\n")}
                  onChange={(e) =>
                    patchBlock(block.id, {
                      bullets: e.target.value.split("\n"),
                    })
                  }
                />
              </Field>
              <Field label="Tagline">
                <Input
                  value={block.tagline}
                  onChange={(e) => patchBlock(block.id, { tagline: e.target.value })}
                />
              </Field>
            </div>
          ) : (
            <AboutPreview block={block} />
          )}
        </AdminSection>
      ))}
    </div>
  );
}
