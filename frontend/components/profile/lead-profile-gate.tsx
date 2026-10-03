"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCustomerProfile } from "@/context/customer-profile-provider";
import { LeadProfileModal } from "@/components/profile/lead-profile-modal";

const DELAY_MS = 10_000;

function pathAllowed(pathname: string) {
  return pathname === "/" || pathname === "/packages";
}

function isUserBusyTyping(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

function isBlockingUiOpen(): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector('[role="dialog"]')) return true;
  if (document.querySelector('header button[aria-label="Close menu"][aria-expanded="true"]')) {
    return true;
  }
  return false;
}

export function LeadProfileGate() {
  const pathname = usePathname();
  const {
    ready,
    hasProfile,
    isPopupDismissed,
    dismissPopup,
    profileModalOpen,
    openProfileModal,
    closeProfileModal,
    preferredTab,
  } = useCustomerProfile();

  useEffect(() => {
    if (!ready || hasProfile || isPopupDismissed() || !pathAllowed(pathname)) {
      return;
    }

    let cancelled = false;
    let retry: number | null = null;

    function tryOpen() {
      if (cancelled) return;
      if (isBlockingUiOpen() || isUserBusyTyping()) {
        retry = window.setTimeout(tryOpen, 1500);
        return;
      }
      openProfileModal();
    }

    const timer = window.setTimeout(tryOpen, DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (retry) window.clearTimeout(retry);
    };
  }, [pathname, ready, hasProfile, isPopupDismissed, openProfileModal]);

  // Manual Login (header) can open on any page; auto-timer only runs on / and /packages.
  if (!profileModalOpen) return null;

  return (
    <LeadProfileModal
      open
      signupPage={pathAllowed(pathname) ? pathname : "/"}
      initialTab={preferredTab}
      onDismiss={() => {
        dismissPopup();
        closeProfileModal();
      }}
    />
  );
}
