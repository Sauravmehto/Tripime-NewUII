import type { Metadata } from "next";
import { ActivitiesPageView } from "@/components/coming-soon/product-page";

export const metadata: Metadata = {
  title: "Activities",
  description:
    "Discover activities and experiences with Tripime. Online activity booking is launching soon; enquire with our experts today.",
};

export default function ActivitiesPage() {
  return <ActivitiesPageView />;
}
