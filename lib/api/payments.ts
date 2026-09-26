import { apiClient } from "./client";
import type { MockPaymentRequest, PaymentMeta } from "@/types";

export async function processMockPayment(
  payload: MockPaymentRequest,
): Promise<PaymentMeta> {
  const { data } = await apiClient.post<PaymentMeta>(
    "/api/payments/mock",
    payload,
  );
  return data;
}
