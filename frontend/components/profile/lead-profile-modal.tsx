"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { useCustomerProfile } from "@/context/customer-profile-provider";
import { Logo } from "@/components/brand/logo";
import { getErrorMessage } from "@/lib/api/client";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  normalizeNationalNumber,
} from "@/lib/phone-countries";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Tab = "register" | "login";

/**
 * Compact field sizing for this sheet. Text stays 16px below `sm` because
 * iOS Safari zooms the page when a focused field's text is smaller.
 */
const FIELD = "h-10 min-h-10 rounded-lg text-base sm:text-sm lg:h-10 lg:min-h-10 lg:text-sm";

/** Treat the keyboard as open once the visible viewport loses this much height. */
const KEYBOARD_THRESHOLD = 0.75;

/**
 * The part of the screen not covered by the on-screen keyboard. Mobile Safari
 * and Chrome on Android shrink only the visual viewport when the keyboard
 * opens, so a fixed overlay sized to the layout viewport would sit behind it.
 */
function useVisibleViewport(active: boolean) {
  const [box, setBox] = useState<{ top: number; height: number; keyboard: boolean } | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setBox({
          top: vv.offsetTop,
          height: vv.height,
          keyboard: vv.height < window.innerHeight * KEYBOARD_THRESHOLD,
        });
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setBox(null);
    };
  }, [active]);

  return box;
}

