import { AdminEnquiriesView } from "@/components/admin/admin-enquiries-view";

export const metadata = { title: "Package enquiries" };

export default function AdminPackageEnquiriesPage() {
  return <AdminEnquiriesView source="package" />;
}
