"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound } from "lucide-react";
import { loginHref } from "@/lib/safe-redirect";
import { useCustomerSession } from "@/context/customer-session-provider";
import { Container } from "@/components/layout/container";
import { Card, Skeleton } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { ChangePasswordForm } from "./change-password-form";

export function AccountPasswordView() {
  const router = useRouter();
  const { session, refresh } = useCustomerSession();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session && !session.authenticated) router.replace(loginHref("/account/password"));
  }, [session, router]);

  return (
    <Container narrow className="py-8">
      <Card className="mx-auto max-w-md">
        <h1 className="flex items-center gap-2 text-lg font-bold text-ink">
          <KeyRound className="size-4.5 text-primary-600" aria-hidden />
          Change password
        </h1>
        {session?.email && <p className="mt-0.5 text-[13px] text-ink-muted">{session.email}</p>}

        <div className="mt-4">
          {!session?.authenticated ? (
            <Skeleton className="h-48" />
          ) : saved ? (
            <div role="status" className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-success-700">
                <CheckCircle2 className="size-4" aria-hidden /> Your password has been changed.
              </p>
              <Link href="/my-booking" className={buttonClasses({ variant: "outline", size: "md" })}>
                Go to my bookings
              </Link>
            </div>
          ) : (
            <ChangePasswordForm
              onDone={async () => {
                await refresh();
                setSaved(true);
              }}
            />
          )}
        </div>
      </Card>
    </Container>
  );
}
