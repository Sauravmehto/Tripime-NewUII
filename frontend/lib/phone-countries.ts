export interface PhoneCountry {
  code: string;
  label: string;
  dial: string;
}

/** Compact list — no new npm dependency. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "IN", label: "India", dial: "+91" },
  { code: "AE", label: "UAE", dial: "+971" },
  { code: "US", label: "United States", dial: "+1" },
  { code: "GB", label: "United Kingdom", dial: "+44" },
  { code: "SG", label: "Singapore", dial: "+65" },
  { code: "AU", label: "Australia", dial: "+61" },
  { code: "CA", label: "Canada", dial: "+1" },
  { code: "TH", label: "Thailand", dial: "+66" },
  { code: "MY", label: "Malaysia", dial: "+60" },
  { code: "NP", label: "Nepal", dial: "+977" },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]!;

/** National number only (strip non-digits and a single leading 0). */
export function normalizeNationalNumber(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return digits;
}
