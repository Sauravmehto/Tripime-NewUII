import { apiClient } from "@/lib/api/client";
import type { CustomerProfile, CustomerProfileSession } from "@/types";

export interface CustomerProfileRegisterPayload {
  name: string;
  email: string;
  countryCode: string;
  mobile: string;
  signupPage?: string;
  consent: boolean;
  /** Honeypot — must stay empty */
  tpHp?: string;
}

export interface CustomerProfileLoginPayload {
  email: string;
  countryCode: string;
  mobile: string;
  /** Honeypot — must stay empty */
  tpHp?: string;
}

export async function registerCustomerProfile(
  payload: CustomerProfileRegisterPayload,
): Promise<CustomerProfileSession> {
  const { data } = await apiClient.post<CustomerProfileSession>(
    "/api/customer-profile/register",
    payload,
  );
  return data;
}

export async function loginCustomerProfile(
  payload: CustomerProfileLoginPayload,
): Promise<CustomerProfileSession> {
  const { data } = await apiClient.post<CustomerProfileSession>(
    "/api/customer-profile/login",
    payload,
  );
  return data;
}

export async function fetchCustomerProfileMe(
  token: string,
): Promise<CustomerProfile> {
  const { data } = await apiClient.get<CustomerProfile>("/api/customer-profile/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}
