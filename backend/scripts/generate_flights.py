"""Generate mock DEL→BOM and DEL→BLR flights for Aug 4–31, 2026."""

from __future__ import annotations

import json
import random
from datetime import date, datetime, timedelta
from pathlib import Path

START = date(2026, 8, 4)
END = date(2026, 8, 31)

AIRLINES = [
    {"name": "IndiGo", "code": "6E", "aircraft": ["Airbus A320neo", "Airbus A321neo"]},
    {"name": "Air India", "code": "AI", "aircraft": ["Airbus A320", "Boeing 787-8"]},
    {"name": "Air India Express", "code": "IX", "aircraft": ["Boeing 737-800", "Boeing 737 MAX 8"]},
    {"name": "Akasa Air", "code": "QP", "aircraft": ["Boeing 737 MAX 8"]},
]

ORIGIN = {
    "city": "Delhi",
    "airport": "Indira Gandhi International Airport",
    "code": "DEL",
}

DESTINATIONS = {
    "BOM": {
        "city": "Mumbai",
        "airport": "Chhatrapati Shivaji Maharaj International Airport",
        "code": "BOM",
        "duration_base": 130,
        "price_base": 4800,
    },
    "BLR": {
        "city": "Bangalore",
        "airport": "Kempegowda International Airport",
        "code": "BLR",
        "duration_base": 165,
        "price_base": 5200,
    },
}

# Five daily slot templates that get lightly jittered per day/route
SLOT_TEMPLATES = [
    {"hour": 6, "minute": 0, "flight_suffix": 100},
    {"hour": 7, "minute": 30, "flight_suffix": 200},
    {"hour": 10, "minute": 15, "flight_suffix": 300},
    {"hour": 14, "minute": 30, "flight_suffix": 400},
    {"hour": 19, "minute": 45, "flight_suffix": 500},
]


def daterange(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def add_minutes(dep_date: date, dep_time: str, minutes: int) -> tuple[str, str]:
    dt = datetime.strptime(f"{dep_date.isoformat()} {dep_time}", "%Y-%m-%d %H:%M")
    arrival = dt + timedelta(minutes=minutes)
    return arrival.strftime("%Y-%m-%d"), arrival.strftime("%H:%M")


def build_flights() -> list[dict]:
    flights: list[dict] = []
    rng = random.Random(42)  # deterministic, still varied

    for day in daterange(START, END):
        day_index = (day - START).days
        for dest_code, dest in DESTINATIONS.items():
            # Rotate airline assignment so days don't look identical
            airline_order = AIRLINES[:]
            rng.shuffle(airline_order)

            for slot_index, slot in enumerate(SLOT_TEMPLATES):
                airline = airline_order[slot_index % len(airline_order)]

                # Jitter departure by -10..+15 minutes (but keep readable times)
                jitter = rng.choice([-10, -5, 0, 5, 10, 15])
                dep_dt = datetime(day.year, day.month, day.day, slot["hour"], slot["minute"]) + timedelta(
                    minutes=jitter
                )
                # Keep within same calendar morning/evening feel
                if dep_dt.day != day.day:
                    dep_dt = datetime(day.year, day.month, day.day, slot["hour"], slot["minute"])

                departure_time = dep_dt.strftime("%H:%M")
                duration = dest["duration_base"] + rng.choice([-10, -5, 0, 5, 10, 15])
                arrival_date, arrival_time = add_minutes(day, departure_time, duration)

                # Price varies by airline, route, day-of-week, and time of day
                airline_factor = {"6E": 0.95, "AI": 1.15, "IX": 0.88, "QP": 0.92}[airline["code"]]
                weekend_bump = 1.12 if day.weekday() >= 5 else 1.0
                peak_bump = 1.18 if slot["hour"] in {7, 10, 19} else 1.0
                day_wave = 1 + ((day_index % 7) - 3) * 0.03
                noise = rng.uniform(0.92, 1.08)

                base_fare = int(dest["price_base"] * airline_factor * weekend_bump * peak_bump * day_wave * noise)
                base_fare = max(3500, min(8200, (base_fare // 50) * 50))
                taxes = int(base_fare * rng.uniform(0.16, 0.22))
                taxes = (taxes // 10) * 10
                total = base_fare + taxes

                flight_num = f"{airline['code']} {slot['flight_suffix'] + day_index + slot_index * 3}"
                seq = f"{slot_index + 1:03d}"
                flight_id = f"FL-{day.strftime('%Y%m%d')}-DEL-{dest_code}-{seq}"

                flights.append(
                    {
                        "id": flight_id,
                        "airline": {"name": airline["name"], "code": airline["code"]},
                        "flightNumber": flight_num,
                        "origin": ORIGIN,
                        "destination": {
                            "city": dest["city"],
                            "airport": dest["airport"],
                            "code": dest["code"],
                        },
                        "departureDate": day.isoformat(),
                        "departureTime": departure_time,
                        "arrivalDate": arrival_date,
                        "arrivalTime": arrival_time,
                        "durationMinutes": duration,
                        "aircraft": rng.choice(airline["aircraft"]),
                        "cabinClass": "Economy",
                        "fare": {
                            "baseFare": base_fare,
                            "taxes": taxes,
                            "totalFare": total,
                            "currency": "INR",
                        },
                        "availableSeats": rng.randint(8, 48),
                        "baggage": {
                            "cabin": "7 KG",
                            "checkIn": rng.choice(["15 KG", "20 KG"]),
                        },
                        "refundable": rng.choice([False, False, False, True]),
                        "status": "AVAILABLE",
                    }
                )

    return flights


def main() -> None:
    out = Path(__file__).resolve().parents[1] / "data" / "flights.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    flights = build_flights()
    out.write_text(json.dumps(flights, indent=2), encoding="utf-8")
    print(f"Wrote {len(flights)} flights to {out}")


if __name__ == "__main__":
    main()
