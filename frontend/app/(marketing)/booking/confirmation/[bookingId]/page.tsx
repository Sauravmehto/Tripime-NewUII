import { redirect } from "next/navigation";

/** Older links: /booking/confirmation/<id> → /booking/confirmation?ref=<id>. */
export default async function LegacyConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  redirect(`/booking/confirmation?ref=${encodeURIComponent(bookingId)}`);
}
