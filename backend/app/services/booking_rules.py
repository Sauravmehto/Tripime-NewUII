"""Booking validation rules: travel documents, traveller ages, contact details.

Whether a trip is international comes from the countries of every airport on
the itinerary (including connection airports), not from a hardcoded list.
"""

from __future__ import annotations

import re
from datetime import date, timedelta

from fastapi import HTTPException

from app.models.booking import ContactInput, DocumentRequirements, PassengerInput
from app.models.flight import Flight
from app.providers.flight_network import COUNTRY_NAMES

# National-number lengths per dialling code (subset matching the frontend list).
PHONE_RULES: dict[str, tuple[int, int, str | None]] = {
    "+91": (10, 10, r"^[6-9]"),
    "+971": (8, 9, None),
    "+1": (10, 10, None),
    "+44": (10, 10, None),
    "+65": (8, 8, None),
    "+61": (9, 9, None),
    "+66": (9, 9, None),
    "+60": (9, 10, None),
    "+977": (10, 10, None),
}


def _airports(flight: Flight):
    for seg in flight.segments or [flight]:  # legacy flights have no segment list
        yield seg.origin
        yield seg.destination


def document_requirements(flight: Flight, return_flight: Flight | None) -> DocumentRequirements:
    flights = [f for f in (flight, return_flight) if f is not None]
    home = flight.origin.country or "IN"
    countries: list[str] = []
    for f in flights:
        for airport in _airports(f):
            code = airport.country or home
            if code != home and code not in countries:
                countries.append(code)
    international = bool(countries)
    last = flights[-1]
    last_date = (last.segments[-1].arrivalDate if last.segments else last.arrivalDate)
    names = [COUNTRY_NAMES.get(c, c) for c in countries]
    return DocumentRequirements(
        international=international,
        passportRequired=international,
        nationalityRequired=international,
        countries=names,
        lastTravelDate=last_date,
        passportValidityAdvice=(
            "Many countries and airlines expect a passport valid for at least 6 months beyond your travel "
            f"dates. Requirements differ — check the entry and transit rules for {', '.join(names)} and your "
            "airline before you travel."
            if international
            else None
        ),
    )


def validate_contact(contact: ContactInput) -> None:
    digits = re.sub(r"\D", "", contact.phone).lstrip("0")
    low, high, pattern = PHONE_RULES.get(contact.countryCode, (6, 14, None))
    if not (low <= len(digits) <= high) or (pattern and not re.match(pattern, digits)):
        expected = f"{low}" if low == high else f"{low}–{high}"
        raise HTTPException(
            status_code=400,
            detail=f"Enter a valid mobile number for {contact.countryCode} ({expected} digits).",
        )


def _age_on(dob: date, on: date) -> int:
    return on.year - dob.year - ((on.month, on.day) < (dob.month, dob.day))


def validate_passengers(
    passengers: list[PassengerInput], first_travel: str, requirements: DocumentRequirements, today: date
) -> None:
    seen: set[tuple[str, str, str]] = set()
    first = date.fromisoformat(first_travel)
    last = date.fromisoformat(requirements.lastTravelDate)
    for number, pax in enumerate(passengers, start=1):
        label = f"Traveller {number}"
        try:
            dob = date.fromisoformat(pax.dateOfBirth)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"{label}: date of birth must be a valid date.") from None
        if dob > today:
            raise HTTPException(status_code=400, detail=f"{label}: date of birth can't be in the future.")
        if dob.year < 1900:
            raise HTTPException(status_code=400, detail=f"{label}: check the date of birth.")
        age = _age_on(dob, first)
        if pax.type == "adult" and age < 12:
            raise HTTPException(status_code=400, detail=f"{label}: adults must be 12 or older on the travel date.")
        if pax.type == "child" and not 2 <= age < 12:
            raise HTTPException(status_code=400, detail=f"{label}: children must be 2–11 years old on the travel date.")
        if pax.type == "infant" and _age_on(dob, last) >= 2:
            raise HTTPException(status_code=400, detail=f"{label}: infants must be under 2 for the whole trip.")

        key = (pax.firstName.strip().lower(), pax.lastName.strip().lower(), pax.dateOfBirth)
        if key in seen:
            raise HTTPException(status_code=400, detail=f"{label}: this traveller is listed twice.")
        seen.add(key)

        if requirements.passportRequired:
            passport = (pax.passportNumber or "").strip()
            if not re.fullmatch(r"[A-Za-z0-9]{6,9}", passport):
                raise HTTPException(
                    status_code=400, detail=f"{label}: enter the passport number (6–9 letters or digits)."
                )
            try:
                expiry = date.fromisoformat(pax.passportExpiry or "")
            except ValueError:
                raise HTTPException(status_code=400, detail=f"{label}: passport expiry date is required.") from None
            # Hard rule: the passport must still be valid on the last day of travel.
            # The common 6-month rule is advice only (it varies by country).
            if expiry <= last:
                raise HTTPException(
                    status_code=400, detail=f"{label}: the passport expires before the trip ends."
                )
        if requirements.nationalityRequired and not (pax.nationality or "").strip():
            raise HTTPException(status_code=400, detail=f"{label}: nationality is required.")


def passport_validity_warning(expiry: str | None, requirements: DocumentRequirements) -> bool:
    """True if a passport is valid for the trip but for less than ~6 months afterwards."""
    if not requirements.passportRequired or not expiry:
        return False
    try:
        return date.fromisoformat(expiry) < date.fromisoformat(requirements.lastTravelDate) + timedelta(days=182)
    except ValueError:
        return False
