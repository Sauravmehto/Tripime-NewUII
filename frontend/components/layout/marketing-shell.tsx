import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { FloatingHelp } from "./floating-help";
import { ToastProvider } from "@/components/ui/toast";
import { CustomerProfileProvider } from "@/context/customer-profile-provider";
import { LeadProfileGate } from "@/components/profile/lead-profile-gate";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CustomerProfileProvider>
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <FloatingHelp />
        <LeadProfileGate />
      </CustomerProfileProvider>
    </ToastProvider>
  );
}
