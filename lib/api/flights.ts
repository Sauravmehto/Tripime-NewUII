import { apiClient } from "./client";
import type { FlightSearchResponse, SearchParams } from "@/types";

export async function searchFlights(
  params: SearchParams,
): Promise<FlightSearchResponse> {
  const { data } = await apiClient.get<FlightSearchResponse>(
    "/api/flights/search",
    { params },
  );
  return data;
}
