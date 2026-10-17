/** Passenger-form rules — mirrors the booking API's checks so errors show inline. */

import { addDays } from "@/lib/airports";
import type { DocumentRequirements, PassengerForm, PassengerType, TravellerCounts } from "@/types";

export const TITLES: Record<PassengerType, string[]> = {
  adult: ["Mr", "Mrs", "Ms", "Dr"],
  child: ["Mstr", "Miss"],
  infant: ["Mstr", "Miss"],
};

export function passengerTypes(counts: TravellerCounts): PassengerType[] {
  return [
    ...Array<PassengerType>(counts.adults).fill("adult"),
    ...Array<PassengerType>(counts.children).fill("child"),
    ...Array<PassengerType>(counts.infants).fill("infant"),
  ];
}

export function emptyPassengerOf(type: PassengerType): PassengerForm {
  return {
    type,
    title: TITLES[type][0],
    firstName: "",
    lastName: "",
    gender: "Male",
    dateOfBirth: "",
  };
}

/** Forms for the current traveller mix, keeping anything already typed for the same slot. */
export function passengerFormsFor(counts: TravellerCounts, existing: PassengerForm[]): PassengerForm[] {
  const pool = [...existing];
  return passengerTypes(counts).map((type) => {
    const index = pool.findIndex((p) => p.type === type);
    return index >= 0 ? pool.splice(index, 1)[0] : emptyPassengerOf(type);
  });
}

function yearsBefore(iso: string, years: number): string {
  return `${Number(iso.slice(0, 4)) - years}${iso.slice(4)}`;
}

function ageOn(dob: string, on: string): number {
  const years = Number(on.slice(0, 4)) - Number(dob.slice(0, 4));
  return on.slice(5) < dob.slice(5) ? years - 1 : years;
}

/** Allowed date-of-birth range per passenger type for this trip. */
export function dobBounds(type: PassengerType, firstTravel: string, lastTravel: string, today: string) {
  if (type === "adult") return { min: "1900-01-01", max: yearsBefore(firstTravel, 12) };
  if (type === "child") {
    return { min: addDays(yearsBefore(firstTravel, 12), 1), max: yearsBefore(firstTravel, 2) };
  }
  return { min: addDays(yearsBefore(lastTravel, 2), 1), max: today };
}

export interface TripContext {
  firstTravel: string;
  requirements: DocumentRequirements;
}

/** Field errors for one passenger, keyed by field name (mirrors the booking API). */
export function validatePassenger(p: PassengerForm, trip: TripContext): Partial<Record<keyof PassengerForm, string>> {
  const errors: Partial<Record<keyof PassengerForm, string>> = {};
  const { requirements } = trip;
  const lastTravel = requirements.lastTravelDate;
  if (!p.firstName.trim()) errors.firstName = "Required";
  else if (/\d/.test(p.firstName)) errors.firstName = "Names can't contain digits";
  if (!p.lastName.trim()) errors.lastName = "Required";
  else if (/\d/.test(p.lastName)) errors.lastName = "Names can't contain digits";
  if (!p.dateOfBirth) errors.dateOfBirth = "Required";
  else {
    const age = ageOn(p.dateOfBirth, trip.firstTravel);
    if (p.dateOfBirth > new Date().toISOString().slice(0, 10)) errors.dateOfBirth = "Date of birth can't be in the future";
    else if (p.type === "adult" && age < 12) errors.dateOfBirth = "Adults must be 12 or older on the travel date";
    else if (p.type === "child" && (age < 2 || age >= 12)) errors.dateOfBirth = "Children must be 2–11 on the travel date";
    else if (p.type === "infant" && ageOn(p.dateOfBirth, lastTravel) >= 2) {
      errors.dateOfBirth = "Infants must be under 2 for the whole trip";
    }
  }
  if (requirements.passportRequired) {
    const passport = (p.passportNumber ?? "").trim();
    if (!/^[A-Za-z0-9]{6,9}$/.test(passport)) errors.passportNumber = "6–9 letters or digits";
    if (!p.passportExpiry) errors.passportExpiry = "Required";
    else if (p.passportExpiry <= lastTravel) errors.passportExpiry = "Expires before your trip ends";
  }
  if (requirements.nationalityRequired && !(p.nationality ?? "").trim()) errors.nationality = "Required";
  return errors;
}

/** Valid for the trip but less than ~6 months beyond it — worth a warning, not an error. */
export function passportValidityWarning(p: PassengerForm, requirements: DocumentRequirements): boolean {
  if (!requirements.passportRequired || !p.passportExpiry || p.passportExpiry <= requirements.lastTravelDate) return false;
  return p.passportExpiry < addDays(requirements.lastTravelDate, 182);
}

/** Index of each passenger that repeats an earlier one (same name and date of birth). */
export function duplicateTravellers(passengers: PassengerForm[]): Set<number> {
  const seen = new Map<string, number>();
  const dupes = new Set<number>();
  passengers.forEach((p, i) => {
    if (!p.firstName.trim() || !p.lastName.trim() || !p.dateOfBirth) return;
    const key = `${p.firstName.trim().toLowerCase()}|${p.lastName.trim().toLowerCase()}|${p.dateOfBirth}`;
    if (seen.has(key)) dupes.add(i);
    else seen.set(key, i);
  });
  return dupes;
}
