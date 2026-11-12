"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText, ImageOff, LoaderCircle, MessageCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { WhatsappInquiryStatus, useWhatsappInquiry } from "@/components/packages/detail/whatsapp-inquiry";
import { PACKAGE_BROCHURES } from "@/lib/packages/package-brochures";
import type { TravelPackage } from "@/types";

/**
 * Brochure for the package, from real data only: an admin-provided PDF (`pdfUrl`) and/or brochure images.
 * No PDF thumbnail or file size is available, so none is invented.
 */
export function PackageBrochureCard({ pkg, className }: { pkg: TravelPackage; className?: string }) {
  const images = PACKAGE_BROCHURES[pkg.id] ?? [];
  const pdfUrl = pkg.pdfUrl?.trim() ?? "";
  const [imageFailed, setImageFailed] = useState(false);
  const brochureRequest = useWhatsappInquiry(pkg.id, "brochure_request");
  const preview = images[0];
  const primaryUrl = pdfUrl || preview?.src || "";
  const hasBrochure = primaryUrl.length > 0;
  const format = pdfUrl ? "PDF" : "Image";
  const name = `${pkg.title} brochure`;
  const fileName = `${pkg.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "package"}-brochure`;

  return (
    <section
      aria-labelledby="package-brochure-title"
      className={className ?? "rounded-xl border border-neutral-200 bg-white p-3.5 shadow-soft"}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="package-brochure-title" className="text-sm font-bold text-ink">
          Package Brochure
        </h2>
        {hasBrochure ? (
          <span className="rounded-md bg-danger-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger-700">
            {format}
          </span>
        ) : null}
      </div>

      {hasBrochure ? (
        <>
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${name}`}
            className="mt-3 block overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            {preview && !imageFailed && !pdfUrl ? (
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.src}
                  alt={preview.alt}
                  loading="lazy"
                  onError={() => setImageFailed(true)}
                  className="size-full object-cover object-top transition-transform duration-500 hover:scale-[1.03] motion-reduce:transition-none"
                />
              </div>
            ) : (
              <div className="flex h-44 flex-col items-center justify-center gap-2 text-ink-muted">
                {imageFailed && !pdfUrl ? (
                  <>
                    <ImageOff className="size-8" aria-hidden />
                    <span role="alert" className="px-4 text-center text-xs">
                      The preview could not be loaded. You can still open the brochure.
                    </span>
                  </>
                ) : (
                  <>
                    <FileText className="size-10 text-primary-600" aria-hidden />
                    <span className="text-xs font-semibold">PDF document</span>
                  </>
                )}
              </div>
            )}
          </a>
          <p className="mt-2.5 truncate text-[13px] font-semibold text-ink" title={name}>
            {name}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
            Explore the complete package details, inclusions, itinerary and travel information.
          </p>
          <div className="mt-3 grid gap-2">
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ size: "md", variant: "primary", className: "w-full" })}
            >
              <ExternalLink className="size-4" aria-hidden />
              View Brochure
            </a>
            <a
              href={primaryUrl}
              download={fileName}
              className={buttonClasses({ size: "md", variant: "outline", className: "w-full" })}
            >
              <Download className="size-4" aria-hidden />
              Download {format === "PDF" ? "PDF" : "image"}
            </a>
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center">
          <FileText className="mx-auto size-8 text-ink-subtle" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-ink">Brochure not available yet</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Ask a travel expert and we will share the full itinerary, hotels and pricing.
          </p>
          <button
            type="button"
            onClick={() => void brochureRequest.start()}
            disabled={brochureRequest.saving}
            aria-busy={brochureRequest.saving}
            className={buttonClasses({ size: "sm", variant: "outline", className: "mt-3" })}
          >
            {brochureRequest.saving ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <MessageCircle className="size-3.5" aria-hidden />
            )}
            {brochureRequest.saving ? "Saving request…" : "Ask for brochure"}
          </button>
          <WhatsappInquiryStatus inquiry={brochureRequest} className="mt-2 text-left" />
        </div>
      )}
    </section>
  );
}
