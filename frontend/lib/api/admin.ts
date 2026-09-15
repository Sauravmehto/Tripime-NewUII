import { apiClient } from "./client";
import { getAdminToken } from "@/lib/admin-auth";
import type {
  AdminLoginResponse,
  AdminStats,
  Booking,
  Enquiry,
  EnquirySource,
  EnquiryStats,
  EnquiryStatus,
  PackageCatalog,
  PackageInput,
  PackageTheme,
  PackageThemeInput,
  TravelPackage,
  AgencyProfile,
  AgencyProfileInput,
  WebsiteAbout,
  WebsiteAirlines,
  WebsiteBanners,
  WebsiteBlogs,
  WebsiteBusRoutes,
  WebsiteCms,
  WebsiteDeals,
  WebsiteDestinations,
  WebsiteFaqs,
  WebsiteFlightRoutes,
  WebsiteGeneral,
  WebsiteMarquees,
  WebsiteSeo,
  WebsiteSeoMore,
  WebsiteServicePages,
  WebsiteSetting,
  WebsiteSitemapCheckResult,
  WebsiteSocial,
  WebsiteTestimonials,
  WebsiteVideoBlogs,
  WebsiteVisa,
  WebsiteWhy,
  CustomTheme,
  CustomerLogin,
  FlightSearchLog,
  MarketingBanner,
  MarketingVideo,
} from "@/types";

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function adminLogin(
  username: string,
  password: string,
): Promise<AdminLoginResponse> {
  const { data } = await apiClient.post<AdminLoginResponse>(
    "/api/admin/login",
    { username, password },
  );
  return data;
}

export async function listAdminBookings(): Promise<Booking[]> {
  const { data } = await apiClient.get<Booking[]>("/api/admin/bookings", {
    headers: authHeaders(),
  });
  return data;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>("/api/admin/stats", {
    headers: authHeaders(),
  });
  return data;
}

export async function confirmAdminBooking(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.post<Booking>(
    `/api/admin/bookings/${bookingId}/confirm`,
    {},
    { headers: authHeaders() },
  );
  return data;
}

export async function listAdminPackages(
  catalog?: PackageCatalog,
): Promise<TravelPackage[]> {
  const { data } = await apiClient.get<TravelPackage[]>("/api/admin/packages", {
    headers: authHeaders(),
    params: catalog ? { catalog } : undefined,
  });
  return data;
}

