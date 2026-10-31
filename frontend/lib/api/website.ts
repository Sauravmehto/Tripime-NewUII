import type { WebsitePromoItem } from "@/types";
import { apiClient } from "./client";

export type PromoBanner = WebsitePromoItem;

/** Active promotional banners managed in Admin → Websites → Promotional banner. */
export async function getPromoBanners(category?: string): Promise<PromoBanner[]> {
  const { data } = await apiClient.get<PromoBanner[]>("/api/website/banners", {
    params: category ? { category } : undefined,
  });
  return data;
}

/** Active deals/offers managed in Admin → Websites → Deals & Offers. */
export async function getPromoDeals(category?: string): Promise<PromoBanner[]> {
  const { data } = await apiClient.get<PromoBanner[]>("/api/website/deals", {
    params: category ? { category } : undefined,
  });
  return data;
}
