/**
 * Admin session helpers.
 *
 * The session itself is an HttpOnly cookie the browser sends automatically; JavaScript never sees
 * it. All we hold here is the CSRF token, in memory only, which the API requires on every write.
 * After a page reload it is re-read from `GET /api/admin/session` (see `loadAdminSession`).
 */
import { apiClient } from "@/lib/api/client";

const LEGACY_TOKEN_KEY = "tripime_admin_token";

let csrfToken: string | null = null;

/** Remove the bearer token older versions kept in localStorage. */
export function purgeLegacyAdminToken(): void {
  try {
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getAdminCsrf(): string | null {
  return csrfToken;
}

export function setAdminCsrf(token: string | null): void {
  csrfToken = token;
}

export function clearAdminSession(): void {
  csrfToken = null;
  if (typeof window !== "undefined") purgeLegacyAdminToken();
}

/** Asks the server whether the cookie is a valid admin session; remembers its CSRF token. */
export async function loadAdminSession(): Promise<boolean> {
  try {
    const { data } = await apiClient.get<{ authenticated: boolean; csrfToken: string | null }>(
      "/api/admin/session",
    );
    csrfToken = data.authenticated ? data.csrfToken : null;
    return data.authenticated;
  } catch {
    csrfToken = null;
    return false;
  }
}
