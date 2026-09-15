"use client";

import { useEffect } from "react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-16 text-center">
      <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-muted">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </Container>
  );
}
