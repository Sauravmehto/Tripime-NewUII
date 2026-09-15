import { AdminPackagesView } from "@/components/admin/admin-packages-view";

export const metadata = { title: "Package itinerary" };

export default function AdminPackageItineraryPage() {
  return <AdminPackagesView catalog="itinerary" />;
}
