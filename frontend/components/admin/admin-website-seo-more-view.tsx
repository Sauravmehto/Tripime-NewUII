"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileSearch, FileText, Globe } from "lucide-react";
import {
  checkAdminSitemap,
  getAdminWebsite,
  updateAdminWebsiteSeoMore,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminSection } from "./ui/admin-section";
import { AdminSectionEditBar } from "./ui/admin-section-edit-bar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { WebsiteCms, WebsiteSeoMore } from "@/types";

type SectionKey = "sitemap" | "robots";

function previewUrl(domainName: string) {
  const host = domainName.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  return host ? `https://${host}` : "";
}

export function AdminWebsiteSeoMoreView() {
  const handleAuthError = useAdminAuthError();
  const [cms, setCms] = useState<WebsiteCms | null>(null);
  const [seoMore, setSeoMore] = useState<WebsiteSeoMore | null>(null);
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
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
        setSeoMore(data.seoMore);
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

  const saved = cms?.seoMore;
  const dirty = useMemo(() => {
    if (!saved || !seoMore || !editing) return false;
    if (editing === "sitemap") return seoMore.sitemapUrl !== saved.sitemapUrl;
    return seoMore.robotsTxt !== saved.robotsTxt;
  }, [editing, saved, seoMore]);

  function cancel() {
    if (!saved) return;
    setSeoMore(saved);
    setEditing(null);
    setError("");
    setNotice("");
  }

  async function save() {
    if (!seoMore) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminWebsiteSeoMore(seoMore);
      setCms(updated);
      setSeoMore(updated.seoMore);
      setEditing(null);
      setNotice("More SEO setting saved");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onCheckSitemap() {
    if (!seoMore?.sitemapUrl.trim()) {
      setError("Add a sitemap URL first.");
      return;
    }
    setChecking(true);
    setError("");
    setNotice("");
    try {
      const result = await checkAdminSitemap(seoMore.sitemapUrl.trim());
      if (result.ok) setNotice(result.message);
      else setError(result.message);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  function bar(section: SectionKey) {
    return (
      <AdminSectionEditBar
        editing={editing === section}
        dirty={dirty}
        saving={saving}
        onEdit={() => setEditing(section)}
        onCancel={cancel}
        onSave={() => void save()}
      />
    );
  }

  if (loading) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={6} />;
  }
  if (!seoMore) {
    return (
      <AdminErrorState
        message={error || "More SEO settings are not available. Restart the API server."}
      />
    );
  }

  const sitePreview = previewUrl(cms?.general.agency.domainName ?? "");

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="More SEO setting"
        description="Sitemap URL and robots.txt for search engines."
      />
      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      <AdminSection title="Sitemap" icon={Globe} action={bar("sitemap")}>
        {editing === "sitemap" ? (
          <Field label="Sitemap URL" hint="Public XML sitemap, for example https://tripime.com/sitemap.xml">
            <Input
              value={seoMore.sitemapUrl}
              onChange={(e) => setSeoMore({ ...seoMore, sitemapUrl: e.target.value })}
              placeholder="https://tripime.com/sitemap.xml"
            />
          </Field>
        ) : null}
        <div className={editing === "sitemap" ? "mt-3 flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={checking}
            onClick={() => void onCheckSitemap()}
          >
            <FileSearch className="size-3.5" />
            {checking ? "Checking…" : "Check Sitemap"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-admin-accent text-admin-accent"
            disabled={!sitePreview}
            onClick={() => {
              if (sitePreview) window.open(sitePreview, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="size-3.5" />
            Preview Website
          </Button>
        </div>
      </AdminSection>

      <AdminSection title="Robot.txt" icon={FileText} action={bar("robots")}>
        {editing === "robots" ? (
          <Field label="robots.txt">
            <Textarea
              rows={12}
              className="font-mono text-[12px]"
              value={seoMore.robotsTxt}
              onChange={(e) => setSeoMore({ ...seoMore, robotsTxt: e.target.value })}
            />
          </Field>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-admin-ink">
            {seoMore.robotsTxt.trim() || "—"}
          </pre>
        )}
      </AdminSection>
    </div>
  );
}
