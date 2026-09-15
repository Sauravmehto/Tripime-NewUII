"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Globe, Link2, Search } from "lucide-react";
import { getAdminWebsite, updateAdminWebsiteSeo } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminSection } from "./ui/admin-section";
import { AdminSectionEditBar } from "./ui/admin-section-edit-bar";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { WebsiteCms, WebsitePageSeo, WebsiteSeo } from "@/types";

type SectionKey = "home" | "allPages" | "slugs" | "routes";

function preview(value: string, empty = "—") {
  const trimmed = value.trim();
  if (!trimmed) return empty;
  return trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed;
}

function patchPage(
  pages: WebsitePageSeo[],
  selectedId: string,
  patch: Partial<WebsitePageSeo>,
): WebsitePageSeo[] {
  return pages.map((page) => (page.id === selectedId ? { ...page, ...patch } : page));
}

function selectedPage(pages: WebsitePageSeo[], selectedId: string): WebsitePageSeo | undefined {
  return pages.find((page) => page.id === selectedId) ?? pages[0];
}

export function AdminWebsiteSeoView() {
  const handleAuthError = useAdminAuthError();
  const [cms, setCms] = useState<WebsiteCms | null>(null);
  const [seo, setSeo] = useState<WebsiteSeo | null>(null);
  const [editing, setEditing] = useState<SectionKey | null>(null);
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
        setSeo(data.seo);
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

  const saved = cms?.seo;
  const dirty = useMemo(() => {
    if (!saved || !seo || !editing) return false;
    if (editing === "home") return JSON.stringify(seo.home) !== JSON.stringify(saved.home);
    if (editing === "allPages") {
      return (
        JSON.stringify(seo.allPages) !== JSON.stringify(saved.allPages) ||
        seo.allPagesSelected !== saved.allPagesSelected
      );
    }
    if (editing === "slugs") {
      return (
        JSON.stringify(seo.slugPages) !== JSON.stringify(saved.slugPages) ||
        seo.slugPagesSelected !== saved.slugPagesSelected
      );
    }
    return JSON.stringify(seo.routes) !== JSON.stringify(saved.routes);
  }, [editing, saved, seo]);

  function cancel() {
    if (!saved) return;
    setSeo(saved);
    setEditing(null);
    setError("");
    setNotice("");
  }

  async function save() {
    if (!seo) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminWebsiteSeo(seo);
      setCms(updated);
      setSeo(updated.seo);
      setEditing(null);
      setNotice("SEO setting saved");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
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
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={8} />;
  }
  if (!seo) {
    return (
      <AdminErrorState message={error || "SEO settings are not available. Restart the API server."} />
    );
  }

  const allPage = selectedPage(seo.allPages, seo.allPagesSelected);
  const slugPage = selectedPage(seo.slugPages, seo.slugPagesSelected);

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="SEO setting"
        description="Homepage tags, page metatags, slugs, and B2C route prefixes."
      />
      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      <AdminSection title="Home page (index)" icon={Globe} action={bar("home")}>
        {editing === "home" ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Meta title" className="sm:col-span-2">
              <Input
                value={seo.home.title}
                onChange={(e) => setSeo({ ...seo, home: { ...seo.home, title: e.target.value } })}
              />
            </Field>
            <Field label="Meta keyword" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={seo.home.keywords}
                onChange={(e) => setSeo({ ...seo, home: { ...seo.home, keywords: e.target.value } })}
              />
            </Field>
            <Field label="Meta description" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={seo.home.description}
                onChange={(e) =>
                  setSeo({ ...seo, home: { ...seo.home, description: e.target.value } })
                }
              />
            </Field>
            <Field label="Header script (Google Analytics code etc.)" className="sm:col-span-2">
              <Textarea
                rows={4}
                className="font-mono text-[11px]"
                value={seo.home.headerScript}
                onChange={(e) =>
                  setSeo({ ...seo, home: { ...seo.home, headerScript: e.target.value } })
                }
                placeholder="<!-- Google Tag Manager -->"
              />
            </Field>
            <Field label="Body script (Google Analytics code etc.)" className="sm:col-span-2">
              <Textarea
                rows={4}
                className="font-mono text-[11px]"
                value={seo.home.bodyScript}
                onChange={(e) =>
                  setSeo({ ...seo, home: { ...seo.home, bodyScript: e.target.value } })
                }
                placeholder="<!-- Google Analytics 4 -->"
              />
            </Field>
            <Field label="Footer script (chat script etc.)" className="sm:col-span-2">
              <Textarea
                rows={4}
                className="font-mono text-[11px]"
                value={seo.home.footerScript}
                onChange={(e) =>
                  setSeo({ ...seo, home: { ...seo.home, footerScript: e.target.value } })
                }
              />
            </Field>
            <Field label="Facebook pixel (script etc.)" className="sm:col-span-2">
              <Textarea
                rows={4}
                className="font-mono text-[11px]"
                value={seo.home.facebookPixel}
                onChange={(e) =>
                  setSeo({ ...seo, home: { ...seo.home, facebookPixel: e.target.value } })
                }
              />
            </Field>
          </div>
        ) : (
          <dl className="grid gap-2 sm:grid-cols-2 text-[12px]">
            <div className="sm:col-span-2">
              <dt className="font-medium text-admin-ink-muted">Meta title</dt>
              <dd className="mt-0.5 text-admin-ink">{preview(seo.home.title)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-admin-ink-muted">Meta keyword</dt>
              <dd className="mt-0.5 text-admin-ink">{preview(seo.home.keywords)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-admin-ink-muted">Meta description</dt>
              <dd className="mt-0.5 text-admin-ink">{preview(seo.home.description)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-admin-ink-muted">Header script</dt>
              <dd className="mt-0.5 font-mono text-[11px] whitespace-pre-wrap break-all text-admin-ink">
                {preview(seo.home.headerScript)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-admin-ink-muted">Body script</dt>
              <dd className="mt-0.5 font-mono text-[11px] whitespace-pre-wrap break-all text-admin-ink">
                {preview(seo.home.bodyScript)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-admin-ink-muted">Footer script</dt>
              <dd className="mt-0.5 font-mono text-[11px] whitespace-pre-wrap break-all text-admin-ink">
                {preview(seo.home.footerScript)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-admin-ink-muted">Facebook pixel</dt>
              <dd className="mt-0.5 font-mono text-[11px] whitespace-pre-wrap break-all text-admin-ink">
                {preview(seo.home.facebookPixel)}
              </dd>
            </div>
          </dl>
        )}
      </AdminSection>

      <AdminSection title="Website metatags setting all pages" icon={Search} action={bar("allPages")}>
        {allPage ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Select page">
              <Select
                value={allPage.id}
                onChange={(e) => setSeo({ ...seo, allPagesSelected: e.target.value })}
              >
                {seo.allPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.label}
                  </option>
                ))}
              </Select>
            </Field>
            {editing === "allPages" ? (
              <>
                <Field label="Meta keyword">
                  <Input
                    value={allPage.keywords}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        allPages: patchPage(seo.allPages, allPage.id, { keywords: e.target.value }),
                      })
                    }
                  />
                </Field>
                <Field label="Meta title" className="sm:col-span-2">
                  <Input
                    value={allPage.title}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        allPages: patchPage(seo.allPages, allPage.id, { title: e.target.value }),
                      })
                    }
                  />
                </Field>
                <Field label="Meta description" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={allPage.description}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        allPages: patchPage(seo.allPages, allPage.id, {
                          description: e.target.value,
                        }),
                      })
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[11px] font-medium text-admin-ink-muted">Meta keyword</p>
                  <p className="mt-0.5 text-[12px] text-admin-ink">{preview(allPage.keywords)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-medium text-admin-ink-muted">Meta title</p>
                  <p className="mt-0.5 text-[12px] text-admin-ink">{preview(allPage.title)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-medium text-admin-ink-muted">Meta description</p>
                  <p className="mt-0.5 text-[12px] text-admin-ink">{preview(allPage.description)}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-admin-ink-subtle">No pages configured.</p>
        )}
      </AdminSection>

      <AdminSection title="Other web pages (slugs)" icon={FileText} action={bar("slugs")}>
        {slugPage ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Select page">
              <Select
                value={slugPage.id}
                onChange={(e) => setSeo({ ...seo, slugPagesSelected: e.target.value })}
              >
                {seo.slugPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.label}
                  </option>
                ))}
              </Select>
            </Field>
            {editing === "slugs" ? (
              <>
                <Field label="Meta keyword">
                  <Input
                    value={slugPage.keywords}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        slugPages: patchPage(seo.slugPages, slugPage.id, {
                          keywords: e.target.value,
                        }),
                      })
                    }
                  />
                </Field>
                <Field label="Meta title" className="sm:col-span-2">
                  <Input
                    value={slugPage.title}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        slugPages: patchPage(seo.slugPages, slugPage.id, { title: e.target.value }),
                      })
                    }
                  />
                </Field>
                <Field label="Meta description" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={slugPage.description}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        slugPages: patchPage(seo.slugPages, slugPage.id, {
                          description: e.target.value,
                        }),
                      })
                    }
                  />
                </Field>
                <Field label="Page content" className="sm:col-span-2">
                  <Textarea
                    rows={5}
                    value={slugPage.content}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        slugPages: patchPage(seo.slugPages, slugPage.id, {
                          content: e.target.value,
                        }),
                      })
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[11px] font-medium text-admin-ink-muted">Meta keyword</p>
                  <p className="mt-0.5 text-[12px] text-admin-ink">{preview(slugPage.keywords)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-medium text-admin-ink-muted">Meta title</p>
                  <p className="mt-0.5 text-[12px] text-admin-ink">{preview(slugPage.title)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-medium text-admin-ink-muted">Meta description</p>
                  <p className="mt-0.5 text-[12px] text-admin-ink">{preview(slugPage.description)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-medium text-admin-ink-muted">Page content</p>
                  <p className="mt-0.5 text-[12px] text-admin-ink">{preview(slugPage.content)}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-admin-ink-subtle">No slug pages configured.</p>
        )}
      </AdminSection>

      <AdminSection title="B2C dynamic routes" icon={Link2} action={bar("routes")}>
        {editing === "routes" ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Flight routes (look like 'flight')">
              <Input
                value={seo.routes.flight}
                onChange={(e) => setSeo({ ...seo, routes: { ...seo.routes, flight: e.target.value } })}
              />
            </Field>
            <Field label="Hotel routes (look like 'hotel')">
              <Input
                value={seo.routes.hotel}
                onChange={(e) => setSeo({ ...seo, routes: { ...seo.routes, hotel: e.target.value } })}
              />
            </Field>
            <Field label="Holiday routes (look like 'holiday')">
              <Input
                value={seo.routes.holiday}
                onChange={(e) =>
                  setSeo({ ...seo, routes: { ...seo.routes, holiday: e.target.value } })
                }
              />
            </Field>
            <Field label="Activity (look like 'activity')">
              <Input
                value={seo.routes.activity}
                onChange={(e) =>
                  setSeo({ ...seo, routes: { ...seo.routes, activity: e.target.value } })
                }
              />
            </Field>
            <Field label="Group enquiry routes (look like 'group_enquiry')">
              <Input
                value={seo.routes.groupEnquiry}
                onChange={(e) =>
                  setSeo({ ...seo, routes: { ...seo.routes, groupEnquiry: e.target.value } })
                }
              />
            </Field>
          </div>
        ) : (
          <dl className="grid gap-2 sm:grid-cols-2 text-[12px]">
            <div>
              <dt className="font-medium text-admin-ink-muted">Flight routes</dt>
              <dd className="mt-0.5 font-mono text-admin-ink">{seo.routes.flight}</dd>
            </div>
            <div>
              <dt className="font-medium text-admin-ink-muted">Hotel routes</dt>
              <dd className="mt-0.5 font-mono text-admin-ink">{seo.routes.hotel}</dd>
            </div>
            <div>
              <dt className="font-medium text-admin-ink-muted">Holiday routes</dt>
              <dd className="mt-0.5 font-mono text-admin-ink">{seo.routes.holiday}</dd>
            </div>
            <div>
              <dt className="font-medium text-admin-ink-muted">Activity</dt>
              <dd className="mt-0.5 font-mono text-admin-ink">{seo.routes.activity}</dd>
            </div>
            <div>
              <dt className="font-medium text-admin-ink-muted">Group enquiry routes</dt>
              <dd className="mt-0.5 font-mono text-admin-ink">{seo.routes.groupEnquiry}</dd>
            </div>
          </dl>
        )}
      </AdminSection>
    </div>
  );
}