export async function createAdminPackage(
  payload: PackageInput,
): Promise<TravelPackage> {
  const { data } = await apiClient.post<TravelPackage>(
    "/api/admin/packages",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminPackage(
  packageId: string,
  payload: PackageInput,
): Promise<TravelPackage> {
  const { data } = await apiClient.put<TravelPackage>(
    `/api/admin/packages/${packageId}`,
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function deleteAdminPackage(packageId: string): Promise<void> {
  await apiClient.delete(`/api/admin/packages/${packageId}`, {
    headers: authHeaders(),
  });
}

export async function listAdminEnquiries(
  source?: EnquirySource,
): Promise<Enquiry[]> {
  const { data } = await apiClient.get<Enquiry[]>("/api/admin/enquiries", {
    headers: authHeaders(),
    params: source ? { source } : undefined,
  });
  return data;
}

export async function getAdminEnquiryStats(): Promise<EnquiryStats> {
  const { data } = await apiClient.get<EnquiryStats>("/api/admin/enquiries/stats", {
    headers: authHeaders(),
  });
  return data;
}

export async function listAdminPackageThemes(): Promise<PackageTheme[]> {
  const { data } = await apiClient.get<PackageTheme[]>("/api/admin/package-themes", {
    headers: authHeaders(),
  });
  return data;
}

export async function createAdminPackageTheme(
  payload: PackageThemeInput,
): Promise<PackageTheme> {
  const { data } = await apiClient.post<PackageTheme>(
    "/api/admin/package-themes",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminPackageTheme(
  themeId: string,
  payload: PackageThemeInput,
): Promise<PackageTheme> {
  const { data } = await apiClient.put<PackageTheme>(
    `/api/admin/package-themes/${themeId}`,
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function deleteAdminPackageTheme(themeId: string): Promise<void> {
  await apiClient.delete(`/api/admin/package-themes/${themeId}`, {
    headers: authHeaders(),
  });
}

export async function updateAdminEnquiryStatus(
  enquiryId: string,
  status: EnquiryStatus,
): Promise<Enquiry> {
  const { data } = await apiClient.post<Enquiry>(
    `/api/admin/enquiries/${enquiryId}/status`,
    { status },
    { headers: authHeaders() },
  );
  return data;
}

export async function getAdminProfile(): Promise<AgencyProfile> {
  const { data } = await apiClient.get<AgencyProfile>("/api/admin/profile", {
    headers: authHeaders(),
  });
  return data;
}

export async function updateAdminProfile(
  payload: AgencyProfileInput,
): Promise<AgencyProfile> {
  const { data } = await apiClient.put<AgencyProfile>(
    "/api/admin/profile",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function getAdminWebsite(): Promise<WebsiteCms> {
  const { data } = await apiClient.get<WebsiteCms>("/api/admin/website", {
    headers: authHeaders(),
  });
  return data;
}

export async function updateAdminWebsiteGeneral(
  payload: WebsiteGeneral,
): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/general",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteSetting(
  payload: WebsiteSetting,
): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/setting",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteSeo(payload: WebsiteSeo): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/seo",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteSeoMore(payload: WebsiteSeoMore): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/seo-more",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function checkAdminSitemap(url: string): Promise<WebsiteSitemapCheckResult> {
  const { data } = await apiClient.post<WebsiteSitemapCheckResult>(
    "/api/admin/website/seo-more/check-sitemap",
    { url },
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteServicePages(
  payload: WebsiteServicePages,
): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/service-pages",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteAbout(payload: WebsiteAbout): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/about",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteBanners(payload: WebsiteBanners): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/banners",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteDeals(payload: WebsiteDeals): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/deals",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteVisa(payload: WebsiteVisa): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/visa",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteTestimonials(
  payload: WebsiteTestimonials,
): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/testimonials",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteBlogs(payload: WebsiteBlogs): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/blogs",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteVideoBlogs(
  payload: WebsiteVideoBlogs,
): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/video-blogs",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteMarquees(payload: WebsiteMarquees): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/marquees",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteDestinations(
  payload: WebsiteDestinations,
): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/destinations",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteWhy(payload: WebsiteWhy): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/why",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteFaqs(payload: WebsiteFaqs): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/faqs",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteFlightRoutes(
  payload: WebsiteFlightRoutes,
): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/flight-routes",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteAirlines(payload: WebsiteAirlines): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/airlines",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteBusRoutes(payload: WebsiteBusRoutes): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/bus-routes",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function updateAdminWebsiteSocial(payload: WebsiteSocial): Promise<WebsiteCms> {
  const { data } = await apiClient.put<WebsiteCms>(
    "/api/admin/website/social",
    payload,
    { headers: authHeaders() },
  );
  return data;
}

export async function getAdminThemes(): Promise<CustomTheme[]> {
  const { data } = await apiClient.get<CustomTheme[]>("/api/admin/themes", {
    headers: authHeaders(),
  });
  return data;
}

export async function updateAdminThemes(items: CustomTheme[]): Promise<CustomTheme[]> {
  const { data } = await apiClient.put<CustomTheme[]>(
    "/api/admin/themes",
    { items },
    { headers: authHeaders() },
  );
  return data;
}

export async function getAdminMarketing(): Promise<MarketingBanner[]> {
  const { data } = await apiClient.get<MarketingBanner[]>("/api/admin/marketing", {
    headers: authHeaders(),
  });
  return data;
}

export async function updateAdminMarketing(
  items: MarketingBanner[],
): Promise<MarketingBanner[]> {
  const { data } = await apiClient.put<MarketingBanner[]>(
    "/api/admin/marketing",
    { items },
    { headers: authHeaders() },
  );
  return data;
}

export async function getAdminMarketingVideos(): Promise<MarketingVideo[]> {
  const { data } = await apiClient.get<MarketingVideo[]>("/api/admin/marketing-videos", {
    headers: authHeaders(),
  });
  return data;
}

export async function updateAdminMarketingVideos(
  items: MarketingVideo[],
): Promise<MarketingVideo[]> {
  const { data } = await apiClient.put<MarketingVideo[]>(
    "/api/admin/marketing-videos",
    { items },
    { headers: authHeaders() },
  );
  return data;
}

export async function getAdminCustomers(): Promise<CustomerLogin[]> {
  const { data } = await apiClient.get<CustomerLogin[]>("/api/admin/customers", {
    headers: authHeaders(),
  });
  return data;
}

export async function getAdminFlightSearches(): Promise<FlightSearchLog[]> {
  const { data } = await apiClient.get<FlightSearchLog[]>("/api/admin/flight-searches", {
    headers: authHeaders(),
  });
  return data;
}
