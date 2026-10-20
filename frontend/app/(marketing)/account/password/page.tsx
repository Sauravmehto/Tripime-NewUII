import type { Metadata } from "next";
import { AccountPasswordView } from "@/components/auth/account-password-view";

export const metadata: Metadata = { title: "Change password", robots: { index: false } };

export default function AccountPasswordPage() {
  return <AccountPasswordView />;
}
