from pydantic import BaseModel


class Airline(BaseModel):
    name: str
    code: str


class Airport(BaseModel):
    city: str
    airport: str
    code: str


class Fare(BaseModel):
    baseFare: int
    taxes: int
    totalFare: int
    currency: str = "INR"


class Baggage(BaseModel):
    cabin: str
    checkIn: str


class Flight(BaseModel):
    id: str
    airline: Airline
    flightNumber: str
    origin: Airport
    destination: Airport
    departureDate: str
    departureTime: str
    arrivalDate: str
    arrivalTime: str
    durationMinutes: int
    aircraft: str
    cabinClass: str = "Economy"
    fare: Fare
    availableSeats: int
    baggage: Baggage
    refundable: bool
    status: str = "AVAILABLE"


class FlightSearchResponse(BaseModel):
    origin: str
    destination: str
    date: str
    passengers: int
    count: int
    flights: list[Flight]
