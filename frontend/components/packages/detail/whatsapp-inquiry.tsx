"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, MessageCircle, TriangleAlert } from "lucide-react";
import { useCustomerSession } from "@/context/customer-session-provider";
import { createPackageInquiry } from "@/lib/api/my-bookings";
import { getErrorMessage } from "@/lib/api/client";
import { buttonClasses } from "@/components/ui/button";
import { whatsappLink } from "@/lib/contact";
import { loginHref } from "@/lib/safe-redirect";
import { cn } from "@/lib/cn";

type Phase =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "opened" }
  | { kind: "blocked"; url: string }
  | { kind: "error"; message: string };

/**
 * "WhatsApp us" for a package: sign-in required, the inquiry is saved first, and WhatsApp opens only after the
 * server confirms it. Opening WhatsApp does not prove a message was sent, so the saved inquiry stays "pending".
 */
export type InquiryAction = "whatsapp" | "brochure_request";

export function useWhatsappInquiry(packageId: string, source: InquiryAction = "whatsapp") {
  const actionParam = source === "whatsapp" ? "whatsapp" : "brochure";
  const router = useRouter();
  const search = useSearchParams();
  const { session, refresh } = useCustomerSession();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const busy = useRef(false); // blocks double clicks before React re-renders
  const returnedFromLogin = search.get("action") === actionParam;
  const [resumeNotice, setResumeNotice] = useState(returnedFromLogin);

  // Coming back from sign-in lands here with ?action=whatsapp. Browsers block pop-ups that are not
  // started by a tap, so the visitor taps once more instead of us opening WhatsApp automatically.
  useEffect(() => {
    if (returnedFromLogin && session?.authenticated) {
      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      window.history.replaceState(null, "", url.pathname + (url.search || ""));
    }
  }, [returnedFromLogin, session?.authenticated]);

  const start = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setResumeNotice(false);
    try {
      const current = session ?? (await refresh());
      if (!current.authenticated || current.mustChangePassword) {
        router.push(loginHref(`/packages/${packageId}?action=${actionParam}`));
        return;
      }
      setPhase({ kind: "saving" });
      const { inquiry } = await createPackageInquiry(packageId, source);
      const url = whatsappLink(inquiry.whatsapp_message);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      setPhase(opened ? { kind: "opened" } : { kind: "blocked", url });
    } catch (err) {
      setPhase({ kind: "error", message: getErrorMessage(err) });
    } finally {
      busy.current = false;
    }
  }, [actionParam, packageId, refresh, router, session, source]);

  return { start, phase, source, saving: phase.kind === "saving", signedIn: Boolean(session?.authenticated), resumeNotice };
}

export type WhatsappInquiry = ReturnType<typeof useWhatsappInquiry>;

export function WhatsappInquiryButton({
  inquiry,
  size = "sm",
  className,
  compactIcon = false,
}: {
  inquiry: WhatsappInquiry;
  size?: "sm" | "xl";
  className?: string;
  compactIcon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void inquiry.start()}
      disabled={inquiry.saving}
      aria-busy={inquiry.saving}
      className={cn(buttonClasses({ size, variant: "secondary", className: "w-full" }), className)}
    >
      {inquiry.saving ? (
        <LoaderCircle className={cn(compactIcon ? "size-3.5" : "size-4", "animate-spin")} aria-hidden />
      ) : (
        <MessageCircle className={compactIcon ? "size-3.5" : "size-4"} aria-hidden />
      )}
      {inquiry.saving ? "Saving inquiry…" : "WhatsApp us"}
    </button>
  );
}

/** Polite status line under the WhatsApp button(s). */
export function WhatsappInquiryStatus({ inquiry, className }: { inquiry: WhatsappInquiry; className?: string }) {
  const { phase, resumeNotice, signedIn } = inquiry;
  let body: React.ReactNode = null;
  let tone = "text-ink-muted";
  let icon: React.ReactNode = null;

  const brochure = inquiry.source === "brochure_request";
  if (phase.kind === "saving") {
    body = brochure ? "Preparing your brochure request…" : "Preparing your WhatsApp inquiry…";
    icon = <LoaderCircle className="size-3.5 animate-spin" aria-hidden />;
  } else if (phase.kind === "opened") {
    body = (
      <>
        {brochure ? "Your request has been saved! Opening WhatsApp…" : "Your inquiry has been saved! Opening WhatsApp…"}{" "}
        <Link href="/my-booking" className="font-semibold text-primary-700 underline">
          View My Bookings
        </Link>
      </>
    );
    tone = "text-success-700";
    icon = <CheckCircle2 className="size-3.5" aria-hidden />;
  } else if (phase.kind === "blocked") {
    body = (
      <>
        {brochure ? "Your request is saved." : "Your inquiry is saved."} You can still access it from{" "}
        <Link href="/my-booking" className="font-semibold text-primary-700 underline">
          My Bookings
        </Link>
        .{" "}
        <a href={phase.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-700 underline">
          Open WhatsApp
        </a>
      </>
    );
    tone = "text-success-700";
    icon = <CheckCircle2 className="size-3.5" aria-hidden />;
  } else if (phase.kind === "error") {
    body = `${phase.message} Nothing was opened, so please try again.`;
    tone = "text-danger-700";
    icon = <TriangleAlert className="size-3.5" aria-hidden />;
  } else if (resumeNotice && signedIn) {
    body = brochure
      ? "You're signed in. Tap Ask for brochure to save your request and continue."
      : "You're signed in. Tap WhatsApp us to save your inquiry and continue.";
    tone = "text-primary-700";
  }

  if (!body) return null;
  return (
    <p
      role={phase.kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn("flex items-start gap-1.5 text-xs leading-snug", tone, className)}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <span>{body}</span>
    </p>
  );
}
