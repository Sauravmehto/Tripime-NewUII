import { AdminEnquiriesView } from "@/components/admin/admin-enquiries-view";

export const metadata = { title: "Contact us enquiries" };

export default function AdminContactEnquiriesPage() {
  return <AdminEnquiriesView source="contact" />;
}
