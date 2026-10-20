"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Lock, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { registerAccount, signIn, PASSWORD_MIN } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { safeNextPath } from "@/lib/safe-redirect";
import { telLink, whatsappLink } from "@/lib/contact";
import { cn } from "@/lib/cn";
import { useCustomerSession } from "@/context/customer-session-provider";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ChangePasswordForm } from "./change-password-form";
import { PasswordInput } from "./password-input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Mode = "signin" | "register";
type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "form", string>>;

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const { session, refresh } = useCustomerSession();
  const { selectedFlight } = useBooking();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const mustChange = Boolean(session?.authenticated && session.mustChangePassword);

  // Already signed in (and no password to change): carry on straight away.
  useEffect(() => {
    if (session?.authenticated && !session.mustChangePassword) router.replace(next);
  }, [session, next, router]);

  function switchMode(to: Mode) {
    setMode(to);
    setErrors({});
    setShowHelp(false);
  }

  function onTabsKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const to: Mode = mode === "signin" ? "register" : "signin";
    switchMode(to);
    requestAnimationFrame(() => tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    const cleanEmail = email.trim();
    if (mode === "register" && !name.trim()) found.name = "Enter your name.";
    if (!EMAIL_RE.test(cleanEmail)) found.email = "Enter a valid email address.";
    if (mode === "register") {
      if (password.length < PASSWORD_MIN) found.password = `Use at least ${PASSWORD_MIN} characters.`;
      if (confirm !== password) found.confirm = "The passwords don't match.";
    } else if (!password) {
      found.password = "Enter your password.";
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      if (mode === "register") await registerAccount(name.trim(), cleanEmail, password);
      else await signIn(cleanEmail, password);
      const now = await refresh();
      // A temporary password from support: the change step renders instead of redirecting.
      if (!now.mustChangePassword) router.replace(next);
    } catch (err) {
      const message = getErrorMessage(err);
      setErrors({ form: message });
      if (/contact support/i.test(message)) setShowHelp(true);
    } finally {
      setBusy(false);
    }
  }

  const bookingNext = next.startsWith("/booking/");
  const title = mustChange
    ? "Set a new password"
    : bookingNext
      ? mode === "register"
        ? "Create an account to book"
        : "Sign in to continue your booking"
      : mode === "register"
        ? "Create your Tripime account"
        : "Sign in to Tripime";

  return (
    <Container narrow className="py-8">
      <Card padded={false} className="mx-auto max-w-md overflow-hidden">
        <div className="bg-linear-to-r from-primary-800 to-primary-600 px-6 py-5 text-white">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
            <Lock className="size-3.5" aria-hidden /> Secure sign-in
          </p>
          <h1 className="mt-1 text-xl font-bold">{title}</h1>
          {bookingNext && selectedFlight && !mustChange && (
            <p className="mt-1.5 text-[13px] text-white/85">
              Your {selectedFlight.origin.code} → {selectedFlight.destination.code} flight on{" "}
              {selectedFlight.departureDate} is saved — you won&apos;t need to search again.
            </p>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {mustChange ? (
            <>
              <p className="mb-4 flex items-start gap-2 rounded-lg bg-primary-50 px-3 py-2 text-[13px] text-primary-800">
                <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
                You signed in with a temporary password from our team. Choose your own password to continue.
              </p>
              <ChangePasswordForm
                currentLabel="Temporary password"
                submitLabel="Save and continue"
                onDone={async () => {
                  await refresh();
                  router.replace(next);
                }}
              />
            </>
          ) : (
            <>
              <div
                ref={tabsRef}
                role="tablist"
                aria-label="Sign in or create an account"
                onKeyDown={onTabsKey}
                className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1"
              >
                {(
                  [
                    ["signin", "Sign in"],
                    ["register", "Create account"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`auth-tab-${id}`}
                    aria-selected={mode === id}
                    aria-controls="auth-panel"
                    tabIndex={mode === id ? 0 : -1}
                    onClick={() => switchMode(id)}
                    className={cn(
                      "h-9 rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                      mode === id ? "bg-white text-ink shadow-xs" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form
                id="auth-panel"
                role="tabpanel"
                aria-labelledby={`auth-tab-${mode}`}
                onSubmit={submit}
                noValidate
                className="space-y-3"
              >
                {mode === "register" && (
                  <Field label="Full name" error={errors.name}>
                    <Input
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      aria-invalid={errors.name ? true : undefined}
                      autoFocus
                    />
                  </Field>
                )}
                <Field label="Email address" error={errors.email}>
                  <Input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={errors.email ? true : undefined}
                    autoFocus={mode === "signin"}
                  />
                </Field>
                <Field
                  label="Password"
                  hint={mode === "register" ? `At least ${PASSWORD_MIN} characters.` : undefined}
                  error={errors.password}
                >
                  <PasswordInput
                    aria-label="Password"
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={errors.password ? true : undefined}
                  />
                </Field>
                {mode === "register" && (
                  <Field label="Confirm password" error={errors.confirm}>
                    <PasswordInput
                      aria-label="Confirm password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      aria-invalid={errors.confirm ? true : undefined}
                    />
                  </Field>
                )}

                {mode === "signin" && (
                  <div className="-mt-1 text-right">
                    <button
                      type="button"
                      onClick={() => setShowHelp((v) => !v)}
                      aria-expanded={showHelp}
                      className="rounded text-xs font-semibold text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {errors.form && (
                  <p role="alert" className="text-sm text-danger-700">
                    {errors.form}
                  </p>
                )}

                {showHelp && (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[13px] text-ink-muted">
                    <p>Contact our team and we&apos;ll set a temporary password for you.</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <a
                        href={whatsappLink(`Hi Tripime, please reset the password for my account${email.trim() ? ` (${email.trim()})` : ""}.`)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded font-semibold text-success-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500"
                      >
                        <MessageCircle className="size-4" aria-hidden /> WhatsApp us
                      </a>
                      <a
                        href={telLink()}
                        className="inline-flex items-center gap-1 rounded font-semibold text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        <Phone className="size-4" aria-hidden /> Call us
                      </a>
                    </div>
                  </div>
                )}

                <Button type="submit" size="lg" variant="accent" className="w-full" disabled={busy}>
                  {busy
                    ? mode === "register"
                      ? "Creating account…"
                      : "Signing in…"
                    : mode === "register"
                      ? "Create account"
                      : "Sign in"}
                </Button>

                <p className="text-center text-xs text-ink-muted">
                  {mode === "signin" ? "New to Tripime? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "signin" ? "register" : "signin")}
                    className="rounded font-semibold text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    {mode === "signin" ? "Create an account" : "Sign in"}
                  </button>
                </p>
              </form>
            </>
          )}

          <p className="mt-5 flex items-start gap-1.5 border-t border-neutral-100 pt-4 text-[11px] text-ink-subtle">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-success-700" aria-hidden />
            Searching flights never needs an account. We ask you to sign in only to book, so your booking stays
            private to you.
          </p>
        </div>
      </Card>
    </Container>
  );
}
