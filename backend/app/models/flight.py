from typing import Literal

from pydantic import BaseModel, model_validator

CabinClass = Literal["Economy", "Premium Economy", "Business", "First"]
TripType = Literal["one_way", "round_trip"]


class Airline(BaseModel):
    name: str
    code: str


class Airport(BaseModel):
    city: str
    airport: str
    code: str
    country: str = "IN"
    terminal: str | None = None


class Fare(BaseModel):
    """Per-passenger fare. `baseFare`/`taxes`/`totalFare` are the adult fare;
    child and infant fares are filled from it when absent (legacy records)."""

    baseFare: int
    taxes: int
    totalFare: int
    currency: str = "INR"
    childBaseFare: int = 0
    childTaxes: int = 0
    childTotalFare: int = 0
    infantBaseFare: int = 0
    infantTaxes: int = 0
    infantTotalFare: int = 0
    # Adult fare before discount; equals totalFare when there is no discount.
    originalFare: int = 0
    discount: int = 0

    @model_validator(mode="after")
    def _fill_pax_fares(self) -> "Fare":
        if not self.childTotalFare:
            self.childBaseFare = (int(self.baseFare * 0.75) // 50) * 50
            self.childTaxes = self.taxes
            self.childTotalFare = self.childBaseFare + self.childTaxes
        if not self.infantTotalFare:
            self.infantBaseFare = max(1250, (int(self.baseFare * 0.1) // 50) * 50)
            self.infantTaxes = (int(self.infantBaseFare * 0.12) // 10) * 10
            self.infantTotalFare = self.infantBaseFare + self.infantTaxes
        if not self.originalFare:
            self.originalFare = self.totalFare + self.discount
        return self


class Baggage(BaseModel):
    cabin: str
    checkIn: str


class FlightSegment(BaseModel):
    """One take-off and landing. `id` is the bookable direct flight it maps to (seat maps, inventory)."""

    id: str
    airline: Airline
    flightNumber: str
    aircraft: str
    origin: Airport
    destination: Airport
    departureDate: str
    departureTime: str
    arrivalDate: str
    arrivalTime: str
    durationMinutes: int


class Layover(BaseModel):
    airport: Airport
    durationMinutes: int


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
    stops: int = 0
    # Empty on bookings saved before segments existed; clients fall back to the top-level fields.
    segments: list[FlightSegment] = []
    layovers: list[Layover] = []


class FlightSearchResponse(BaseModel):
    origin: str
    destination: str
    date: str
    # Seated passengers (adults + children); kept for older clients.
    passengers: int
    count: int
    flights: list[Flight]
    tripType: TripType = "one_way"
    returnDate: str | None = None
    adults: int = 1
    children: int = 0
    infants: int = 0
    cabinClass: CabinClass = "Economy"
    returnFlights: list[Flight] = []
    returnCount: int = 0
    isInternational: bool = False
    routeAvailable: bool = True
    minDate: str = ""
    maxDate: str = ""


class CatalogAirport(BaseModel):
    code: str
    city: str
    airport: str
    country: str
    countryName: str


class FlightCatalog(BaseModel):
    airports: list[CatalogAirport]
    routes: dict[str, list[str]]
    cabins: list[CabinClass]
    minDate: str
    maxDate: str
    maxSeatedPassengers: int


class FareCalendarDay(BaseModel):
    date: str
    lowestFare: int


class FareCalendarResponse(BaseModel):
    origin: str
    destination: str
    month: str
    cabinClass: CabinClass
    currency: str = "INR"
    days: list[FareCalendarDay]
