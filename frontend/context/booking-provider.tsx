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
import type { BookingState, ContactForm, Flight, PassengerForm, SearchParams } from "@/types";

// v3: booking requests (server drafts, no seat map, no client-side payment).
const STORAGE_KEY = "tripime_booking_v3";

/**
 * The server-side draft for the current checkout. `key` is sent with every
 * save so repeats update the same draft; `state` mirrors the server's
 * booking state so steps can be guarded.
 */
export interface CheckoutState {
  key: string;
  bookingId?: string;
  state?: BookingState;
}

export interface BookingProgress {
  /** Set once the request is submitted: the checkout is finished and goes to its status page. */
  submittedId?: string;
  passengersDone: boolean;
  reviewed: boolean;
  seatsDone: boolean;
}

interface PersistedBookingState {
  search: SearchParams | null;
  selectedFlight: Flight | null;
  selectedReturnFlight: Flight | null;
  passengers: PassengerForm[];
  contact: ContactForm;
  checkout: CheckoutState | null;
  seatsAcknowledged: boolean;
}

// Passport details are sensitive: they're kept in memory and saved to the
// server draft, never written to browser storage.
function withoutDocuments(passengers: PassengerForm[]): PassengerForm[] {
  return passengers.map((p) => {
    const copy = { ...p };
    delete copy.passportNumber;
    delete copy.passportExpiry;
    delete copy.nationality;
    return copy;
  });
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
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, passengers: withoutDocuments(state.passengers) }),
    );
  } catch {
    // storage unavailable — the flow still works for this page view
  }
}

function clearPersisted() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface BookingContextState {
  hydrated: boolean;
  search: SearchParams | null;
  selectedFlight: Flight | null;
  selectedReturnFlight: Flight | null;
  passengers: PassengerForm[];
  contact: ContactForm;
  checkout: CheckoutState | null;
  seatsAcknowledged: boolean;
  progress: BookingProgress;
  setSearch: (search: SearchParams) => void;
  /** Selecting flights starts a fresh checkout. */
  selectFlights: (search: SearchParams, flight: Flight, returnFlight: Flight | null) => void;
  setPassengers: (passengers: PassengerForm[]) => void;
  setContact: (contact: ContactForm) => void;
  setCheckout: (checkout: CheckoutState | null) => void;
  setSeatsAcknowledged: (value: boolean) => void;
  reset: () => void;
}

const defaultContact: ContactForm = { email: "", countryCode: "+91", phone: "" };
const BookingContext = createContext<BookingContextState | null>(null);

const REVIEWED_STATES: BookingState[] = ["REVIEWED"];
const PASSENGER_STATES: BookingState[] = ["PASSENGERS_COMPLETED", "REVIEWED"];
const EDITING_STATES: BookingState[] = ["DRAFT", "PASSENGERS_COMPLETED", "REVIEWED"];

export function BookingProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState<SearchParams | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [contact, setContact] = useState<ContactForm>(defaultContact);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [seatsAcknowledged, setSeatsAcknowledged] = useState(false);

  useEffect(() => {
    const restored = loadPersisted();
    if (restored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from sessionStorage on mount
      setSearch(restored.search);
      setSelectedFlight(restored.selectedFlight);
      setSelectedReturnFlight(restored.selectedReturnFlight ?? null);
      setPassengers(restored.passengers ?? []);
      setContact({ ...defaultContact, ...restored.contact });
      setCheckout(restored.checkout ?? null);
      setSeatsAcknowledged(Boolean(restored.seatsAcknowledged));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist({ search, selectedFlight, selectedReturnFlight, passengers, contact, checkout, seatsAcknowledged });
  }, [hydrated, search, selectedFlight, selectedReturnFlight, passengers, contact, checkout, seatsAcknowledged]);

  const selectFlights = useCallback((next: SearchParams, flight: Flight, returnFlight: Flight | null) => {
    setSearch(next);
    setSelectedFlight(flight);
    setSelectedReturnFlight(returnFlight);
    setCheckout(null);
    setSeatsAcknowledged(false);
  }, []);

  const reset = useCallback(() => {
    setSearch(null);
    setSelectedFlight(null);
    setSelectedReturnFlight(null);
    setPassengers([]);
    setContact(defaultContact);
    setCheckout(null);
    setSeatsAcknowledged(false);
    clearPersisted();
  }, []);

  const progress = useMemo<BookingProgress>(() => {
    const state = checkout?.state;
    const passengersDone = Boolean(checkout?.bookingId && state && PASSENGER_STATES.includes(state));
    const reviewed = Boolean(state && REVIEWED_STATES.includes(state));
    const submittedId = state && !EDITING_STATES.includes(state) ? checkout?.bookingId : undefined;
    return { submittedId, passengersDone, reviewed, seatsDone: reviewed && seatsAcknowledged };
  }, [checkout, seatsAcknowledged]);

  const value = useMemo(
    () => ({
      hydrated,
      search,
      selectedFlight,
      selectedReturnFlight,
      passengers,
      contact,
      checkout,
      seatsAcknowledged,
      progress,
      setSearch,
      selectFlights,
      setPassengers,
      setContact,
      setCheckout,
      setSeatsAcknowledged,
      reset,
    }),
    [hydrated, search, selectedFlight, selectedReturnFlight, passengers, contact, checkout, seatsAcknowledged, progress, selectFlights, reset],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
