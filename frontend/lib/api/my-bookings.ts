import { apiClient } from "./client";

export type InquiryStatus =
  | "new"
  | "contacted"
  | "follow_up_required"
  | "quote_shared"
  | "converted"
  | "not_interested"
  | "cancelled";

export type InquirySource = "whatsapp" | "package_booking" | "brochure_request" | "contact_form" | "custom_trip";

/** A signed-in customer's own inquiry. An inquiry is never a booking. */
export interface PackageInquiry {
  id: string;
  package_id: string | null;
  package_name: string;
  destination: string;
  package_price: number | null;
  price_note: string;
  image_url: string;
  package_url: string | null;
  inquiry_source: InquirySource;
  inquiry_type: string;
  inquiry_status: InquiryStatus;
  created_at: string;
  updated_at: string;
  /** "confirmed" only when a linked booking has really been confirmed. */
  booking_confirmation: "not_confirmed" | "confirmed";
  whatsapp_message: string;
}

export interface InquiryResult {
  inquiry: PackageInquiry;
  /** False when a very recent identical inquiry was returned instead of saving a duplicate. */
  created: boolean;
}

/** Saves a WhatsApp click or brochure request for the signed-in customer. Only the package id is sent; the server fills in the rest. */
export async function createPackageInquiry(
  packageId: string,
  source: "whatsapp" | "brochure_request" = "whatsapp",
): Promise<InquiryResult> {
  const { data } = await apiClient.post<InquiryResult>("/api/my-bookings/inquiries", {
    package_id: packageId,
    inquiry_source: source,
  });
  return data;
}

export async function listMyInquiries(): Promise<PackageInquiry[]> {
  const { data } = await apiClient.get<PackageInquiry[]>("/api/my-bookings/inquiries");
  return data;
}
