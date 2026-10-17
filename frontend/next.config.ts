import type { NextConfig } from "next";

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();

// Fail Netlify builds if the Render API URL was forgotten (baked in at build time).
if (process.env.NETLIFY === "true" && !apiBase) {
  throw new Error(
    "Netlify build requires NEXT_PUBLIC_API_BASE_URL (e.g. https://tripime-new.onrender.com). Set it under Site settings → Environment variables.",
  );
}

const isDev = process.env.NODE_ENV === "development";
const gtmEnabled = Boolean((process.env.NEXT_PUBLIC_GTM_ID ?? "").trim());

/** Origin only (no path), so `connect-src` allows the Render API and nothing else on that host. */
function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy. Ships as REPORT-ONLY by default: violations show in the browser console
 * but nothing is blocked. Set CSP_MODE=enforce at build time once staging shows no violations.
 *
 * Known, deliberate looseness (the app is statically rendered, so per-request nonces are not
 * available without making every page dynamic):
 *  - script-src 'unsafe-inline': Next.js emits inline bootstrap scripts, and GTM's snippet is inline.
 *  - style-src 'unsafe-inline': inline `style=` attributes and framework style tags.
 *  - img-src/media-src https:: admin-managed banner, theme and testimonial images are arbitrary URLs.
 * Not used: 'unsafe-eval' in production (development only, for React debugging).
 */
function contentSecurityPolicy(): string {
  const api = originOf(apiBase);
  const gtm = gtmEnabled
    ? {
        script: ["https://www.googletagmanager.com"],
        // Unverified until staging: GTM tags decide what else it loads. Extend from reported violations.
        connect: [
          "https://www.googletagmanager.com",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
        ],
        frame: ["https://www.googletagmanager.com"],
      }
    : { script: [], connect: [], frame: [] };

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...gtm.script],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "blob:", "https:"],
    "font-src": ["'self'"], // next/font self-hosts Inter at build time
    "connect-src": ["'self'", ...(api ? [api] : []), ...gtm.connect],
    // Creator reels (YouTube, Instagram), the admin-set support map, and GTM's noscript iframe.
    "frame-src": [
      "https://www.youtube.com",
      "https://www.instagram.com",
      "https://www.google.com/maps/",
      ...gtm.frame,
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"], // ignored in Report-Only mode; X-Frame-Options below covers it
  };
  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // upgrade-insecure-requests is intentionally omitted: it is ignored in Report-Only mode and would
  // break plain-http local testing. Netlify serves HTTPS; HSTS is a staging-validation item.
  return parts.join("; ");
}

const cspHeaderName =
  process.env.CSP_MODE === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

const securityHeaders = [
  { key: cspHeaderName, value: contentSecurityPolicy() },
  // These are enforced regardless of CSP_MODE.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    // Production / Netlify: browser calls Render directly — no local rewrite.
    if (apiBase) return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8002/api/:path*",
      },
    ];
  },
};

export default nextConfig;
