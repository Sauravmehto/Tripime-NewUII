import { AdminEnquiriesView } from "@/components/admin/admin-enquiries-view";

export const metadata = { title: "Itinerary enquiries" };

export default function AdminItineraryEnquiriesPage() {
  return <AdminEnquiriesView source="itinerary" />;
}
