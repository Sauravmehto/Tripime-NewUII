import type { ReactNode } from "react";
import { AdminRootLayout } from "@/components/admin/admin-root-layout";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRootLayout>{children}</AdminRootLayout>;
}
