"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, signOut, type SessionInfo } from "@/lib/api/auth";

interface CustomerSessionState {
  /** null while the first check is in flight. */
  session: SessionInfo | null;
  refresh: () => Promise<SessionInfo>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<CustomerSessionState | null>(null);
const GUEST: SessionInfo = { authenticated: false };

/** Customer sign-in state from the HttpOnly session cookie (checked with the API). */
export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getSession();
      setSession(next);
      return next;
    } catch {
      setSession(GUEST);
      return GUEST;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((next) => !cancelled && setSession(next))
      .catch(() => !cancelled && setSession(GUEST));
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } finally {
      setSession(GUEST);
    }
  }, []);

  const value = useMemo(() => ({ session, refresh, logout }), [session, refresh, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useCustomerSession(): CustomerSessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useCustomerSession must be used within CustomerSessionProvider");
  return ctx;
}
