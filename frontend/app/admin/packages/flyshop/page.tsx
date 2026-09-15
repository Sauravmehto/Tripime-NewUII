import { AdminPackagesView } from "@/components/admin/admin-packages-view";

export const metadata = { title: "Flyshop packages" };

export default function AdminFlyshopPackagesPage() {
  return <AdminPackagesView catalog="flyshop" />;
}
