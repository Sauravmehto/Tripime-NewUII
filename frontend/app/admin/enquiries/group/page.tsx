import { AdminEnquiriesView } from "@/components/admin/admin-enquiries-view";

export const metadata = { title: "Group enquiries" };

export default function AdminGroupEnquiriesPage() {
  return <AdminEnquiriesView source="group" />;
}
