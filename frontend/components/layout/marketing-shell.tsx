import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { FloatingHelp } from "./floating-help";
import { ToastProvider } from "@/components/ui/toast";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <FloatingHelp />
    </ToastProvider>
  );
}
