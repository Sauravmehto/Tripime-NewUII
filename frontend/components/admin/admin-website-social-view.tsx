"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Share2 } from "lucide-react";
import { getAdminWebsite, updateAdminWebsiteSocial } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminSection } from "./ui/admin-section";
import { AdminSectionEditBar } from "./ui/admin-section-edit-bar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { WebsiteCms, WebsiteSocial } from "@/types";

const EMPTY: WebsiteSocial = {
  facebook: "",
  instagram: "",
  linkedin: "",
  youtube: "",
  twitter: "",
  whatsapp: "",
};

export function AdminWebsiteSocialView() {
  const handleAuthError = useAdminAuthError();
  const [cms, setCms] = useState<WebsiteCms | null>(null);
  const [social, setSocial] = useState<WebsiteSocial>(EMPTY);
  const [editing, setEditing] = useState(false);
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
        setSocial(data.social ?? EMPTY);
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

  const saved = cms?.social;
  const dirty = useMemo(
    () => Boolean(saved && JSON.stringify(social) !== JSON.stringify(saved)),
    [saved, social],
  );

  function cancel() {
    if (!saved) return;
    setSocial(saved);
    setEditing(false);
    setError("");
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminWebsiteSocial(social);
      setCms(updated);
      setSocial(updated.social);
      setEditing(false);
      setNotice("Social media saved");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={5} />;
  }

  const fields: { key: keyof WebsiteSocial; label: string }[] = [
    { key: "facebook", label: "Facebook" },
    { key: "instagram", label: "Instagram" },
    { key: "linkedin", label: "Linkedin" },
    { key: "youtube", label: "Youtube" },
    { key: "twitter", label: "Twitter" },
    { key: "whatsapp", label: "Whatsapp Number" },
  ];

  return (
    <div className="space-y-3">
      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}
      <AdminSection
        title="Social Media"
        icon={Share2}
        action={
          <AdminSectionEditBar
            editing={editing}
            dirty={dirty}
            saving={saving}
            onEdit={() => setEditing(true)}
            onCancel={cancel}
            onSave={() => void save()}
          />
        }
      >
        {editing ? (
          <form onSubmit={(e) => void save(e)} className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <Field key={field.key} label={field.label}>
                <Input
                  value={social[field.key]}
                  onChange={(e) => setSocial({ ...social, [field.key]: e.target.value })}
                />
              </Field>
            ))}
            <div className="sm:col-span-2">
              <Button type="submit" variant="admin" size="sm" disabled={saving || !dirty}>
                {saving ? "Saving…" : "Submit"}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 text-[12px]">
            {fields.map((field) => (
              <div key={field.key}>
                <dt className="font-medium text-admin-ink-muted">{field.label}</dt>
                <dd className="mt-0.5 break-all text-admin-ink">{social[field.key].trim() || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </AdminSection>
    </div>
  );
}
