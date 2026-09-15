import { apiClient } from "./client";
import type { Enquiry, EnquiryPayload } from "@/types";

export async function createEnquiry(payload: EnquiryPayload): Promise<Enquiry> {
  const { data } = await apiClient.post<Enquiry>("/api/enquiries", payload);
  return data;
}
