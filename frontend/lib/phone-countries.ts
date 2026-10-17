export interface PhoneCountry {
  code: string;
  label: string;
  dial: string;
  /** National-number length range; mirrors the backend's PHONE_RULES. */
  min?: number;
  max?: number;
  /** Optional leading-digit rule, e.g. Indian mobiles start 6–9. */
  pattern?: RegExp;
}

/** Compact list — no new npm dependency. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "IN", label: "India", dial: "+91", min: 10, max: 10, pattern: /^[6-9]/ },
  { code: "AE", label: "UAE", dial: "+971", min: 8, max: 9 },
  { code: "US", label: "United States", dial: "+1", min: 10, max: 10 },
  { code: "GB", label: "United Kingdom", dial: "+44", min: 10, max: 10 },
  { code: "SG", label: "Singapore", dial: "+65", min: 8, max: 8 },
  { code: "AU", label: "Australia", dial: "+61", min: 9, max: 9 },
  { code: "CA", label: "Canada", dial: "+1", min: 10, max: 10 },
  { code: "TH", label: "Thailand", dial: "+66", min: 9, max: 9 },
  { code: "MY", label: "Malaysia", dial: "+60", min: 9, max: 10 },
  { code: "NP", label: "Nepal", dial: "+977", min: 10, max: 10 },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]!;

/** National number only (strip non-digits and a single leading 0). */
export function normalizeNationalNumber(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return digits;
}

/** Error message for an invalid national number, or null when it looks valid. */
export function phoneError(dial: string, raw: string): string | null {
  const digits = normalizeNationalNumber(raw);
  const country = PHONE_COUNTRIES.find((c) => c.dial === dial);
  const min = country?.min ?? 6;
  const max = country?.max ?? 14;
  if (!digits) return "Enter your mobile number";
  if (digits.length < min || digits.length > max || (country?.pattern && !country.pattern.test(digits))) {
    return `Enter a valid ${country?.label ?? ""} mobile number (${min === max ? min : `${min}–${max}`} digits)`.replace("  ", " ");
  }
  return null;
}
