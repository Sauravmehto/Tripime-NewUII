import { apiClient } from "./client";

export interface PromoBanner {
  id: string;
  category: string;
  imageUrl: string;
  linkUrl: string;
  title: string;
  active: boolean;
}

/** Active promotional banners managed in Admin → Websites → Promotional banner. */
export async function getPromoBanners(category?: string): Promise<PromoBanner[]> {
  const { data } = await apiClient.get<PromoBanner[]>("/api/website/banners", {
    params: category ? { category } : undefined,
  });
  return data;
}
