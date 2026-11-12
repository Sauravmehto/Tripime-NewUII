import { apiClient } from "./client";
import { getAdminCsrf } from "@/lib/admin-auth";
import type { InquirySource, InquiryStatus } from "./my-bookings";

export type { InquirySource, InquiryStatus } from "./my-bookings";
export type InquiryPriority = "low" | "normal" | "high";

/** The full inquiry record the admin team works from. */
export interface AdminInquiry {
  inquiry_id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  is_registered: boolean;
  package_id: string | null;
  package_name: string;
  destination: string;
  package_price: number | null;
  package_url: string | null;
  inquiry_source: InquirySource;
  inquiry_type: string;
  inquiry_message: string;
  inquiry_status: InquiryStatus;
  assigned_to: string;
  priority: InquiryPriority;
  admin_notes: string;
  follow_up_date: string | null;
  whatsapp_clicked_at: string | null;
  converted_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InquiryActivity {
  activity_id: number;
  inquiry_id: string;
  action: string;
  actor_type: "customer" | "admin" | "system" | "whatsapp";
  actor: string;
  detail: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface WhatsAppMessage {
  message_id: string;
  inquiry_id: string | null;
  sender_phone: string;
  sender_name: string;
  body: string;
  message_type: string;
  message_timestamp: string;
  received_at: string;
}

export interface InquiryDetail {
  inquiry: AdminInquiry;
  activities: InquiryActivity[];
  whatsapp_messages: WhatsAppMessage[];
}

export interface InquiryPage {
  items: AdminInquiry[];
  total: number;
  page: number;
  page_size: number;
}

export interface InquiryStats {
  total: number;
  new: number;
  pending_follow_ups: number;
  contacted: number;
  quote_shared: number;
  converted: number;
  not_interested: number;
  cancelled: number;
}

export interface InquiryQuery {
  search?: string;
  status?: InquiryStatus | "";
  source?: InquirySource | "";
  assigned_to?: string;
  priority?: InquiryPriority | "";
  date_from?: string;
  date_to?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export interface InquiryChanges {
  inquiry_status?: InquiryStatus;
  assigned_to?: string;
  priority?: InquiryPriority;
  /** YYYY-MM-DD, or "" to clear. */
  follow_up_date?: string;
  /** Existing booking reference, or "" to clear. */
  converted_booking_id?: string;
}

/** The session cookie is sent by the browser; writes also need the CSRF token held in memory. */
function authHeaders(): Record<string, string> {
  const csrf = getAdminCsrf();
  return csrf ? { "X-CSRF-Token": csrf } : {};
}

function clean(query: InquiryQuery): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") out[key] = value as string | number;
  }
  return out;
}

export async function listAdminInquiries(query: InquiryQuery): Promise<InquiryPage> {
  const { data } = await apiClient.get<InquiryPage>("/api/admin/inquiries", { params: clean(query), headers: authHeaders() });
  return data;
}

export async function getAdminInquiryStats(): Promise<InquiryStats> {
  const { data } = await apiClient.get<InquiryStats>("/api/admin/inquiries/stats", { headers: authHeaders() });
  return data;
}

export async function getAdminInquiryTeam(): Promise<string[]> {
  const { data } = await apiClient.get<{ members: string[] }>("/api/admin/inquiries/team", { headers: authHeaders() });
  return data.members;
}

export async function getAdminInquiry(id: string): Promise<InquiryDetail> {
  const { data } = await apiClient.get<InquiryDetail>(`/api/admin/inquiries/${encodeURIComponent(id)}`, { headers: authHeaders() });
  return data;
}

export async function updateAdminInquiry(id: string, changes: InquiryChanges): Promise<AdminInquiry> {
  const { data } = await apiClient.patch<AdminInquiry>(`/api/admin/inquiries/${encodeURIComponent(id)}`, changes, { headers: authHeaders() });
  return data;
}

export async function addAdminInquiryNote(id: string, note: string): Promise<AdminInquiry> {
  const { data } = await apiClient.post<AdminInquiry>(`/api/admin/inquiries/${encodeURIComponent(id)}/notes`, { note }, { headers: authHeaders() });
  return data;
}