/** Scroll `el` into view inside `container`, clear of the pinned footer. */
function revealInside(container: HTMLElement, el: HTMLElement, footer: HTMLElement | null) {
  const box = container.getBoundingClientRect();
  const target = el.getBoundingClientRect();
  const bottomEdge = box.bottom - (footer?.offsetHeight ?? 0) - 8;
  if (target.bottom > bottomEdge) container.scrollTop += target.bottom - bottomEdge;
  else if (target.top < box.top + 8) container.scrollTop -= box.top + 8 - target.top;
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

export function LeadProfileModal({
  open,
  signupPage,
  onDismiss,
  initialTab = "register",
}: {
  open: boolean;
  signupPage: string;
  onDismiss: () => void;
  initialTab?: Tab;
}) {
  const { register, login } = useCustomerProfile();
  const titleId = useId();
  const honeypotRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_PHONE_COUNTRY.dial);
  const [mobile, setMobile] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loginHint, setLoginHint] = useState(false);
  const viewport = useVisibleViewport(open);
  const keyboardOpen = viewport?.keyboard ?? false;

  // Reset to the requested tab each time the modal opens (adjusted during render, not in an effect).
  const [lastOpen, setLastOpen] = useState({ open, initialTab });
  if (lastOpen.open !== open || lastOpen.initialTab !== initialTab) {
    setLastOpen({ open, initialTab });
    if (open) setTab(initialTab);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onDismiss]);

  // Keep a new error message on screen, above the pinned Continue button.
  useEffect(() => {
    if (error && scrollRef.current && errorRef.current) {
      revealInside(scrollRef.current, errorRef.current, footerRef.current);
    }
  }, [error]);

  // When the keyboard finishes opening, the sheet has shrunk; bring the focused
  // field back into view.
  useEffect(() => {
    const field = document.activeElement;
    if (!keyboardOpen || !(field instanceof HTMLElement) || !scrollRef.current?.contains(field)) return;
    revealInside(scrollRef.current, field, footerRef.current);
  }, [keyboardOpen, viewport?.height]);

  if (!open) return null;

  function handleFocus(e: FocusEvent<HTMLDivElement>) {
    const field = e.target;
    const container = scrollRef.current;
    if (!container || !(field instanceof HTMLElement)) return;
    // Wait for the keyboard animation before measuring.
    window.setTimeout(() => revealInside(container, field, footerRef.current), 320);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoginHint(false);
    const national = normalizeNationalNumber(mobile);
    if (!email.trim() || !national) {
      setError("Email and phone are required.");
      return;
    }
    if (tab === "register" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const tpHp = honeypotRef.current?.value ?? "";
    setSubmitting(true);
    try {
      if (tab === "register") {
        await register({
          name: name.trim(),
          email: email.trim(),
          countryCode,
          mobile: national,
          signupPage,
          consent: true,
          tpHp,
        });
      } else {
        await login({
          email: email.trim(),
          countryCode,
          mobile: national,
          tpHp,
        });
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      if (tab === "login") setLoginHint(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex h-dvh items-end justify-center sm:items-center sm:p-4"
      // Follow the visible viewport so the sheet sits above the on-screen keyboard.
      style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
    >
      <div
        className="absolute inset-0 touch-none bg-ink/55 animate-overlay-in"
        onClick={onDismiss}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-[1] flex w-[calc(100%-24px)] flex-col overflow-hidden rounded-2xl bg-white shadow-elevated ring-1 ring-ink/5 animate-sheet-up",
          "max-h-[min(85dvh,calc(100%-24px))] mb-[max(12px,env(safe-area-inset-bottom))] sm:mb-0 sm:max-w-[372px]",
        )}
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="absolute right-1.5 top-1.5 z-10 flex size-10 items-center justify-center rounded-lg text-ink-muted transition hover:bg-neutral-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <X className="size-4" />
        </button>

        {/* Header: logo + copy, collapsed to a single line while the keyboard is up. */}
        <div className={cn("shrink-0 px-4 text-center", keyboardOpen ? "py-2.5 pr-12 text-left" : "pb-2.5 pt-3.5")}>
          {!keyboardOpen && <Logo className="mx-auto h-7" priority />}
          <h2
            id={titleId}
            className={cn("font-semibold tracking-tight text-ink", keyboardOpen ? "text-[15px]" : "mt-2 text-[17px]")}
          >
            {tab === "register" ? "Welcome to Tripime" : "Welcome back"}
          </h2>
          {!keyboardOpen && (
            <p className="mx-auto mt-0.5 max-w-[17rem] text-[11px] leading-snug text-ink-muted">
              Save your details once to prefill enquiry forms. Not used for bookings or invoices.
            </p>
          )}
        </div>

        <div className="flex shrink-0 border-b border-neutral-100 px-4" role="tablist" aria-label="Account">
          {(
            [
              { id: "register", label: "Register" },
              { id: "login", label: "Login" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => {
                setTab(item.id);
                setError("");
                setLoginHint(false);
              }}
              className={cn(
                "min-h-10 flex-1 border-b-2 px-2 text-[13px] font-semibold transition",
                tab === item.id
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div
            ref={scrollRef}
            onFocus={handleFocus}
            className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 pb-2 pt-3"
          >
            {tab === "register" && (
              <CompactField label="Full name">
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  enterKeyHint="next"
                  className={FIELD}
                />
              </CompactField>
            )}

            <CompactField label="Email">
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                enterKeyHint="next"
                className={FIELD}
              />
            </CompactField>

            <CompactField label="Phone">
              <div className="flex gap-2">
                <Select
                  aria-label="Country code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className={cn(FIELD, "w-[6.75rem] shrink-0 px-2")}
                >
                  {PHONE_COUNTRIES.map((c) => (
                    <option key={`${c.code}-${c.dial}`} value={c.dial}>
                      {c.code} {c.dial}
                    </option>
                  ))}
                </Select>
                <Input
                  required
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  autoComplete="tel-national"
                  enterKeyHint="done"
                  className={cn(FIELD, "min-w-0 flex-1")}
                />
              </div>
            </CompactField>

            {/* Honeypot — obscure name/id so browsers do not autofill company data */}
            <div
              className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0"
              aria-hidden
            >
              <input
                ref={honeypotRef}
                id="tp_hp_field"
                name="tp_hp_field"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>

            {error && (
              <p
                ref={errorRef}
                role="alert"
                className="rounded-lg bg-danger-50 px-3 py-2 text-[11px] font-medium leading-snug text-danger-700"
              >
                {error}
              </p>
            )}

            {loginHint && tab === "login" && (
              <p className="text-[11px] text-ink-muted">
                New here?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary-700 hover:text-primary-800"
                  onClick={() => {
                    setTab("register");
                    setError("");
                    setLoginHint(false);
                  }}
                >
                  Register instead
                </button>
              </p>
            )}
          </div>

          {/* Pinned so Continue stays reachable while the fields scroll. */}
          <div
            ref={footerRef}
            className="shrink-0 border-t border-neutral-100 bg-white px-4 pb-3 pt-2.5"
          >
            <Button
              type="submit"
              variant="accent"
              className="h-10 w-full rounded-lg text-[13px]"
              disabled={submitting}
            >
              {submitting
                ? "Please wait…"
                : tab === "register"
                  ? "Continue"
                  : "Log in"}
            </Button>
            <p className="mt-2 text-center text-[10px] leading-snug text-ink-subtle">
              By continuing you agree to be contacted by Tripime about your trip.{" "}
              <Link href="/privacy" className="font-semibold text-primary-700 hover:underline">
                Privacy policy
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
