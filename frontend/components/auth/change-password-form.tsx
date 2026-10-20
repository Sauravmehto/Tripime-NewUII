"use client";

import { useState, type FormEvent } from "react";
import { changePassword, PASSWORD_MIN } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "./password-input";

/** Change password: also used right after signing in with a temporary password from support. */
export function ChangePasswordForm({
  onDone,
  currentLabel = "Current password",
  submitLabel = "Save new password",
}: {
  onDone: () => void | Promise<void>;
  currentLabel?: string;
  submitLabel?: string;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!current) found.current = `Enter your ${currentLabel.toLowerCase()}.`;
    if (next.length < PASSWORD_MIN) found.next = `Use at least ${PASSWORD_MIN} characters.`;
    else if (next === current) found.next = "Choose a password different from the current one.";
    if (confirm !== next) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await changePassword(current, next);
      await onDone();
    } catch (err) {
      setErrors({ form: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <Field label={currentLabel} error={errors.current}>
        <PasswordInput aria-label={currentLabel} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
      </Field>
      <Field label="New password" hint={`At least ${PASSWORD_MIN} characters.`} error={errors.next}>
        <PasswordInput aria-label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Confirm new password" error={errors.confirm}>
        <PasswordInput aria-label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      {errors.form && (
        <p role="alert" className="text-sm text-danger-700">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" variant="accent" className="w-full" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
