"""Mock flight inventory generated deterministically from the route catalogue.

Every (date, origin, destination) schedule is derived from a stable hash, so
the same flight ID always resolves to the same flight and inventory always
covers a rolling window from today. Only sold seats are persisted.

Direct flights have IDs like ``FL-20261020-DEL-SHJ-002-Y``. A 1-stop
connection joins two direct flights that meet at a hub and gets the ID
``CX-<first leg id>~<second leg id>``, so it shares seat inventory with them.
"""

from __future__ import annotations

import hashlib
import json
import random
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from math import sin
from pathlib import Path
from threading import Lock

from fastapi import HTTPException

from app import config
from app.models.flight import Airline, Airport, Baggage, Fare, Flight, FlightSegment, Layover
from app.providers.base import FlightProvider
from app.providers.flight_network import (
    AIRPORTS,
    CABIN_BY_CODE,
    CABIN_CLASSES,
    CABIN_CODES,
    MAX_LAYOVER_MINUTES,
    MIN_CONNECTION_MINUTES,
    ROUTES,
    AirlineRecord,
    airlines_for_route,
    daily_frequency,
    distance_km,
    is_international,
    route_served,
    terminal_for,
)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SEAT_SALES_PATH = DATA_DIR / "flight_seat_sales.json"

IST = timezone(timedelta(hours=5, minutes=30))
MAX_SEATED_PASSENGERS = 9
# Same-day flights leaving sooner than this aren't offered.
MIN_LEAD_MINUTES = 120
# Connections are only offered alongside thin direct schedules (and always internationally).
CONNECTIONS_WHEN_DIRECT_AT_MOST = 4
MAX_CONNECTIONS_PER_SEARCH = 12
CONNECTION_FARE_FACTOR = 0.8

FLIGHT_ID_RE = re.compile(r"^FL-(\d{8})-([A-Z]{3})-([A-Z]{3})-(\d{3})-([YWJF])$")

DEPARTURE_TEMPLATES: dict[tuple[int, bool], list[tuple[int, int]]] = {
    (6, False): [(6, 0), (8, 15), (11, 30), (14, 45), (18, 10), (21, 20)],
    (4, False): [(6, 40), (10, 20), (15, 10), (19, 50)],
    (3, False): [(7, 5), (13, 30), (20, 15)],
    (3, True): [(2, 15), (10, 30), (21, 45)],
    (2, True): [(4, 10), (18, 35)],
    (1, True): [(9, 40)],
}

CABIN_FARE_MULTIPLIER = {"Economy": 1.0, "Premium Economy": 1.65, "Business": 3.1, "First": 5.4}
CABIN_SEAT_RANGE = {"Economy": (9, 60), "Premium Economy": (4, 18), "Business": (2, 12), "First": (1, 6)}
CABIN_REFUNDABLE_ODDS = {"Economy": 0.25, "Premium Economy": 0.5, "Business": 1.0, "First": 1.0}
DISCOUNT_ODDS = 0.45


