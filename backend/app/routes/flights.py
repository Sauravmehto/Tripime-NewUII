from fastapi import APIRouter, HTTPException, Query

from app.models.flight import Flight, FlightSearchResponse
from app.services.flight_service import FlightService

router = APIRouter()
flight_service = FlightService()


@router.get("/search", response_model=FlightSearchResponse)
def search_flights(
    origin: str = Query(..., min_length=3, max_length=3),
    destination: str = Query(..., min_length=3, max_length=3),
    date: str = Query(..., description="YYYY-MM-DD"),
    passengers: int = Query(1, ge=1, le=9),
) -> FlightSearchResponse:
    return flight_service.search(origin, destination, date, passengers)


@router.get("/{flight_id}", response_model=Flight)
def get_flight(flight_id: str) -> Flight:
    flight = flight_service.get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight '{flight_id}' not found.")
    return flight
