import type { NextConfig } from "next";

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();

// Fail Netlify builds if the Render API URL was forgotten (baked in at build time).
if (process.env.NETLIFY === "true" && !apiBase) {
  throw new Error(
    "Netlify build requires NEXT_PUBLIC_API_BASE_URL (e.g. https://tripime-new.onrender.com). Set it under Site settings → Environment variables.",
  );
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
    ],
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
