from app.models.flight import Flight, FlightSearchResponse
from app.providers.base import FlightProvider
from app.providers.mock_provider import MockFlightProvider

_provider: FlightProvider | None = None


def get_flight_provider() -> FlightProvider:
    global _provider
    if _provider is None:
        _provider = MockFlightProvider()
    return _provider


class FlightService:
    def __init__(self, provider: FlightProvider | None = None) -> None:
        self.provider = provider or get_flight_provider()

    def search(
        self,
        origin: str,
        destination: str,
        date: str,
        passengers: int,
    ) -> FlightSearchResponse:
        flights = self.provider.search(origin, destination, date, passengers)
        return FlightSearchResponse(
            origin=origin.upper(),
            destination=destination.upper(),
            date=date,
            passengers=passengers,
            count=len(flights),
            flights=flights,
        )

    def get_flight(self, flight_id: str) -> Flight | None:
        return self.provider.get_by_id(flight_id)
