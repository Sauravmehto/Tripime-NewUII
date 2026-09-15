import type { Metadata } from "next";
import { MyBookingView } from "@/components/booking/my-booking-view";

export const metadata: Metadata = { title: "My Booking" };

export default function MyBookingPage() {
  return <MyBookingView />;
}
