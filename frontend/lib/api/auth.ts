import { apiClient } from "./client";

export interface SessionInfo {
  authenticated: boolean;
  email?: string | null;
  customerId?: string | null;
}

export interface CodeRequestResult {
  /** "email" normally; "dev_fixed" / "dev_log" only in development without email configured. */
  delivery: "email" | "dev_fixed" | "dev_log";
  expiresInSeconds: number;
  /** Development only: the fixed code to type. */
  devCode?: string | null;
}

export async function requestSignInCode(email: string): Promise<CodeRequestResult> {
  const { data } = await apiClient.post<CodeRequestResult>("/api/auth/code", { email });
  return data;
}

export async function verifySignInCode(email: string, code: string): Promise<SessionInfo> {
  const { data } = await apiClient.post<SessionInfo>("/api/auth/verify", { email, code });
  return data;
}

export async function getSession(): Promise<SessionInfo> {
  const { data } = await apiClient.get<SessionInfo>("/api/auth/session");
  return data;
}

export async function signOut(): Promise<void> {
  await apiClient.post("/api/auth/logout");
}
