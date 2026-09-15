import { MarketingShell } from "@/components/layout/marketing-shell";
import { BookingProvider } from "@/context/booking-provider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BookingProvider>
      <MarketingShell>{children}</MarketingShell>
    </BookingProvider>
  );
}
