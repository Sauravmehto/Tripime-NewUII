import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/layout/container";

const SPACING = {
  sm: "py-[var(--section-space-sm)]",
  md: "py-[var(--section-space-md)] lg:py-[var(--section-space-lg)]",
  lg: "py-[var(--section-space-lg)]",
  xl: "py-[var(--section-space-lg)] lg:py-[var(--section-space-xl)]",
} as const;

export function Section({
  children,
  className,
  containerClassName,
  spacing = "md",
  as: Tag = "section",
  containerSize = "default",
  id,
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  spacing?: keyof typeof SPACING;
  as?: ElementType;
  containerSize?: "default" | "narrow";
  id?: string;
}) {
  return (
    <Tag id={id} className={cn(SPACING[spacing], className)}>
      <Container narrow={containerSize === "narrow"} className={containerClassName}>
        {children}
      </Container>
    </Tag>
  );
}
