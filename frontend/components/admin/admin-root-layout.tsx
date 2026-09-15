"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminGuard } from "./admin-guard";
import { AdminShell } from "./admin-shell";

export function AdminRootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <AdminGuard>
      {isLogin ? children : <AdminShell>{children}</AdminShell>}
    </AdminGuard>
  );
}
