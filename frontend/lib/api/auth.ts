import { apiClient } from "./client";

export interface SessionInfo {
  authenticated: boolean;
  email?: string | null;
  customerId?: string | null;
  name?: string | null;
  /** True after a support reset: the customer must choose their own password first. */
  mustChangePassword?: boolean;
}

/** Same limits as the server (see backend customer_account_service). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export async function registerAccount(name: string, email: string, password: string): Promise<SessionInfo> {
  const { data } = await apiClient.post<SessionInfo>("/api/auth/register", { name, email, password });
  return data;
}

export async function signIn(email: string, password: string): Promise<SessionInfo> {
  const { data } = await apiClient.post<SessionInfo>("/api/auth/login", { email, password });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<SessionInfo> {
  const { data } = await apiClient.post<SessionInfo>("/api/auth/password", { currentPassword, newPassword });
  return data;
}

export async function getSession(): Promise<SessionInfo> {
  const { data } = await apiClient.get<SessionInfo>("/api/auth/session");
  return data;
}

export async function signOut(): Promise<void> {
  await apiClient.post("/api/auth/logout");
}
