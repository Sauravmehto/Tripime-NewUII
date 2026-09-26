from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

from fastapi import HTTPException

from app.models.flight import Flight
from app.providers.base import FlightProvider

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
FLIGHTS_PATH = DATA_DIR / "flights.json"

INVENTORY_START = "2026-08-04"
INVENTORY_END = "2026-08-31"
SUPPORTED_ORIGINS = {"DEL"}
SUPPORTED_DESTINATIONS = {"BOM", "BLR"}


class MockFlightProvider(FlightProvider):
    def __init__(self, path: Path = FLIGHTS_PATH) -> None:
        self._path = path
        self._lock = Lock()
        self._flights = self._load()

    def _load(self) -> list[Flight]:
        if not self._path.exists():
            raise RuntimeError(f"Flight inventory not found at {self._path}")
        raw = json.loads(self._path.read_text(encoding="utf-8-sig"))
        return [Flight.model_validate(item) for item in raw]

    def _save(self) -> None:
        payload = [flight.model_dump() for flight in self._flights]
        self._path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _validate_search(self, origin: str, destination: str, date: str, passengers: int) -> None:
        origin = origin.upper()
        destination = destination.upper()

        if passengers < 1 or passengers > 9:
            raise HTTPException(status_code=400, detail="Passengers must be between 1 and 9.")

        if origin not in SUPPORTED_ORIGINS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported origin '{origin}'. Supported: {', '.join(sorted(SUPPORTED_ORIGINS))}.",
            )

        if destination not in SUPPORTED_DESTINATIONS:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unsupported destination '{destination}'. "
                    f"Supported: {', '.join(sorted(SUPPORTED_DESTINATIONS))}."
                ),
            )

        if origin == destination:
            raise HTTPException(status_code=400, detail="Origin and destination must be different.")

        if date < INVENTORY_START or date > INVENTORY_END:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Mock inventory is currently available only from "
                    f"{INVENTORY_START} through {INVENTORY_END}."
                ),
            )

    def search(
        self,
        origin: str,
        destination: str,
        date: str,
        passengers: int,
    ) -> list[Flight]:
        origin = origin.upper()
        destination = destination.upper()
        self._validate_search(origin, destination, date, passengers)

        matches = [
            flight
            for flight in self._flights
            if flight.origin.code == origin
            and flight.destination.code == destination
            and flight.departureDate == date
            and flight.status == "AVAILABLE"
            and flight.availableSeats >= passengers
        ]
        matches.sort(key=lambda f: (f.departureTime, f.fare.totalFare))
        return matches

    def get_by_id(self, flight_id: str) -> Flight | None:
        for flight in self._flights:
            if flight.id == flight_id:
                return flight
        return None

    def decrement_seats(self, flight_id: str, passengers: int) -> Flight:
        with self._lock:
            for index, flight in enumerate(self._flights):
                if flight.id != flight_id:
                    continue
                if flight.availableSeats < passengers:
                    raise HTTPException(
                        status_code=400,
                        detail="Not enough seats available on this flight.",
                    )
                updated = flight.model_copy(
                    update={"availableSeats": flight.availableSeats - passengers}
                )
                self._flights[index] = updated
                self._save()
                return updated
            raise HTTPException(status_code=404, detail=f"Flight '{flight_id}' not found.")
