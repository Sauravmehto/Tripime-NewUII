"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Globe,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  UserCircle,
} from "lucide-react";
import { getAdminProfile, updateAdminProfile } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminSection } from "./ui/admin-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { AgencyProfile, AgencyProfileInput } from "@/types";

function toInput(profile: AgencyProfile): AgencyProfileInput {
  return {
    companyName: profile.companyName,
    agencyName: profile.agencyName,
    domainName: profile.domainName,
    email: profile.email,
    contactNo: profile.contactNo,
    panNumber: profile.panNumber,
    gstNumber: profile.gstNumber,
    address: profile.address,
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminProfileView() {
  const handleAuthError = useAdminAuthError();
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [form, setForm] = useState<AgencyProfileInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AgencyProfileInput, string>>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminProfile();
        if (cancelled) return;
        setProfile(data);
        setForm(toInput(data));
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

  const dirty = useMemo(() => {
    if (!profile || !form) return false;
    return JSON.stringify(form) !== JSON.stringify(toInput(profile));
  }, [form, profile]);

  function patch<K extends keyof AgencyProfileInput>(key: K, value: AgencyProfileInput[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setNotice("");
  }

  function validate(next: AgencyProfileInput) {
    const nextErrors: Partial<Record<keyof AgencyProfileInput, string>> = {};
    if (!next.companyName.trim()) nextErrors.companyName = "Required";
    if (!next.agencyName.trim()) nextErrors.agencyName = "Required";
    if (!next.email.trim()) nextErrors.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) nextErrors.email = "Enter a valid email";
    return nextErrors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminProfile({
        ...form,
        companyName: form.companyName.trim(),
        agencyName: form.agencyName.trim(),
        domainName: form.domainName.trim(),
        email: form.email.trim(),
        contactNo: form.contactNo.trim(),
        panNumber: form.panNumber.trim(),
        gstNumber: form.gstNumber.trim(),
        address: form.address.trim(),
      });
      setProfile(updated);
      setForm(toInput(updated));
      setNotice("Profile saved");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (!profile) return;
    setForm(toInput(profile));
    setFieldErrors({});
    setNotice("");
    setError("");
  }

  if (loading || !form || !profile) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={8} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <AdminPageHeader
        title="My profile"
        description="Agency identity and contact details used across the admin panel."
        action={
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!dirty || saving}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="submit" variant="admin" size="sm" disabled={!dirty || saving}>
              <Save className="size-3.5" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        }
      />

      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}

      <div className="flex items-center gap-3 rounded-md border border-admin-border bg-admin-surface px-3 py-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-admin-accent-soft text-[13px] font-semibold text-admin-accent">
          {initials(form.agencyName || form.companyName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-admin-ink">{form.agencyName}</p>
          <p className="truncate text-[11px] text-admin-ink-subtle">
            {form.email} · @{profile.username}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminSection title="Company" icon={Building2} description="Legal and trading identity">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Company name" error={fieldErrors.companyName}>
              <Input
                value={form.companyName}
                onChange={(e) => patch("companyName", e.target.value)}
              />
            </Field>
            <Field label="Agency name" error={fieldErrors.agencyName}>
              <Input
                value={form.agencyName}
                onChange={(e) => patch("agencyName", e.target.value)}
              />
            </Field>
            <Field label="PAN number" className="sm:col-span-1">
              <Input
                value={form.panNumber}
                onChange={(e) => patch("panNumber", e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="GST number">
              <Input
                value={form.gstNumber}
                onChange={(e) => patch("gstNumber", e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>
        </AdminSection>

        <AdminSection title="Contact" icon={Phone} description="How customers reach you">
          <div className="grid gap-2.5">
            <Field label="Email" error={fieldErrors.email}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-admin-ink-subtle" />
                <Input
                  type="email"
                  className="pl-8"
                  value={form.email}
                  onChange={(e) => patch("email", e.target.value)}
                />
              </div>
            </Field>
            <Field label="Contact number">
              <Input
                value={form.contactNo}
                onChange={(e) => patch("contactNo", e.target.value)}
              />
            </Field>
            <Field label="Address">
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => patch("address", e.target.value)}
              />
            </Field>
          </div>
        </AdminSection>

        <AdminSection title="Account" icon={Globe} description="Public web presence">
          <div className="grid gap-2.5">
            <Field label="Domain name">
              <Input
                value={form.domainName}
                onChange={(e) => patch("domainName", e.target.value)}
              />
            </Field>
            <Field label="Admin username" hint="Set by server configuration — not editable here.">
              <Input value={profile.username} readOnly disabled />
            </Field>
            <p className="text-[11px] text-admin-ink-subtle">
              Last updated {profile.updatedAt ? formatDateTime(profile.updatedAt) : "—"}
            </p>
          </div>
        </AdminSection>

        <AdminSection title="Security" icon={Shield} description="Sign-in credentials">
          <div className="space-y-2 text-[12px] text-admin-ink-muted">
            <div className="flex items-start gap-2 rounded-md bg-admin-muted px-2.5 py-2">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-admin-ink-subtle" />
              <p>
                Password is managed by the server environment
                {profile.passwordManagedBy ? ` (${profile.passwordManagedBy})` : ""}. It cannot be
                changed from this screen.
              </p>
            </div>
            <div className="flex items-center gap-2 text-admin-ink-subtle">
              <UserCircle className="size-3.5" />
              Signed in as <span className="font-medium text-admin-ink">{profile.username}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-admin-ink-subtle" />
              <p>{form.address || "No address on file"}</p>
            </div>
          </div>
        </AdminSection>
      </div>
    </form>
  );
}
