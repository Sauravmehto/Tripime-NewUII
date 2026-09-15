"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { clearAdminToken } from "@/lib/admin-auth";

/** Shared 401 → clear token → login redirect for admin pages. */
export function useAdminAuthError() {
  const router = useRouter();

  return useCallback(
    (err: unknown): boolean => {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearAdminToken();
        router.replace("/admin/login");
        return true;
      }
      return false;
    },
    [router],
  );
}
