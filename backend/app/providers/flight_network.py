"""Static reference data for the mock flight network: airports, routes, airlines.

The mock provider generates schedules from this catalogue deterministically,
so inventory always covers a rolling window from today without a data file
that goes stale. Direct routes are listed here; 1-stop connections are built
by the provider from two direct legs that meet at a common airport.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt

CABIN_CLASSES = ("Economy", "Premium Economy", "Business", "First")
CABIN_CODES = {"Economy": "Y", "Premium Economy": "W", "Business": "J", "First": "F"}
CABIN_BY_CODE = {code: cabin for cabin, code in CABIN_CODES.items()}

HOME_COUNTRY = "IN"

COUNTRY_NAMES = {
    "IN": "India",
    "AE": "United Arab Emirates",
    "GE": "Georgia",
    "SG": "Singapore",
    "TH": "Thailand",
    "GB": "United Kingdom",
    "QA": "Qatar",
    "TR": "Türkiye",
}


@dataclass(frozen=True)
class AirportRecord:
    code: str
    city: str
    airport: str
    country: str
    lat: float
    lon: float
    utc_offset_minutes: int


AIRPORTS: dict[str, AirportRecord] = {
    a.code: a
    for a in [
        AirportRecord("DEL", "Delhi", "Indira Gandhi International Airport", "IN", 28.5562, 77.1000, 330),
        AirportRecord("BOM", "Mumbai", "Chhatrapati Shivaji Maharaj International Airport", "IN", 19.0896, 72.8656, 330),
        AirportRecord("BLR", "Bengaluru", "Kempegowda International Airport", "IN", 13.1986, 77.7066, 330),
        AirportRecord("MAA", "Chennai", "Chennai International Airport", "IN", 12.9941, 80.1709, 330),
        AirportRecord("CCU", "Kolkata", "Netaji Subhas Chandra Bose International Airport", "IN", 22.6547, 88.4467, 330),
        AirportRecord("HYD", "Hyderabad", "Rajiv Gandhi International Airport", "IN", 17.2403, 78.4294, 330),
        AirportRecord("GOI", "Goa", "Dabolim Airport", "IN", 15.3808, 73.8314, 330),
        AirportRecord("COK", "Kochi", "Cochin International Airport", "IN", 10.1520, 76.4019, 330),
        AirportRecord("DXB", "Dubai", "Dubai International Airport", "AE", 25.2532, 55.3657, 240),
        AirportRecord("SHJ", "Sharjah", "Sharjah International Airport", "AE", 25.3286, 55.5172, 240),
        AirportRecord("AUH", "Abu Dhabi", "Zayed International Airport", "AE", 24.4330, 54.6511, 240),
        AirportRecord("DOH", "Doha", "Hamad International Airport", "QA", 25.2731, 51.6081, 180),
        AirportRecord("IST", "Istanbul", "Istanbul Airport", "TR", 41.2753, 28.7519, 180),
        AirportRecord("TBS", "Tbilisi", "Tbilisi International Airport", "GE", 41.6692, 44.9547, 240),
        AirportRecord("SIN", "Singapore", "Singapore Changi Airport", "SG", 1.3644, 103.9915, 480),
        AirportRecord("BKK", "Bangkok", "Suvarnabhumi Airport", "TH", 13.6900, 100.7501, 420),
        AirportRecord("LHR", "London", "Heathrow Airport", "GB", 51.4700, -0.4543, 0),
    ]
}

DOMESTIC_CODES = [code for code, a in AIRPORTS.items() if a.country == HOME_COUNTRY]
METRO_CODES = {"DEL", "BOM", "BLR"}


@dataclass(frozen=True)
class AirlineRecord:
    name: str
    code: str
    aircraft: tuple[str, ...]
    cabins: tuple[str, ...]
    price_factor: float


_INDIGO = AirlineRecord("IndiGo", "6E", ("Airbus A320neo", "Airbus A321neo"), ("Economy",), 0.95)
_AIR_INDIA = AirlineRecord(
    "Air India", "AI", ("Airbus A320neo", "Airbus A321neo"), ("Economy", "Premium Economy", "Business"), 1.12
)
_AIR_INDIA_INTL = AirlineRecord(
    "Air India", "AI", ("Boeing 787-8", "Boeing 777-300ER"), ("Economy", "Premium Economy", "Business", "First"), 1.12
)
_AI_EXPRESS = AirlineRecord("Air India Express", "IX", ("Boeing 737-800", "Boeing 737 MAX 8"), ("Economy",), 0.88)
_AKASA = AirlineRecord("Akasa Air", "QP", ("Boeing 737 MAX 8",), ("Economy",), 0.92)
_EMIRATES = AirlineRecord("Emirates", "EK", ("Boeing 777-300ER", "Airbus A380-800"), ("Economy", "Business", "First"), 1.25)
_FLYDUBAI = AirlineRecord("flydubai", "FZ", ("Boeing 737 MAX 8",), ("Economy", "Business"), 0.9)
_AIR_ARABIA = AirlineRecord("Air Arabia", "G9", ("Airbus A320", "Airbus A321neo"), ("Economy",), 0.78)
_ETIHAD = AirlineRecord("Etihad Airways", "EY", ("Boeing 787-9", "Airbus A350-1000"), ("Economy", "Business", "First"), 1.2)
_QATAR = AirlineRecord("Qatar Airways", "QR", ("Boeing 787-8", "Airbus A350-900"), ("Economy", "Business", "First"), 1.22)
_TURKISH = AirlineRecord("Turkish Airlines", "TK", ("Airbus A321neo", "Boeing 777-300ER"), ("Economy", "Business"), 1.08)
_SINGAPORE = AirlineRecord(
    "Singapore Airlines", "SQ", ("Airbus A350-900",), ("Economy", "Premium Economy", "Business", "First"), 1.3
)
_THAI = AirlineRecord("Thai Airways", "TG", ("Boeing 787-9",), ("Economy", "Business"), 1.1)
_BRITISH = AirlineRecord(
    "British Airways", "BA", ("Boeing 777-200ER", "Boeing 787-10"), ("Economy", "Premium Economy", "Business", "First"), 1.28
)
_GEORGIAN = AirlineRecord("Georgian Airways", "A9", ("Embraer E190",), ("Economy", "Business"), 1.0)

DOMESTIC_AIRLINES = (_INDIGO, _AIR_INDIA, _AI_EXPRESS, _AKASA)

# Non-domestic direct routes: (airport A, airport B) -> (carriers, Indian gateways or partner airports).
# Each entry is served in both directions.
_INTL_ROUTES: list[tuple[tuple[AirlineRecord, ...], str, list[str]]] = [
    # India <-> destinations
    ((_INDIGO, _AIR_INDIA_INTL, _EMIRATES), "DXB", ["DEL", "BOM", "BLR", "HYD", "MAA", "COK"]),
    ((_INDIGO, _AIR_INDIA_INTL, _SINGAPORE), "SIN", ["DEL", "BOM", "BLR", "MAA", "HYD"]),
    ((_INDIGO, _AIR_INDIA_INTL, _THAI), "BKK", ["DEL", "BOM", "BLR", "CCU"]),
    ((_AIR_INDIA_INTL, _BRITISH), "LHR", ["DEL", "BOM", "BLR"]),
    ((_INDIGO, _GEORGIAN), "TBS", ["DEL", "BOM"]),
    # India <-> Gulf / Türkiye hubs
    ((_AIR_ARABIA, _INDIGO, _AI_EXPRESS), "SHJ", ["DEL", "BOM", "BLR", "HYD", "MAA", "COK", "CCU", "GOI"]),
    ((_QATAR, _INDIGO, _AIR_INDIA_INTL), "DOH", ["DEL", "BOM", "BLR", "HYD", "MAA", "COK", "CCU", "GOI"]),
    ((_ETIHAD, _INDIGO, _AI_EXPRESS), "AUH", ["DEL", "BOM", "BLR", "HYD", "MAA", "COK"]),
    ((_TURKISH, _INDIGO), "IST", ["DEL", "BOM"]),
    # Hub <-> onward destinations
    ((_AIR_ARABIA,), "SHJ", ["TBS", "BKK", "IST"]),
    ((_QATAR,), "DOH", ["TBS", "LHR", "SIN", "BKK", "IST"]),
    ((_ETIHAD,), "AUH", ["LHR", "SIN", "BKK"]),
    ((_TURKISH,), "IST", ["TBS", "LHR"]),
    ((_FLYDUBAI, _EMIRATES), "DXB", ["TBS"]),
    ((_EMIRATES, _BRITISH), "DXB", ["LHR"]),
    ((_EMIRATES,), "DXB", ["SIN", "BKK"]),
]

_ROUTE_AIRLINES: dict[frozenset[str], tuple[AirlineRecord, ...]] = {}
for _carriers, _hub, _ends in _INTL_ROUTES:
    for _end in _ends:
        _ROUTE_AIRLINES[frozenset((_hub, _end))] = _carriers


def _build_routes() -> dict[str, list[str]]:
    routes: dict[str, set[str]] = {code: set() for code in AIRPORTS}
    for a in DOMESTIC_CODES:
        for b in DOMESTIC_CODES:
            if a != b:
                routes[a].add(b)
    for pair in _ROUTE_AIRLINES:
        a, b = tuple(pair)
        routes[a].add(b)
        routes[b].add(a)
    return {code: sorted(dests) for code, dests in routes.items()}


# Direct (non-stop) routes.
ROUTES: dict[str, list[str]] = _build_routes()


def _build_reachable() -> dict[str, list[str]]:
    """Destinations reachable non-stop or with exactly one connection."""
    reachable: dict[str, list[str]] = {}
    for origin, directs in ROUTES.items():
        found = set(directs)
        for hub in directs:
            found.update(d for d in ROUTES[hub] if d != origin)
        reachable[origin] = sorted(found)
    return reachable


REACHABLE: dict[str, list[str]] = _build_reachable()

# Domestic legs connect at least an hour apart; anything touching an
# international flight needs two (immigration, bag transfer).
MIN_CONNECTION_MINUTES = {"domestic": 60, "international": 120}
MAX_LAYOVER_MINUTES = 20 * 60


def is_international(*codes: str) -> bool:
    return any(AIRPORTS[code].country != HOME_COUNTRY for code in codes if code in AIRPORTS)


def route_served(origin: str, destination: str) -> bool:
    return destination in ROUTES.get(origin, [])


def airlines_for_route(origin: str, destination: str) -> tuple[AirlineRecord, ...]:
    return _ROUTE_AIRLINES.get(frozenset((origin, destination)), DOMESTIC_AIRLINES)


def daily_frequency(origin: str, destination: str) -> int:
    if is_international(origin, destination):
        if HOME_COUNTRY not in (AIRPORTS[origin].country, AIRPORTS[destination].country):
            return 2  # hub <-> onward destination
        return 1 if "TBS" in (origin, destination) or "IST" in (origin, destination) else 3
    if origin in METRO_CODES and destination in METRO_CODES:
        return 6
    if "GOI" in (origin, destination) or "COK" in (origin, destination):
        return 3
    return 4


# (domestic terminal, international terminal) per airport; per-airline overrides below.
_TERMINALS: dict[str, tuple[str, str]] = {
    "DEL": ("T1", "T3"),
    "BOM": ("T1", "T2"),
    "BLR": ("T1", "T2"),
    "MAA": ("T1", "T2"),
    "CCU": ("T2", "T2"),
    "HYD": ("Main", "Main"),
    "GOI": ("T1", "T1"),
    "COK": ("T1", "T3"),
    "DXB": ("T1", "T1"),
    "SHJ": ("T1", "T1"),
    "AUH": ("Terminal A", "Terminal A"),
    "DOH": ("Main", "Main"),
    "IST": ("Main", "Main"),
    "TBS": ("Main", "Main"),
    "SIN": ("T1", "T1"),
    "BKK": ("Main", "Main"),
    "LHR": ("T4", "T4"),
}
_AIRLINE_TERMINALS = {("DXB", "EK"): "T3", ("DXB", "FZ"): "T2", ("SIN", "SQ"): "T3", ("LHR", "BA"): "T5", ("LHR", "AI"): "T2", ("DEL", "AI"): "T3"}


def terminal_for(code: str, airline_code: str, international: bool) -> str:
    override = _AIRLINE_TERMINALS.get((code, airline_code))
    if override:
        return override
    domestic, intl = _TERMINALS.get(code, ("Main", "Main"))
    return intl if international else domestic


def distance_km(origin: str, destination: str) -> float:
    a, b = AIRPORTS[origin], AIRPORTS[destination]
    lat1, lon1, lat2, lon2 = map(radians, (a.lat, a.lon, b.lat, b.lon))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * asin(sqrt(h))
