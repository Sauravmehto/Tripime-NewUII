"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ALargeSmall,
  Image as ImageIcon,
  MapPin,
  Palette,
  Pencil,
  Plane,
  Save,
  Shield,
  X,
} from "lucide-react";
import { getAdminWebsite, updateAdminWebsiteSetting } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { AIRPORT_CODES, airportOf } from "@/lib/airports";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminSection } from "./ui/admin-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import type { WebsiteCms, WebsiteSetting } from "@/types";

type SectionKey = "logos" | "theme" | "flight" | "recaptcha" | "map";

function EditBar({
  editing,
  dirty,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  dirty: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!editing) {
    return (
      <Button type="button" variant="outline" size="xs" onClick={onEdit}>
        <Pencil className="size-3" />
        Edit
      </Button>
    );
  }
  return (
    <div className="flex gap-1">
      <Button type="button" variant="outline" size="xs" disabled={saving} onClick={onCancel}>
        <X className="size-3" />
        Cancel
      </Button>
      <Button type="button" variant="admin" size="xs" disabled={saving || !dirty} onClick={onSave}>
        <Save className="size-3" />
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function AssetCard({
  label,
  url,
  editing,
  onChange,
}: {
  label: string;
  url: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-admin-ink-muted">{label}</p>
      <div className="flex min-h-16 items-center justify-center rounded-md border border-admin-border bg-admin-muted/50 p-2">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="max-h-12 max-w-full object-contain" />
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-admin-ink-subtle">
            <ImageIcon className="size-3.5" />
            No image
          </span>
        )}
      </div>
      {editing ? (
        <Input
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or /brand/…"
          className="h-8 text-[12px]"
        />
      ) : null}
    </div>
  );
}

