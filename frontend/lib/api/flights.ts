import { apiClient } from "./client";
import type {
  CabinClass,
  FareCalendarResponse,
  FlightCatalog,
  FlightSearchResponse,
  SearchParams,
} from "@/types";

export async function searchFlights(
  params: SearchParams,
): Promise<FlightSearchResponse> {
  const { data } = await apiClient.get<FlightSearchResponse>(
    "/api/flights/search",
    {
      params: {
        origin: params.origin,
        destination: params.destination,
        date: params.date,
        returnDate: params.tripType === "round_trip" ? params.returnDate : undefined,
        adults: params.adults,
        children: params.children,
        infants: params.infants,
        cabin: params.cabin,
      },
    },
  );
  return data;
}

export async function getFlightCatalog(): Promise<FlightCatalog> {
  const { data } = await apiClient.get<FlightCatalog>("/api/flights/catalog");
  return data;
}

export async function getFareCalendar(
  origin: string,
  destination: string,
  month: string,
  cabin: CabinClass,
): Promise<FareCalendarResponse> {
  const { data } = await apiClient.get<FareCalendarResponse>(
    "/api/flights/fare-calendar",
    { params: { origin, destination, month, cabin } },
  );
  return data;
}
