/** Internal destinations we allow after sign-in. Anything else falls back to "/". */
const ALLOWED_PREFIXES = ["/booking/", "/my-booking", "/flights", "/"];

/**
 * Returns `next` only when it's a same-site path (no scheme, no `//host`,
 * no backslashes) under an allowed prefix — prevents open redirects.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n\t]/.test(next)) {
    return fallback;
  }
  try {
    const url = new URL(next, "https://tripime.invalid");
    if (url.origin !== "https://tripime.invalid") return fallback;
    const path = `${url.pathname}${url.search}`;
    return ALLOWED_PREFIXES.some((p) => (p === "/" ? path === "/" : path.startsWith(p))) ? path : fallback;
  } catch {
    return fallback;
  }
}

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(next))}`;
}
