import { apiClient } from "./client";
import type { PaymentConfig } from "@/types";

/** Checkout settings: provider, test mode and the payee UPI ID. No secrets. */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const { data } = await apiClient.get<PaymentConfig>("/api/payments/config");
  return data;
}
