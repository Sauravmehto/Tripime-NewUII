"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  fetchCustomerProfileMe,
  loginCustomerProfile,
  registerCustomerProfile,
  type CustomerProfileLoginPayload,
  type CustomerProfileRegisterPayload,
} from "@/lib/api/customer-profile";
import type { CustomerProfile } from "@/types";

const STORAGE_KEY = "tripime_customer_profile_session";
const DISMISS_KEY = "tripime_profile_popup_dismissed_until";
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

type StoredSession = {
  token: string;
  customer: CustomerProfile;
};

type CustomerProfileContextValue = {
  customer: CustomerProfile | null;
  ready: boolean;
  hasProfile: boolean;
  register: (payload: CustomerProfileRegisterPayload) => Promise<void>;
  login: (payload: CustomerProfileLoginPayload) => Promise<void>;
  logout: () => void;
  isPopupDismissed: () => boolean;
  dismissPopup: () => void;
  openProfileModal: (opts?: { tab?: "register" | "login" }) => void;
  closeProfileModal: () => void;
  profileModalOpen: boolean;
  preferredTab: "register" | "login";
};

const CustomerProfileContext = createContext<CustomerProfileContextValue | null>(
  null,
);

function readStored(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.customer?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(session: StoredSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function CustomerProfileProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [preferredTab, setPreferredTab] = useState<"register" | "login">("register");

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const stored = readStored();
      if (!stored) {
        if (!cancelled) setReady(true);
        return;
      }

      // Optimistic restore so enquiry forms can prefill before /me returns.
      if (!cancelled) {
        setCustomer(stored.customer);
        setToken(stored.token);
      }

      try {
        const me = await fetchCustomerProfileMe(stored.token);
        if (cancelled) return;
        setCustomer(me);
        setToken(stored.token);
        writeStored({ token: stored.token, customer: me });
      } catch (err) {
        if (cancelled) return;
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        // Only wipe on auth failure. Network / 5xx keep cached profile for greeting + autofill.
        if (status === 401 || status === 403) {
          writeStored(null);
          setCustomer(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback((session: { token: string; customer: CustomerProfile }) => {
    setToken(session.token);
    setCustomer(session.customer);
    writeStored(session);
    setProfileModalOpen(false);
  }, []);

  const register = useCallback(
    async (payload: CustomerProfileRegisterPayload) => {
      const session = await registerCustomerProfile(payload);
      applySession(session);
    },
    [applySession],
  );

  const login = useCallback(
    async (payload: CustomerProfileLoginPayload) => {
      const session = await loginCustomerProfile(payload);
      applySession(session);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    writeStored(null);
    setCustomer(null);
    setToken(null);
  }, []);

  const isPopupDismissed = useCallback(() => {
    if (typeof window === "undefined") return false;
    const until = Number(window.localStorage.getItem(DISMISS_KEY) || "0");
    return Number.isFinite(until) && until > Date.now();
  }, []);

  const dismissPopup = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    setProfileModalOpen(false);
  }, []);

  const openProfileModal = useCallback((opts?: { tab?: "register" | "login" }) => {
    setPreferredTab(opts?.tab ?? "register");
    setProfileModalOpen(true);
  }, []);

  const value = useMemo<CustomerProfileContextValue>(
    () => ({
      customer,
      ready,
      hasProfile: Boolean(customer && token),
      register,
      login,
      logout,
      isPopupDismissed,
      dismissPopup,
      openProfileModal,
      closeProfileModal: () => setProfileModalOpen(false),
      profileModalOpen,
      preferredTab,
    }),
    [
      customer,
      ready,
      token,
      register,
      login,
      logout,
      isPopupDismissed,
      dismissPopup,
      openProfileModal,
      profileModalOpen,
      preferredTab,
    ],
  );

  return (
    <CustomerProfileContext.Provider value={value}>
      {children}
    </CustomerProfileContext.Provider>
  );
}

export function useCustomerProfile() {
  const ctx = useContext(CustomerProfileContext);
  if (!ctx) {
    throw new Error("useCustomerProfile must be used within CustomerProfileProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (shouldn't happen on marketing). */
export function useCustomerProfileOptional() {
  return useContext(CustomerProfileContext);
}
