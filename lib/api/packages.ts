import { apiClient } from "./client";
import type { PackageTheme, TravelPackage } from "@/types";

export async function listPackages(): Promise<TravelPackage[]> {
  const { data } = await apiClient.get<TravelPackage[]>("/api/packages");
  return data;
}

export async function getPackage(packageId: string): Promise<TravelPackage> {
  const { data } = await apiClient.get<TravelPackage>(
    `/api/packages/${packageId}`,
  );
  return data;
}

export async function listPackageThemes(): Promise<PackageTheme[]> {
  const { data } = await apiClient.get<PackageTheme[]>("/api/package-themes");
  return data;
}