function ColorRow({
  label,
  value,
  icon: Icon,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  icon: typeof Palette;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-admin-ink-subtle" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-admin-ink-muted">{label}</p>
        {editing ? (
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="size-7 cursor-pointer rounded border border-admin-border bg-transparent"
              aria-label={label}
            />
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 font-mono text-[12px]"
            />
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <span
              className="size-5 rounded-full border border-admin-border"
              style={{ backgroundColor: value || "#ffffff" }}
            />
            <span className="font-mono text-[12px] text-admin-ink">{value || "—"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function flightLabel(code: string) {
  const airport = airportOf(code);
  return `${airport.code} - ${airport.city} India`;
}

export function AdminWebsiteSettingView() {
  const handleAuthError = useAdminAuthError();
  const [cms, setCms] = useState<WebsiteCms | null>(null);
  const [setting, setSetting] = useState<WebsiteSetting | null>(null);
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
        setSetting(data.website);
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

  const saved = cms?.website;
  const dirty = useMemo(() => {
    if (!saved || !setting || !editing) return false;
    if (editing === "logos") return JSON.stringify(setting.logos) !== JSON.stringify(saved.logos);
    if (editing === "theme") return JSON.stringify(setting.theme) !== JSON.stringify(saved.theme);
    if (editing === "flight") {
      return JSON.stringify(setting.defaultFlight) !== JSON.stringify(saved.defaultFlight);
    }
    if (editing === "recaptcha") {
      return JSON.stringify(setting.recaptcha) !== JSON.stringify(saved.recaptcha);
    }
    return JSON.stringify(setting.supportMap) !== JSON.stringify(saved.supportMap);
  }, [editing, saved, setting]);

  function cancel() {
    if (!saved) return;
    setSetting(saved);
    setEditing(null);
    setError("");
    setNotice("");
  }

  async function save() {
    if (!setting) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminWebsiteSetting(setting);
      setCms(updated);
      setSetting(updated.website);
      setEditing(null);
      setNotice("Website setting saved");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function bar(section: SectionKey): ReactNode {
    return (
      <EditBar
        editing={editing === section}
        dirty={dirty}
        saving={saving}
        onEdit={() => setEditing(section)}
        onCancel={cancel}
        onSave={() => void save()}
      />
    );
  }

  if (loading || !setting) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={8} />;
  }

  const { logos, theme, defaultFlight, recaptcha, supportMap } = setting;

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Website setting"
        description="Logos, theme colors, default flight search, and verification keys."
      />
      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      <AdminSection title="Logo style" icon={ImageIcon} action={bar("logos")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <AssetCard
            label="Logo"
            url={logos.logoUrl}
            editing={editing === "logos"}
            onChange={(logoUrl) => setSetting({ ...setting, logos: { ...logos, logoUrl } })}
          />
          <AssetCard
            label="Website favicon"
            url={logos.faviconUrl}
            editing={editing === "logos"}
            onChange={(faviconUrl) => setSetting({ ...setting, logos: { ...logos, faviconUrl } })}
          />
          <AssetCard
            label="Mobile logo"
            url={logos.mobileLogoUrl}
            editing={editing === "logos"}
            onChange={(mobileLogoUrl) =>
              setSetting({ ...setting, logos: { ...logos, mobileLogoUrl } })
            }
          />
          <AssetCard
            label="Footer logo"
            url={logos.footerLogoUrl}
            editing={editing === "logos"}
            onChange={(footerLogoUrl) =>
              setSetting({ ...setting, logos: { ...logos, footerLogoUrl } })
            }
          />
          <AssetCard
            label="Desktop banner"
            url={logos.desktopBannerUrl}
            editing={editing === "logos"}
            onChange={(desktopBannerUrl) =>
              setSetting({ ...setting, logos: { ...logos, desktopBannerUrl } })
            }
          />
          <AssetCard
            label="Mobile banner"
            url={logos.mobileBannerUrl}
            editing={editing === "logos"}
            onChange={(mobileBannerUrl) =>
              setSetting({ ...setting, logos: { ...logos, mobileBannerUrl } })
            }
          />
        </div>
      </AdminSection>

      <AdminSection title="Theme color setting" icon={Palette} action={bar("theme")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <ColorRow
            label="Color theme"
            value={theme.colorTheme}
            icon={Palette}
            editing={editing === "theme"}
            onChange={(colorTheme) => setSetting({ ...setting, theme: { ...theme, colorTheme } })}
          />
          <ColorRow
            label="Background theme color"
            value={theme.backgroundColor}
            icon={Palette}
            editing={editing === "theme"}
            onChange={(backgroundColor) =>
              setSetting({ ...setting, theme: { ...theme, backgroundColor } })
            }
          />
          <ColorRow
            label="Header color"
            value={theme.headerColor}
            icon={ALargeSmall}
            editing={editing === "theme"}
            onChange={(headerColor) => setSetting({ ...setting, theme: { ...theme, headerColor } })}
          />
          <ColorRow
            label="Gradient color"
            value={theme.gradientColor}
            icon={Palette}
            editing={editing === "theme"}
            onChange={(gradientColor) =>
              setSetting({ ...setting, theme: { ...theme, gradientColor } })
            }
          />
          <ColorRow
            label="Text color"
            value={theme.textColor}
            icon={ALargeSmall}
            editing={editing === "theme"}
            onChange={(textColor) => setSetting({ ...setting, theme: { ...theme, textColor } })}
          />
          <ColorRow
            label="Footer color"
            value={theme.footerColor}
            icon={Palette}
            editing={editing === "theme"}
            onChange={(footerColor) => setSetting({ ...setting, theme: { ...theme, footerColor } })}
          />
        </div>
      </AdminSection>

      <AdminSection title="Default flight home" icon={Plane} action={bar("flight")}>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {editing === "flight" ? (
            <>
              <Field label="From destination" className="flex-1">
                <Select
                  value={defaultFlight.fromCode}
                  onChange={(e) =>
                    setSetting({
                      ...setting,
                      defaultFlight: { ...defaultFlight, fromCode: e.target.value },
                    })
                  }
                >
                  {AIRPORT_CODES.map((code) => (
                    <option key={code} value={code}>
                      {flightLabel(code)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="To destination" className="flex-1">
                <Select
                  value={defaultFlight.toCode}
                  onChange={(e) =>
                    setSetting({
                      ...setting,
                      defaultFlight: { ...defaultFlight, toCode: e.target.value },
                    })
                  }
                >
                  {AIRPORT_CODES.map((code) => (
                    <option key={code} value={code}>
                      {flightLabel(code)}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          ) : (
            <div className="flex w-full items-center gap-3 py-1">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-admin-ink-subtle">
                  From destination
                </p>
                <p className="text-[13px] font-semibold text-admin-ink">
                  {flightLabel(defaultFlight.fromCode)}
                </p>
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="border-t border-dashed border-admin-ink/30" />
                <Plane className="absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-admin-accent" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-wide text-admin-ink-subtle">
                  To destination
                </p>
                <p className="text-[13px] font-semibold text-admin-ink">
                  {flightLabel(defaultFlight.toCode)}
                </p>
              </div>
            </div>
          )}
        </div>
      </AdminSection>

      <AdminSection
        title="Google Recaptcha verification (Version 2 with checkbox)"
        icon={Shield}
        action={bar("recaptcha")}
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {editing === "recaptcha" ? (
            <>
              <Field label="Site key">
                <Input
                  value={recaptcha.siteKey}
                  onChange={(e) =>
                    setSetting({ ...setting, recaptcha: { ...recaptcha, siteKey: e.target.value } })
                  }
                />
              </Field>
              <Field label="Secret key">
                <Input
                  type="password"
                  value={recaptcha.secretKey}
                  onChange={(e) =>
                    setSetting({
                      ...setting,
                      recaptcha: { ...recaptcha, secretKey: e.target.value },
                    })
                  }
                />
              </Field>
            </>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-medium text-admin-ink-muted">Site key</p>
                <p className="mt-0.5 font-mono text-[12px] text-admin-ink">
                  {recaptcha.siteKey || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-admin-ink-muted">Secret key</p>
                <p className="mt-0.5 font-mono text-[12px] text-admin-ink">
                  {recaptcha.secretKey ? "••••••••" : "—"}
                </p>
              </div>
            </>
          )}
        </div>
      </AdminSection>

      <AdminSection title="Customer support map" icon={MapPin} action={bar("map")}>
        {editing === "map" ? (
          <Field
            label="Embed URL"
            hint="Paste a Google Maps embed URL. Leave blank to hide the map."
          >
            <Input
              value={supportMap.embedUrl}
              onChange={(e) =>
                setSetting({ ...setting, supportMap: { embedUrl: e.target.value } })
              }
              placeholder="https://www.google.com/maps/embed?…"
            />
          </Field>
        ) : supportMap.embedUrl ? (
          <iframe
            title="Customer support map"
            src={supportMap.embedUrl}
            className="h-48 w-full rounded-md border border-admin-border"
            loading="lazy"
          />
        ) : (
          <p className="text-[12px] text-admin-ink-subtle">No map embed configured yet.</p>
        )}
      </AdminSection>
    </div>
  );
}
