import { MarketingShell } from "@/components/layout/marketing-shell";
import { BookingProvider } from "@/context/booking-provider";
import { CustomerSessionProvider } from "@/context/customer-session-provider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerSessionProvider>
      <BookingProvider>
        <MarketingShell>{children}</MarketingShell>
      </BookingProvider>
    </CustomerSessionProvider>
  );
}
