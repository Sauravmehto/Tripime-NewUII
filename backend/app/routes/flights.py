from fastapi import APIRouter, HTTPException, Query

from app.models.flight import (
    CabinClass,
    FareCalendarResponse,
    Flight,
    FlightCatalog,
    FlightSearchResponse,
)
from app.services.flight_service import FlightService

router = APIRouter()
flight_service = FlightService()


@router.get("/catalog", response_model=FlightCatalog)
def get_catalog() -> FlightCatalog:
    """Airports, served routes, cabins and the bookable date window."""
    return flight_service.catalog()


@router.get("/search", response_model=FlightSearchResponse)
def search_flights(
    origin: str = Query(..., min_length=3, max_length=3),
    destination: str = Query(..., min_length=3, max_length=3),
    date: str = Query(..., description="Departure date, YYYY-MM-DD"),
    returnDate: str | None = Query(None, description="Return date for round trips, YYYY-MM-DD"),
    adults: int | None = Query(None, ge=1, le=9),
    children: int = Query(0, ge=0, le=8),
    infants: int = Query(0, ge=0, le=9),
    cabin: CabinClass = Query("Economy"),
    # Legacy: plain seated-passenger count, treated as adults when `adults` is absent.
    passengers: int = Query(1, ge=1, le=9),
) -> FlightSearchResponse:
    return flight_service.search(
        origin,
        destination,
        date,
        adults=adults if adults is not None else passengers,
        children=children,
        infants=infants,
        cabin=cabin,
        return_date=returnDate or None,
    )


@router.get("/fare-calendar", response_model=FareCalendarResponse)
def fare_calendar(
    origin: str = Query(..., min_length=3, max_length=3),
    destination: str = Query(..., min_length=3, max_length=3),
    month: str = Query(..., description="YYYY-MM"),
    cabin: CabinClass = Query("Economy"),
) -> FareCalendarResponse:
    """Lowest adult fare per day of `month`, for the date picker."""
    return flight_service.fare_calendar(origin, destination, month, cabin)


@router.get("/{flight_id}", response_model=Flight)
def get_flight(flight_id: str) -> Flight:
    flight = flight_service.get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight '{flight_id}' not found.")
    return flight