def _round_to(value: float, step: int) -> int:
    return int(value // step) * step


def _stable_int(*parts: str) -> int:
    digest = hashlib.sha256("|".join(parts).encode()).hexdigest()
    return int(digest[:16], 16)


def _last_sunday(year: int, month: int) -> date:
    day = date(year, month + 1, 1) - timedelta(days=1) if month < 12 else date(year, 12, 31)
    return day - timedelta(days=(day.weekday() + 1) % 7)


def _utc_offset(code: str, on: date) -> int:
    airport = AIRPORTS[code]
    if airport.country == "GB" and _last_sunday(on.year, 3) <= on < _last_sunday(on.year, 10):
        return airport.utc_offset_minutes + 60  # British Summer Time
    return airport.utc_offset_minutes


def today_ist() -> date:
    return datetime.now(IST).date()


@dataclass(frozen=True)
class _Slot:
    index: int
    origin: str
    destination: str
    airline: AirlineRecord
    aircraft: str
    flight_number: str
    departure: datetime  # local time at origin
    arrival: datetime  # local time at destination
    duration: int
    economy_base: int
    tax_rate: float
    cabin_seats: dict[str, int]
    cabin_refundable: dict[str, bool]

    def flight_id(self, cabin: str) -> str:
        day = self.departure.strftime("%Y%m%d")
        return f"FL-{day}-{self.origin}-{self.destination}-{self.index + 1:03d}-{CABIN_CODES[cabin]}"


@lru_cache(maxsize=8192)
def _schedule(day_iso: str, origin: str, destination: str) -> tuple[_Slot, ...]:
    if not route_served(origin, destination):
        return ()
    day = date.fromisoformat(day_iso)
    international = is_international(origin, destination)
    rng = random.Random(_stable_int(day_iso, origin, destination))
    airlines = airlines_for_route(origin, destination)
    km = distance_km(origin, destination)
    base_duration = round(km / 780 * 60 + 35)
    route_base = (5000 + km * 3.4) if international else (2200 + km * 2.6)
    weekend = 1.1 if day.weekday() >= 4 else 1.0
    wave = 1 + sin(day.timetuple().tm_yday / 5) * 0.06
    rotation = rng.randrange(len(airlines))
    # Shift each route's timetable a little so hub connections don't all line up.
    route_shift = _stable_int(origin, destination) % 120 - 60

    slots: list[_Slot] = []
    templates = DEPARTURE_TEMPLATES[(daily_frequency(origin, destination), international)]
    for index, (hour, minute) in enumerate(templates):
        airline = airlines[(rotation + index) % len(airlines)]
        departure = datetime(day.year, day.month, day.day, hour, minute) + timedelta(
            minutes=route_shift + rng.choice([-10, -5, 0, 5, 10])
        )
        if departure.date() != day:
            departure = datetime(day.year, day.month, day.day, hour, minute)
        duration = max(45, _round_to(base_duration + rng.choice([-10, -5, 0, 5, 10]), 5))
        arrival = departure - timedelta(minutes=_utc_offset(origin, day)) + timedelta(minutes=duration)
        arrival += timedelta(minutes=_utc_offset(destination, arrival.date()))
        peak = 1.15 if departure.hour in {6, 7, 8, 17, 18, 19, 20, 21} else 1.0
        economy_base = _round_to(
            route_base * airline.price_factor * weekend * peak * wave * rng.uniform(0.92, 1.08), 50
        )
        tax_rate = rng.uniform(0.22, 0.28) if international else rng.uniform(0.16, 0.2)
        number = 100 + _stable_int(origin, destination, airline.code, str(index)) % 880
        slots.append(
            _Slot(
                index=index,
                origin=origin,
                destination=destination,
                airline=airline,
                aircraft=rng.choice(airline.aircraft),
                flight_number=f"{airline.code} {number}",
                departure=departure,
                arrival=arrival,
                duration=duration,
                economy_base=economy_base,
                tax_rate=tax_rate,
                cabin_seats={c: rng.randint(*CABIN_SEAT_RANGE[c]) for c in airline.cabins},
                cabin_refundable={c: rng.random() < CABIN_REFUNDABLE_ODDS[c] for c in airline.cabins},
            )
        )
    return tuple(slots)


def _connection_pairs(day_iso: str, origin: str, destination: str, cabin: str) -> list[tuple[_Slot, _Slot]]:
    """Feasible (first leg, second leg) pairs departing `origin` on `day_iso`."""
    next_day = (date.fromisoformat(day_iso) + timedelta(days=1)).isoformat()
    pairs: list[tuple[_Slot, _Slot]] = []
    for hub in ROUTES.get(origin, []):
        if hub == destination or destination not in ROUTES.get(hub, []):
            continue
        onward = [
            s
            for d in (day_iso, next_day)
            for s in _schedule(d, hub, destination)
            if cabin in s.cabin_seats
        ]
        for first in _schedule(day_iso, origin, hub):
            if cabin not in first.cabin_seats:
                continue
            kind = "domestic" if not is_international(origin, hub, destination) else "international"
            earliest = first.arrival + timedelta(minutes=MIN_CONNECTION_MINUTES[kind])
            latest = first.arrival + timedelta(minutes=MAX_LAYOVER_MINUTES)
            # The first two onward flights that make the connection.
            pairs.extend((first, second) for second in [s for s in onward if earliest <= s.departure <= latest][:2])
    return pairs


def _valid_pair(first: _Slot, second: _Slot) -> bool:
    if first.destination != second.origin or first.origin == second.destination:
        return False
    kind = "domestic" if not is_international(first.origin, first.destination, second.destination) else "international"
    layover = (second.departure - first.arrival).total_seconds() / 60
    return MIN_CONNECTION_MINUTES[kind] <= layover <= MAX_LAYOVER_MINUTES


def _discount_for(flight_id: str, total: int) -> int:
    rng = random.Random(_stable_int("discount", flight_id))
    if rng.random() >= DISCOUNT_ODDS:
        return 0
    return max(150, _round_to(total * rng.uniform(0.015, 0.06), 10))


def _fare(flight_id: str, base: int, taxes: int, international: bool) -> Fare:
    discount = _discount_for(flight_id, base + taxes)
    base -= discount  # the discount comes off the base fare; taxes are unchanged
    child_base = _round_to(base * 0.75, 50)
    child_taxes = _round_to(taxes * 0.9, 10)
    infant_base = _round_to(max(2500 if international else 1250, base * 0.1), 50)
    infant_taxes = _round_to(infant_base * 0.12, 10)
    return Fare(
        baseFare=base,
        taxes=taxes,
        totalFare=base + taxes,
        childBaseFare=child_base,
        childTaxes=child_taxes,
        childTotalFare=child_base + child_taxes,
        infantBaseFare=infant_base,
        infantTaxes=infant_taxes,
        infantTotalFare=infant_base + infant_taxes,
        originalFare=base + taxes + discount,
        discount=discount,
    )


def _slot_price(slot: _Slot, cabin: str) -> tuple[int, int]:
    base = _round_to(slot.economy_base * CABIN_FARE_MULTIPLIER[cabin], 50)
    return base, _round_to(base * slot.tax_rate, 10)


def _connection_price(first: _Slot, second: _Slot, cabin: str) -> tuple[int, int]:
    b1, _ = _slot_price(first, cabin)
    b2, _ = _slot_price(second, cabin)
    base = _round_to((b1 + b2) * CONNECTION_FARE_FACTOR, 50)
    rate = (first.tax_rate + second.tax_rate) / 2
    return base, _round_to(base * rate, 10)


def _baggage(cabin: str, international: bool) -> Baggage:
    check_in = {
        "Economy": "25 KG" if international else "15 KG",
        "Premium Economy": "35 KG" if international else "25 KG",
        "Business": "40 KG" if international else "35 KG",
        "First": "50 KG",
    }[cabin]
    cabin_bag = "7 KG" if cabin in {"Economy", "Premium Economy"} else "2 × 7 KG"
    return Baggage(cabin=cabin_bag, checkIn=check_in)


def _airport(code: str, terminal: str | None = None) -> Airport:
    record = AIRPORTS[code]
    return Airport(
        city=record.city, airport=record.airport, code=record.code, country=record.country, terminal=terminal
    )


def _parse_direct_id(flight_id: str) -> tuple[_Slot, str] | None:
    match = FLIGHT_ID_RE.match(flight_id)
    if not match:
        return None
    raw_day, origin, destination, seq, cabin_code = match.groups()
    day_iso = f"{raw_day[:4]}-{raw_day[4:6]}-{raw_day[6:]}"
    try:
        date.fromisoformat(day_iso)
    except ValueError:
        return None
    if origin not in AIRPORTS or destination not in AIRPORTS:
        return None
    cabin = CABIN_BY_CODE[cabin_code]
    slots = _schedule(day_iso, origin, destination)
    index = int(seq) - 1
    if index < 0 or index >= len(slots) or cabin not in slots[index].cabin_seats:
        return None
    return slots[index], cabin


class MockFlightProvider(FlightProvider):
    def __init__(self, sales_path: Path = SEAT_SALES_PATH) -> None:
        self._sales_path = sales_path
        self._lock = Lock()
        self._sold: dict[str, int] = self._load_sales()

    def _load_sales(self) -> dict[str, int]:
        if not self._sales_path.exists():
            return {}
        raw = json.loads(self._sales_path.read_text(encoding="utf-8-sig") or "{}")
        return {str(k): int(v) for k, v in raw.items()}

    def _save_sales(self) -> None:
        self._sales_path.parent.mkdir(parents=True, exist_ok=True)
        self._sales_path.write_text(json.dumps(self._sold, indent=2, sort_keys=True), encoding="utf-8")

    def booking_window(self) -> tuple[str, str]:
        today = today_ist()
        return today.isoformat(), (today + timedelta(days=config.FLIGHT_BOOKING_WINDOW_DAYS)).isoformat()

    # ---- building blocks -------------------------------------------------

    def _seats_left(self, slot: _Slot, cabin: str) -> int:
        return max(0, slot.cabin_seats[cabin] - self._sold.get(slot.flight_id(cabin), 0))

    @staticmethod
    def _segment(slot: _Slot, cabin: str) -> FlightSegment:
        international = is_international(slot.origin, slot.destination)
        code = slot.airline.code
        return FlightSegment(
            id=slot.flight_id(cabin),
            airline=Airline(name=slot.airline.name, code=code),
            flightNumber=slot.flight_number,
            aircraft=slot.aircraft,
            origin=_airport(slot.origin, terminal_for(slot.origin, code, international)),
            destination=_airport(slot.destination, terminal_for(slot.destination, code, international)),
            departureDate=slot.departure.strftime("%Y-%m-%d"),
            departureTime=slot.departure.strftime("%H:%M"),
            arrivalDate=slot.arrival.strftime("%Y-%m-%d"),
            arrivalTime=slot.arrival.strftime("%H:%M"),
            durationMinutes=slot.duration,
        )

    def _direct(self, slot: _Slot, cabin: str) -> Flight:
        international = is_international(slot.origin, slot.destination)
        segment = self._segment(slot, cabin)
        available = self._seats_left(slot, cabin)
        base, taxes = _slot_price(slot, cabin)
        return Flight(
            id=segment.id,
            airline=segment.airline,
            flightNumber=segment.flightNumber,
            origin=segment.origin,
            destination=segment.destination,
            departureDate=segment.departureDate,
            departureTime=segment.departureTime,
            arrivalDate=segment.arrivalDate,
            arrivalTime=segment.arrivalTime,
            durationMinutes=segment.durationMinutes,
            aircraft=segment.aircraft,
            cabinClass=cabin,
            fare=_fare(segment.id, base, taxes, international),
            availableSeats=available,
            baggage=_baggage(cabin, international),
            refundable=slot.cabin_refundable[cabin],
            status="AVAILABLE" if available > 0 else "SOLD_OUT",
            stops=0,
            segments=[segment],
            layovers=[],
        )

    def _connection(self, first: _Slot, second: _Slot, cabin: str) -> Flight:
        international = is_international(first.origin, first.destination, second.destination)
        legs = [self._segment(first, cabin), self._segment(second, cabin)]
        flight_id = f"CX-{legs[0].id}~{legs[1].id}"
        layover = int((second.departure - first.arrival).total_seconds() // 60)
        same_carrier = first.airline.code == second.airline.code
        available = min(self._seats_left(first, cabin), self._seats_left(second, cabin))
        base, taxes = _connection_price(first, second, cabin)
        return Flight(
            id=flight_id,
            airline=legs[0].airline if same_carrier else Airline(name="Multiple Airlines", code="MULTI"),
            flightNumber=f"{legs[0].flightNumber}, {legs[1].flightNumber}",
            origin=legs[0].origin,
            destination=legs[1].destination,
            departureDate=legs[0].departureDate,
            departureTime=legs[0].departureTime,
            arrivalDate=legs[1].arrivalDate,
            arrivalTime=legs[1].arrivalTime,
            durationMinutes=first.duration + layover + second.duration,
            aircraft=legs[0].aircraft if legs[0].aircraft == legs[1].aircraft else f"{legs[0].aircraft} / {legs[1].aircraft}",
            cabinClass=cabin,
            fare=_fare(flight_id, base, taxes, international),
            availableSeats=available,
            baggage=_baggage(cabin, international),
            refundable=first.cabin_refundable[cabin] and second.cabin_refundable[cabin],
            status="AVAILABLE" if available > 0 else "SOLD_OUT",
            stops=1,
            segments=legs,
            layovers=[Layover(airport=_airport(first.destination), durationMinutes=layover)],
        )

    def _offers_connections(self, origin: str, destination: str) -> bool:
        return (
            not route_served(origin, destination)
            or is_international(origin, destination)
            or daily_frequency(origin, destination) <= CONNECTIONS_WHEN_DIRECT_AT_MOST
        )

    def _all_flights(self, day_iso: str, origin: str, destination: str, cabin: str) -> list[Flight]:
        flights = [
            self._direct(slot, cabin)
            for slot in _schedule(day_iso, origin, destination)
            if cabin in slot.cabin_seats
        ]
        if self._offers_connections(origin, destination):
            connections = [self._connection(a, b, cabin) for a, b in _connection_pairs(day_iso, origin, destination, cabin)]
            # Keep the most sensible itineraries: cheap, and not absurdly long.
            connections.sort(key=lambda f: f.fare.totalFare + f.durationMinutes * 15)
            flights += connections[:MAX_CONNECTIONS_PER_SEARCH]
        return flights

    # ---- provider API ----------------------------------------------------

    def validate_query(self, origin: str, destination: str, day_iso: str) -> None:
        for label, code in (("origin", origin), ("destination", destination)):
            if code not in AIRPORTS:
                raise HTTPException(status_code=400, detail=f"Unknown {label} airport '{code}'.")
        if origin == destination:
            raise HTTPException(status_code=400, detail="Origin and destination must be different.")
        try:
            date.fromisoformat(day_iso)
        except ValueError:
            raise HTTPException(status_code=400, detail="Dates must use the YYYY-MM-DD format.") from None
        min_date, max_date = self.booking_window()
        if day_iso < min_date or day_iso > max_date:
            raise HTTPException(
                status_code=400,
                detail=f"Flights can be searched for dates from {min_date} to {max_date}.",
            )

    def search(
        self,
        origin: str,
        destination: str,
        date: str,
        seats: int,
        cabin: str = "Economy",
    ) -> list[Flight]:
        origin, destination = origin.upper(), destination.upper()
        if seats < 1 or seats > MAX_SEATED_PASSENGERS:
            raise HTTPException(
                status_code=400,
                detail=f"Seated passengers must be between 1 and {MAX_SEATED_PASSENGERS}.",
            )
        if cabin not in CABIN_CLASSES:
            raise HTTPException(status_code=400, detail=f"Unsupported cabin class '{cabin}'.")
        self.validate_query(origin, destination, date)

        cutoff = (datetime.now(IST).replace(tzinfo=None) + timedelta(minutes=MIN_LEAD_MINUTES)).strftime(
            "%Y-%m-%d %H:%M"
        )
        matches = [
            f
            for f in self._all_flights(date, origin, destination, cabin)
            if f.availableSeats >= seats and f"{f.departureDate} {f.departureTime}" >= cutoff
        ]
        matches.sort(key=lambda f: (f.departureTime, f.fare.totalFare))
        return matches

    def lowest_fares(
        self,
        origin: str,
        destination: str,
        dates: list[str],
        cabin: str = "Economy",
    ) -> dict[str, int]:
        result: dict[str, int] = {}
        for day_iso in dates:
            fares = [f.fare.totalFare for f in self._all_flights(day_iso, origin, destination, cabin)]
            if fares:
                result[day_iso] = min(fares)
        return result

    def get_by_id(self, flight_id: str) -> Flight | None:
        if flight_id.startswith("CX-"):
            parts = flight_id[3:].split("~")
            if len(parts) != 2:
                return None
            first, second = _parse_direct_id(parts[0]), _parse_direct_id(parts[1])
            if not first or not second or first[1] != second[1] or not _valid_pair(first[0], second[0]):
                return None
            return self._connection(first[0], second[0], first[1])
        parsed = _parse_direct_id(flight_id)
        return self._direct(*parsed) if parsed else None

    def decrement_seats(self, flight_id: str, passengers: int) -> Flight:
        with self._lock:
            flight = self.get_by_id(flight_id)
            if flight is None:
                raise HTTPException(status_code=404, detail=f"Flight '{flight_id}' not found.")
            if flight.availableSeats < passengers:
                raise HTTPException(status_code=400, detail="Not enough seats available on this flight.")
            # Seats belong to the physical flights, so a connection sells a seat on each leg.
            for segment in flight.segments:
                self._sold[segment.id] = self._sold.get(segment.id, 0) + passengers
            self._save_sales()
            return self.get_by_id(flight_id)  # type: ignore[return-value]

    def release_seats(self, flight_id: str, passengers: int) -> None:
        with self._lock:
            flight = self.get_by_id(flight_id)
            if flight is None:
                return
            for segment in flight.segments:
                remaining = self._sold.get(segment.id, 0) - passengers
                if remaining > 0:
                    self._sold[segment.id] = remaining
                else:
                    self._sold.pop(segment.id, None)
            self._save_sales()
