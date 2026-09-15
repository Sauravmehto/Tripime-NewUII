"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Save, UserCircle, X } from "lucide-react";
import { getAdminWebsite, updateAdminWebsiteGeneral } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useAdminAuthError } from "./use-admin-auth-error";
import { AdminPageHeader } from "./admin-page-header";
import { AdminErrorState } from "./ui/admin-error-state";
import { AdminLoading } from "./ui/admin-loading";
import { AdminSection } from "./ui/admin-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { WebsiteAccount, WebsiteAgency, WebsiteCms, WebsiteGeneral } from "@/types";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

function blank(value: string) {
  return value.trim() ? value : "—";
}

function ReadGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[128px_1fr] gap-2 text-[12px]">
          <dt className="font-medium text-admin-ink-muted">{row.label}</dt>
          <dd className="min-w-0 break-words text-admin-ink">{blank(row.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminWebsiteGeneralView() {
  const handleAuthError = useAdminAuthError();
  const [cms, setCms] = useState<WebsiteCms | null>(null);
  const [general, setGeneral] = useState<WebsiteGeneral | null>(null);
  const [editing, setEditing] = useState<"account" | "agency" | null>(null);
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
        setGeneral(data.general);
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

  const saved = cms?.general;
  const accountDirty = useMemo(
    () => Boolean(saved && general && JSON.stringify(general.account) !== JSON.stringify(saved.account)),
    [general, saved],
  );
  const agencyDirty = useMemo(
    () => Boolean(saved && general && JSON.stringify(general.agency) !== JSON.stringify(saved.agency)),
    [general, saved],
  );

  function patchAccount(patch: Partial<WebsiteAccount>) {
    setGeneral((prev) => (prev ? { ...prev, account: { ...prev.account, ...patch } } : prev));
    setNotice("");
  }

  function patchAgency(patch: Partial<WebsiteAgency>) {
    setGeneral((prev) => (prev ? { ...prev, agency: { ...prev.agency, ...patch } } : prev));
    setNotice("");
  }

  async function saveSection(section: "account" | "agency") {
    if (!general) return;
    if (section === "account") {
      if (!general.account.firstName.trim() || !general.account.lastName.trim() || !general.account.email.trim()) {
        setError("First name, last name, and email are required.");
        return;
      }
    } else if (!general.agency.agencyName.trim()) {
      setError("Agency name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updated = await updateAdminWebsiteGeneral({
        account: {
          ...general.account,
          firstName: general.account.firstName.trim(),
          lastName: general.account.lastName.trim(),
          email: general.account.email.trim(),
        },
        agency: {
          ...general.agency,
          agencyName: general.agency.agencyName.trim(),
          domainName: general.agency.domainName.trim(),
        },
      });
      setCms(updated);
      setGeneral(updated.general);
      setEditing(null);
      setNotice(section === "account" ? "Account information saved" : "Agency information saved");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function cancelSection(section: "account" | "agency") {
    if (!saved) return;
    setGeneral((prev) =>
      prev
        ? {
            ...prev,
            account: section === "account" ? saved.account : prev.account,
            agency: section === "agency" ? saved.agency : prev.agency,
          }
        : prev,
    );
    setEditing(null);
    setError("");
    setNotice("");
  }

  if (loading || !general || !cms) {
    return error ? <AdminErrorState message={error} /> : <AdminLoading rows={8} />;
  }

  const account = general.account;
  const agency = general.agency;

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="General setting"
        description="Account and agency details for this website."
      />
      {error ? <AdminErrorState message={error} /> : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success-50 px-3 py-1.5 text-[12px] text-success-700">
          {notice}
        </p>
      ) : null}
      {cms.updatedAt ? (
        <p className="text-[11px] text-admin-ink-subtle">Last saved {formatDateTime(cms.updatedAt)}</p>
      ) : null}

      <AdminSection
        title="Account information"
        icon={UserCircle}
        action={
          editing === "account" ? (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={saving}
                onClick={() => cancelSection("account")}
              >
                <X className="size-3" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="admin"
                size="xs"
                disabled={saving || !accountDirty}
                onClick={() => void saveSection("account")}
              >
                <Save className="size-3" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="xs" onClick={() => setEditing("account")}>
              <Pencil className="size-3" />
              Edit
            </Button>
          )
        }
      >
        {editing === "account" ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="First name">
              <Input value={account.firstName} onChange={(e) => patchAccount({ firstName: e.target.value })} />
            </Field>
            <Field label="Last name">
              <Input value={account.lastName} onChange={(e) => patchAccount({ lastName: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={account.email} onChange={(e) => patchAccount({ email: e.target.value })} />
            </Field>
            <Field label="Mobile number">
              <Input value={account.mobileNumber} onChange={(e) => patchAccount({ mobileNumber: e.target.value })} />
            </Field>
            <Field label="Display number">
              <Input
                value={account.displayNumber}
                onChange={(e) => patchAccount({ displayNumber: e.target.value })}
              />
            </Field>
            <Field label="Alternative phone number">
              <Input
                value={account.alternativePhone}
                onChange={(e) => patchAccount({ alternativePhone: e.target.value })}
              />
            </Field>
            <Field label="Country">
              <Input value={account.country} onChange={(e) => patchAccount({ country: e.target.value })} />
            </Field>
            <Field label="State">
              <Select value={account.state} onChange={(e) => patchAccount({ state: e.target.value })}>
                <option value="">Select</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="City">
              <Input value={account.city} onChange={(e) => patchAccount({ city: e.target.value })} />
            </Field>
            <Field label="Pincode">
              <Input value={account.pincode} onChange={(e) => patchAccount({ pincode: e.target.value })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea rows={2} value={account.address} onChange={(e) => patchAccount({ address: e.target.value })} />
            </Field>
          </div>
        ) : (
          <ReadGrid
            rows={[
              { label: "First name", value: account.firstName },
              { label: "Last name", value: account.lastName },
              { label: "Email", value: account.email },
              { label: "Mobile number", value: account.mobileNumber },
              { label: "Display number", value: account.displayNumber },
              { label: "Alternative phone", value: account.alternativePhone },
              { label: "Country", value: account.country },
              { label: "State", value: account.state },
              { label: "City", value: account.city },
              { label: "Pincode", value: account.pincode },
              { label: "Address", value: account.address },
            ]}
          />
        )}
      </AdminSection>

      <AdminSection
        title="Agency information"
        icon={Building2}
        action={
          editing === "agency" ? (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={saving}
                onClick={() => cancelSection("agency")}
              >
                <X className="size-3" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="admin"
                size="xs"
                disabled={saving || !agencyDirty}
                onClick={() => void saveSection("agency")}
              >
                <Save className="size-3" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="xs" onClick={() => setEditing("agency")}>
              <Pencil className="size-3" />
              Edit
            </Button>
          )
        }
      >
        {editing === "agency" ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Domain name">
              <Input value={agency.domainName} onChange={(e) => patchAgency({ domainName: e.target.value })} />
            </Field>
            <Field label="Agency name">
              <Input value={agency.agencyName} onChange={(e) => patchAgency({ agencyName: e.target.value })} />
            </Field>
            <Field label="Whitelabel type">
              <Select
                value={agency.whitelabelType}
                onChange={(e) => patchAgency({ whitelabelType: e.target.value })}
              >
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </Select>
            </Field>
            <Field label="GST number">
              <Input value={agency.gstNumber} onChange={(e) => patchAgency({ gstNumber: e.target.value })} />
            </Field>
            <Field label="PAN number">
              <Input value={agency.panNumber} onChange={(e) => patchAgency({ panNumber: e.target.value })} />
            </Field>
            <Field label="Domain supplier name">
              <Input
                value={agency.domainSupplierName}
                onChange={(e) => patchAgency({ domainSupplierName: e.target.value })}
              />
            </Field>
          </div>
        ) : (
          <ReadGrid
            rows={[
              { label: "Domain name", value: agency.domainName },
              { label: "Agency name", value: agency.agencyName },
              { label: "Whitelabel type", value: agency.whitelabelType },
              { label: "GST number", value: agency.gstNumber },
              { label: "PAN number", value: agency.panNumber },
              { label: "Domain supplier", value: agency.domainSupplierName },
            ]}
          />
        )}
      </AdminSection>
    </div>
  );
}
