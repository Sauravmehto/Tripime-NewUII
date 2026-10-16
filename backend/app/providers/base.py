from abc import ABC, abstractmethod

from app.models.flight import Flight


class FlightProvider(ABC):
    """Abstract flight inventory provider.

    Swap MockFlightProvider for a real GDS/Amadeus provider later
    without changing FastAPI route contracts.
    """

    @abstractmethod
    def booking_window(self) -> tuple[str, str]:
        """Inclusive (min, max) ISO dates that can currently be searched/booked."""
        raise NotImplementedError

    @abstractmethod
    def search(
        self,
        origin: str,
        destination: str,
        date: str,
        seats: int,
        cabin: str = "Economy",
    ) -> list[Flight]:
        """Flights with at least `seats` seats free in `cabin` (infants don't need one)."""
        raise NotImplementedError

    @abstractmethod
    def lowest_fares(
        self,
        origin: str,
        destination: str,
        dates: list[str],
        cabin: str = "Economy",
    ) -> dict[str, int]:
        """Lowest adult total fare per date; dates without inventory are omitted."""
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, flight_id: str) -> Flight | None:
        raise NotImplementedError

    @abstractmethod
    def decrement_seats(self, flight_id: str, passengers: int) -> Flight:
        """Reduce available seats after a successful booking."""
        raise NotImplementedError

    @abstractmethod
    def release_seats(self, flight_id: str, passengers: int) -> None:
        """Give back seats held by a cancelled booking (never below zero sold)."""
        raise NotImplementedError
