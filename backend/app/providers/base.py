from abc import ABC, abstractmethod

from app.models.flight import Flight


class FlightProvider(ABC):
    """Abstract flight inventory provider.

    Swap MockFlightProvider for a real GDS/Amadeus provider later
    without changing FastAPI route contracts.
    """

    @abstractmethod
    def search(
        self,
        origin: str,
        destination: str,
        date: str,
        passengers: int,
    ) -> list[Flight]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, flight_id: str) -> Flight | None:
        raise NotImplementedError

    @abstractmethod
    def decrement_seats(self, flight_id: str, passengers: int) -> Flight:
        """Reduce available seats after a successful booking."""
        raise NotImplementedError
