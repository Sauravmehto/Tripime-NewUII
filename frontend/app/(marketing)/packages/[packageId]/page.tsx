import type { Metadata } from "next";
import { PackageDetailView } from "@/components/packages/package-detail-view";

export const metadata: Metadata = { title: "Package details" };

export default function PackageDetailPage() {
  return <PackageDetailView />;
}
