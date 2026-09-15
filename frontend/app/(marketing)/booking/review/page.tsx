import type { Metadata } from "next";
import { ReviewView } from "@/components/booking/review-view";

export const metadata: Metadata = { title: "Review booking" };

export default function ReviewPage() {
  return <ReviewView />;
}
