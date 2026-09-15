"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { getAdminToken, setAdminToken } from "@/lib/admin-auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function AdminLoginView() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getAdminToken()) router.replace("/admin/profile");
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { token } = await adminLogin(username.trim(), password);
      setAdminToken(token);
      router.replace("/admin/profile");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-app flex min-h-screen items-center justify-center bg-admin-canvas px-4">
      <div className="w-full max-w-sm rounded-md border border-admin-border bg-admin-surface p-5">
        <div className="mb-4 flex flex-col items-center">
          <Logo className="h-7" />
          <p className="mt-2 text-[12px] font-medium text-admin-ink-subtle">Admin sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Username">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>

          {error && (
            <p role="alert" className="text-[12px] font-medium text-danger-700">
              {error}
            </p>
          )}

          <Button type="submit" variant="admin" size="sm" className="w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
