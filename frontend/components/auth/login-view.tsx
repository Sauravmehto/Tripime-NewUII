"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import { requestSignInCode, verifySignInCode } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { safeNextPath } from "@/lib/safe-redirect";
import { useCustomerSession } from "@/context/customer-session-provider";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const { session, refresh } = useCustomerSession();
  const { selectedFlight } = useBooking();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devHint, setDevHint] = useState<{ kind: "dev_fixed" | "dev_log"; code?: string | null } | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  // Seconds until another code can be requested (matches the server's cooldown).
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  // Already signed in: carry on straight away.
  useEffect(() => {
    if (session?.authenticated) router.replace(next);
  }, [session, next, router]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await requestSignInCode(value);
      setDevHint(result.delivery === "email" ? null : { kind: result.delivery, code: result.devCode });
      setCooldown(45);
      setStep("code");
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      // Already sent recently: stay on / move to the code step instead of showing an error.
      if (status === 429 && /just sent/i.test(getErrorMessage(err))) {
        setStep("code");
        setCooldown(20);
      }
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await verifySignInCode(email.trim(), code);
      await refresh();
      router.replace(next);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  const bookingNext = next.startsWith("/booking/");

  return (
    <Container narrow className="py-10">
      <Card padded={false} className="mx-auto max-w-md overflow-hidden">
        <div className="bg-linear-to-r from-primary-800 to-primary-600 px-6 py-6 text-white">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
            <Lock className="size-3.5" aria-hidden /> Secure sign-in
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {bookingNext ? "Sign in to continue your booking" : "Sign in to Tripime"}
          </h1>
          {bookingNext && selectedFlight && (
            <p className="mt-2 text-sm text-white/85">
              Your {selectedFlight.origin.code} → {selectedFlight.destination.code} flight on{" "}
              {selectedFlight.departureDate} is saved — you won&apos;t need to search again.
            </p>
          )}
        </div>

        <div className="p-6">
          {step === "email" ? (
            <form onSubmit={sendCode} noValidate className="space-y-4">
              <Field label="Email address">
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : "login-hint"}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  autoFocus
                />
              </Field>
              <p id="login-hint" className="flex items-start gap-1.5 text-xs text-ink-muted">
                <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                We&apos;ll email you a 6-digit code. No password needed.
              </p>
              {error && <Err id="login-error" msg={error} />}
              <Button type="submit" size="lg" variant="accent" className="w-full" disabled={busy}>
                {busy ? "Sending code…" : "Email me a code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} noValidate className="space-y-4">
              <p className="text-sm text-ink-muted">
                {devHint?.kind === "dev_fixed" ? (
                  <>Signing in as <strong className="text-ink">{email.trim()}</strong>.</>
                ) : (
                  <>
                    We sent a code to <strong className="text-ink">{email.trim()}</strong>. It expires in 10 minutes.
                  </>
                )}
              </p>
              {devHint?.kind === "dev_fixed" && (
                <p role="status" className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-ink">
                  <strong>Development mode:</strong> email isn&apos;t set up yet, so no email was sent. Enter the
                  test code <strong className="font-mono text-sm">{devHint.code}</strong>.
                </p>
              )}
              {devHint?.kind === "dev_log" && (
                <p role="status" className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-ink">
                  <strong>Development mode:</strong> email isn&apos;t configured, so the code was printed in the
                  backend server log instead of being emailed.
                </p>
              )}
              <Field label="6-digit code">
                <Input
                  ref={codeRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  className="text-center font-mono text-lg tracking-[0.4em]"
                />
              </Field>
              {error && <Err id="login-error" msg={error} />}
              <Button type="submit" size="lg" variant="accent" className="w-full" disabled={busy}>
                {busy ? "Checking…" : "Sign in"}
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-primary-700"
                >
                  <ArrowLeft className="size-3.5" aria-hidden /> Use another email
                </button>
                <button
                  type="button"
                  disabled={busy || cooldown > 0}
                  onClick={() => void sendCode()}
                  className="font-semibold text-primary-700 disabled:cursor-not-allowed disabled:text-ink-subtle"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
          <p className="mt-6 flex items-start gap-1.5 border-t border-neutral-100 pt-4 text-[11px] text-ink-subtle">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-success-700" aria-hidden />
            Searching flights never needs an account. We ask you to sign in only to book, so your booking
            stays private to you.
          </p>
        </div>
      </Card>
    </Container>
  );
}

function Err({ id, msg }: { id: string; msg: string }) {
  return (
    <p id={id} role="alert" className="text-sm text-danger-700">
      {msg}
    </p>
  );
}
