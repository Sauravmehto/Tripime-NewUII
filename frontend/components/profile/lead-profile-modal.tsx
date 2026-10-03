"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
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
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Tab = "register" | "login";

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
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_PHONE_COUNTRY.dial);
  const [mobile, setMobile] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loginHint, setLoginHint] = useState(false);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

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

  if (!open) return null;

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
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/55 animate-overlay-in"
        onClick={onDismiss}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-[1] flex max-h-[92vh] w-full flex-col overflow-hidden bg-white shadow-elevated",
          "rounded-t-2xl sm:max-w-md sm:rounded-2xl",
          "animate-sheet-up",
        )}
      >
        <div className="relative border-b border-neutral-100 px-5 pb-4 pt-5">
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-lg text-ink-muted transition hover:bg-neutral-100 hover:text-ink sm:size-9"
          >
            <X className="size-5" />
          </button>
          <div className="flex flex-col items-center text-center">
            <Logo className="h-9" priority />
            <h2 id={titleId} className="mt-3 text-lg font-bold tracking-tight text-ink">
              {tab === "register" ? "Welcome to Tripime" : "Welcome back"}
            </h2>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">
              Save your details once — we&apos;ll greet you and prefill enquiry forms. This is
              not used to access bookings or invoices.
            </p>
          </div>
        </div>

        <div className="flex gap-1 border-b border-neutral-100 px-4 pt-2">
          {(
            [
              { id: "register", label: "Register" },
              { id: "login", label: "Login" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setError("");
                setLoginHint(false);
              }}
              className={cn(
                "flex-1 border-b-2 px-2 py-2.5 text-sm font-semibold transition",
                tab === item.id
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form className="overflow-y-auto px-5 py-4" onSubmit={handleSubmit}>
          {tab === "register" && (
            <Field label="Full name">
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </Field>
          )}

          <div className={cn(tab === "register" && "mt-3")}>
            <Field label="Email">
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Phone">
              <div className="flex gap-2">
                <Select
                  aria-label="Country code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-[7.5rem] shrink-0"
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
                  className="flex-1"
                />
              </div>
            </Field>
          </div>

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
              role="alert"
              className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-xs font-medium text-danger-700"
            >
              {error}
            </p>
          )}

          {loginHint && tab === "login" && (
            <p className="mt-2 text-xs text-ink-muted">
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

          <p className="mt-4 text-[11px] leading-relaxed text-ink-subtle">
            By continuing you agree to be contacted by Tripime about your trip.{" "}
            <Link href="/privacy" className="font-semibold text-primary-700 hover:underline">
              Privacy policy
            </Link>
            .
          </p>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="mt-4 w-full"
            disabled={submitting}
          >
            {submitting
              ? "Please wait…"
              : tab === "register"
                ? "Continue"
                : "Log in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
