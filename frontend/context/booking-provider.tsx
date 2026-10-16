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
import type {
  ContactForm,
  Flight,
  PassengerForm,
  SearchParams,
  SelectedSeat,
} from "@/types";

/**
 * The booking created for the current checkout. `fingerprint` captures what was
 * booked; if the traveller changes anything, a new checkout (and booking) starts.
 */
export interface CheckoutState {
  key: string;
  fingerprint: string;
  bookingId?: string;
  accessToken?: string;
}

// v2: search carries trip type, traveller mix and cabin; seats carry a leg.
const STORAGE_KEY = "tripime_booking_v2";

interface PersistedBookingState {
  search: SearchParams | null;
  selectedFlight: Flight | null;
  selectedReturnFlight: Flight | null;
  passengers: PassengerForm[];
  contact: ContactForm;
  selectedSeats: SelectedSeat[];
  checkout: CheckoutState | null;
}

function loadPersisted(): PersistedBookingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedBookingState) : null;
  } catch {
    return null;
  }
}

function persist(state: PersistedBookingState) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clearPersisted() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface BookingState {
  search: SearchParams | null;
  selectedFlight: Flight | null;
  selectedReturnFlight: Flight | null;
  passengers: PassengerForm[];
  contact: ContactForm;
  selectedSeats: SelectedSeat[];
  seatCharges: number;
  checkout: CheckoutState | null;
  setSearch: (search: SearchParams) => void;
  setSelectedFlight: (flight: Flight) => void;
  setSelectedReturnFlight: (flight: Flight | null) => void;
  setPassengers: (passengers: PassengerForm[]) => void;
  setContact: (contact: ContactForm) => void;
  setSelectedSeats: (seats: SelectedSeat[]) => void;
  setCheckout: (checkout: CheckoutState | null) => void;
  reset: () => void;
}

const defaultContact: ContactForm = { email: "", phone: "" };

const BookingContext = createContext<BookingState | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState<SearchParams | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [contact, setContact] = useState<ContactForm>(defaultContact);
  const [selectedSeats, setSelectedSeatsState] = useState<SelectedSeat[]>([]);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);

  useEffect(() => {
    const restored = loadPersisted();
    if (restored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from sessionStorage on mount
      setSearch(restored.search);
      setSelectedFlight(restored.selectedFlight);
      setSelectedReturnFlight(restored.selectedReturnFlight ?? null);
      setPassengers(restored.passengers);
      setContact(restored.contact);
      setSelectedSeatsState(restored.selectedSeats);
      setCheckout(restored.checkout ?? null);
    }
    setHydrated(true);
  }, []);

  const setSelectedSeats = useCallback((seats: SelectedSeat[]) => {
    setSelectedSeatsState(seats);
  }, []);

  const seatCharges = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seat.price, 0),
    [selectedSeats],
  );

  const reset = useCallback(() => {
    setSearch(null);
    setSelectedFlight(null);
    setSelectedReturnFlight(null);
    setPassengers([]);
    setContact(defaultContact);
    setSelectedSeatsState([]);
    setCheckout(null);
    clearPersisted();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist({ search, selectedFlight, selectedReturnFlight, passengers, contact, selectedSeats, checkout });
  }, [hydrated, search, selectedFlight, selectedReturnFlight, passengers, contact, selectedSeats, checkout]);

  const value = useMemo(
    () => ({
      search,
      selectedFlight,
      selectedReturnFlight,
      passengers,
      contact,
      selectedSeats,
      seatCharges,
      checkout,
      setSearch,
      setSelectedFlight,
      setSelectedReturnFlight,
      setPassengers,
      setContact,
      setSelectedSeats,
      setCheckout,
      reset,
    }),
    [
      search,
      selectedFlight,
      selectedReturnFlight,
      passengers,
      contact,
      selectedSeats,
      seatCharges,
      checkout,
      setSelectedSeats,
      reset,
    ],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
