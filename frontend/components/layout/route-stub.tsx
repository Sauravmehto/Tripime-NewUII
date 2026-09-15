import type { ReactNode } from "react";
import { Container } from "./container";
import { PageTransition } from "@/components/motion/page-transition";
import { Badge } from "@/components/ui/card";

export function RouteStub({
  title,
  description,
  phase = "Phase 4+",
  children,
}: {
  title: string;
  description: string;
  phase?: string;
  children?: ReactNode;
}) {
  return (
    <PageTransition>
      <Container className="py-10">
        <Badge tone="neutral">{phase}</Badge>
        <h1 className="mt-3 text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">{description}</p>
        {children}
      </Container>
    </PageTransition>
  );
}
