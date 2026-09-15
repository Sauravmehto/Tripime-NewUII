"use client";

import { useEffect, useState } from "react";
import { getAdminWebsite } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { useAdminAuthError } from "@/components/admin/use-admin-auth-error";
import type { WebsiteCms } from "@/types";

export function cmsId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function useAdminCmsList<T>(
  pick: (cms: WebsiteCms) => T[],
  save: (items: T[]) => Promise<WebsiteCms>,
  pickSaved: (cms: WebsiteCms) => T[],
) {
  const handleAuthError = useAdminAuthError();
  const [items, setItems] = useState<T[]>([]);
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
        setItems(pick(data) ?? []);
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
    // pick is stable when defined inline... callers should wrap or we omit pick from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleAuthError]);

  async function persist(next: T[], message: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await save(next);
      setItems(pickSaved(updated));
      setNotice(message);
      return true;
    } catch (err) {
      if (handleAuthError(err)) return false;
      setError(getErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    items,
    loading,
    saving,
    error,
    notice,
    setError,
    persist,
  };
}
