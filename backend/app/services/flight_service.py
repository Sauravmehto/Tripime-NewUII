from calendar import monthrange
from datetime import date, timedelta

from fastapi import HTTPException

from app.models.flight import (
    CatalogAirport,
    FareCalendarDay,
    FareCalendarResponse,
    Flight,
    FlightCatalog,
    FlightSearchResponse,
)
from app.providers.base import FlightProvider
from app.providers.flight_network import (
    AIRPORTS,
    CABIN_CLASSES,
    COUNTRY_NAMES,
    REACHABLE,
    is_international,
)
from app.providers.mock_provider import MAX_SEATED_PASSENGERS, MockFlightProvider

_provider: FlightProvider | None = None


def get_flight_provider() -> FlightProvider:
    global _provider
    if _provider is None:
        _provider = MockFlightProvider()
    return _provider


def validate_passenger_mix(adults: int, children: int, infants: int) -> None:
    if adults < 1:
        raise HTTPException(status_code=400, detail="At least one adult is required.")
    if children < 0 or infants < 0:
        raise HTTPException(status_code=400, detail="Passenger counts cannot be negative.")
    if adults + children > MAX_SEATED_PASSENGERS:
        raise HTTPException(
            status_code=400,
            detail=f"A booking can include at most {MAX_SEATED_PASSENGERS} adults and children.",
        )
    if infants > adults:
        raise HTTPException(status_code=400, detail="Each infant must travel with an adult.")


class FlightService:
    def __init__(self, provider: FlightProvider | None = None) -> None:
        self.provider = provider or get_flight_provider()

    def catalog(self) -> FlightCatalog:
        min_date, max_date = self.provider.booking_window()
        return FlightCatalog(
            airports=[
                CatalogAirport(
                    code=a.code,
                    city=a.city,
                    airport=a.airport,
                    country=a.country,
                    countryName=COUNTRY_NAMES.get(a.country, a.country),
                )
                for a in AIRPORTS.values()
            ],
            routes=REACHABLE,
            cabins=list(CABIN_CLASSES),
            minDate=min_date,
            maxDate=max_date,
            maxSeatedPassengers=MAX_SEATED_PASSENGERS,
        )

    def search(
        self,
        origin: str,
        destination: str,
        date: str,
        adults: int,
        children: int = 0,
        infants: int = 0,
        cabin: str = "Economy",
        return_date: str | None = None,
    ) -> FlightSearchResponse:
        origin, destination = origin.upper(), destination.upper()
        validate_passenger_mix(adults, children, infants)
        if return_date is not None and return_date < date:
            raise HTTPException(status_code=400, detail="Return date cannot be before the departure date.")

        seats = adults + children
        flights = self.provider.search(origin, destination, date, seats, cabin)
        return_flights: list[Flight] = []
        if return_date is not None:
            return_flights = self.provider.search(destination, origin, return_date, seats, cabin)

        min_date, max_date = self.provider.booking_window()
        return FlightSearchResponse(
            origin=origin,
            destination=destination,
            date=date,
            passengers=seats,
            count=len(flights),
            flights=flights,
            tripType="round_trip" if return_date else "one_way",
            returnDate=return_date,
            adults=adults,
            children=children,
            infants=infants,
            cabinClass=cabin,  # type: ignore[arg-type]
            returnFlights=return_flights,
            returnCount=len(return_flights),
            isInternational=is_international(origin, destination),
            routeAvailable=destination in REACHABLE.get(origin, []),
            minDate=min_date,
            maxDate=max_date,
        )

    def fare_calendar(self, origin: str, destination: str, month: str, cabin: str) -> FareCalendarResponse:
        origin, destination = origin.upper(), destination.upper()
        if origin not in AIRPORTS or destination not in AIRPORTS:
            raise HTTPException(status_code=400, detail="Unknown airport code.")
        try:
            year, mon = (int(part) for part in month.split("-"))
            first = date(year, mon, 1)
        except ValueError:
            raise HTTPException(status_code=400, detail="month must use the YYYY-MM format.") from None

        min_date, max_date = self.provider.booking_window()
        days = [
            (first + timedelta(days=offset)).isoformat()
            for offset in range(monthrange(year, mon)[1])
        ]
        days = [d for d in days if min_date <= d <= max_date]
        fares = self.provider.lowest_fares(origin, destination, days, cabin)
        return FareCalendarResponse(
            origin=origin,
            destination=destination,
            month=f"{year:04d}-{mon:02d}",
            cabinClass=cabin,  # type: ignore[arg-type]
            days=[FareCalendarDay(date=d, lowestFare=fare) for d, fare in sorted(fares.items())],
        )

    def get_flight(self, flight_id: str) -> Flight | None:
        return self.provider.get_by_id(flight_id)
