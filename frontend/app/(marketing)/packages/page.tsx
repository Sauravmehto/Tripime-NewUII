import type { Metadata } from "next";
import { PackagesPageView } from "@/components/packages/packages-page-view";

export const metadata: Metadata = {
  title: "Holiday Packages",
  description:
    "Browse curated domestic and international holiday packages on Tripime — planned by real travel experts.",
};

export default function PackagesPage() {
  return <PackagesPageView />;
}
