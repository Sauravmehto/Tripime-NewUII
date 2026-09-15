import { AdminEnquiriesView } from "@/components/admin/admin-enquiries-view";

export const metadata = { title: "Service page enquiries" };

export default function AdminServiceEnquiriesPage() {
  return <AdminEnquiriesView source="service" />;
}
