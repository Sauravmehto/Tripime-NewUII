import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app import config
from app.models.admin import AdminLoginRequest, AdminLoginResponse, AdminStats
from app.models.agency_profile import AgencyProfileResponse, AgencyProfileUpdate
from app.models.booking import Booking
from app.models.enquiry import Enquiry, EnquirySource, EnquiryStats, EnquiryStatusUpdate
from app.models.package import Package, PackageCatalog, PackageCreate, PackageUpdate
from app.models.package_theme import PackageTheme, PackageThemeCreate, PackageThemeUpdate
from app.models.admin_ops import (
    CustomTheme,
    CustomThemesPayload,
    CustomerLogin,
    FlightSearchLog,
    MarketingBanner,
    MarketingBannersPayload,
    MarketingVideo,
    MarketingVideosPayload,
)
from app.models.website_cms import (
    WebsiteAbout,
    WebsiteBanners,
    WebsiteBlogs,
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
    WebsiteSitemapCheckRequest,
    WebsiteSitemapCheckResult,
    WebsiteSocial,
    WebsiteTestimonials,
    WebsiteVideoBlogs,
    WebsiteVisa,
    WebsiteWhy,
    WebsiteAirlines,
    WebsiteBusRoutes,
)
from app.services.admin_auth import create_admin_token, require_admin
from app.services.agency_profile_service import get_agency_profile_service
from app.services.booking_service import get_booking_service
from app.services.email_service import send_booking_confirmation_email
from app.services.enquiry_service import get_enquiry_service
from app.services.package_service import get_package_service
from app.services.package_theme_service import get_package_theme_service
from app.services.admin_ops_service import get_admin_ops_service
from app.services.website_cms_service import get_website_cms_service

router = APIRouter()


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest) -> AdminLoginResponse:
    valid_username = secrets.compare_digest(payload.username, config.ADMIN_USERNAME)
    valid_password = secrets.compare_digest(payload.password, config.ADMIN_PASSWORD)
    if not (valid_username and valid_password):
        raise HTTPException(status_code=401, detail="Invalid admin username or password.")

    token, expires_at = create_admin_token()
    return AdminLoginResponse(token=token, expiresAt=expires_at.isoformat())


@router.get("/profile", response_model=AgencyProfileResponse, dependencies=[Depends(require_admin)])
def get_agency_profile() -> AgencyProfileResponse:
    return get_agency_profile_service().get_profile()


@router.put("/profile", response_model=AgencyProfileResponse, dependencies=[Depends(require_admin)])
def update_agency_profile(payload: AgencyProfileUpdate) -> AgencyProfileResponse:
    return get_agency_profile_service().update_profile(payload)


@router.get("/website", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def get_website_cms() -> WebsiteCms:
    return get_website_cms_service().get_cms()


@router.put("/website/general", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_general(payload: WebsiteGeneral) -> WebsiteCms:
    return get_website_cms_service().update_general(payload)


@router.put("/website/setting", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_setting(payload: WebsiteSetting) -> WebsiteCms:
    return get_website_cms_service().update_website(payload)


@router.put("/website/seo", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_seo(payload: WebsiteSeo) -> WebsiteCms:
    return get_website_cms_service().update_seo(payload)


@router.put("/website/seo-more", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_seo_more(payload: WebsiteSeoMore) -> WebsiteCms:
    return get_website_cms_service().update_seo_more(payload)


@router.post(
    "/website/seo-more/check-sitemap",
    response_model=WebsiteSitemapCheckResult,
    dependencies=[Depends(require_admin)],
)
def check_website_sitemap(payload: WebsiteSitemapCheckRequest) -> WebsiteSitemapCheckResult:
    return get_website_cms_service().check_sitemap(payload.url)


@router.put("/website/service-pages", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_service_pages(payload: WebsiteServicePages) -> WebsiteCms:
    return get_website_cms_service().update_service_pages(payload)


@router.put("/website/about", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_about(payload: WebsiteAbout) -> WebsiteCms:
    return get_website_cms_service().update_about(payload)


@router.put("/website/banners", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_banners(payload: WebsiteBanners) -> WebsiteCms:
    return get_website_cms_service().update_banners(payload)


@router.put("/website/deals", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_deals(payload: WebsiteDeals) -> WebsiteCms:
    return get_website_cms_service().update_deals(payload)


@router.put("/website/visa", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_visa(payload: WebsiteVisa) -> WebsiteCms:
    return get_website_cms_service().update_visa(payload)


@router.put("/website/testimonials", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_testimonials(payload: WebsiteTestimonials) -> WebsiteCms:
    return get_website_cms_service().update_testimonials(payload)


@router.put("/website/blogs", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_blogs(payload: WebsiteBlogs) -> WebsiteCms:
    return get_website_cms_service().update_blogs(payload)


@router.put("/website/video-blogs", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_video_blogs(payload: WebsiteVideoBlogs) -> WebsiteCms:
    return get_website_cms_service().update_video_blogs(payload)


@router.put("/website/marquees", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_marquees(payload: WebsiteMarquees) -> WebsiteCms:
    return get_website_cms_service().update_marquees(payload)


@router.put("/website/destinations", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_destinations(payload: WebsiteDestinations) -> WebsiteCms:
    return get_website_cms_service().update_destinations(payload)


@router.put("/website/why", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_why(payload: WebsiteWhy) -> WebsiteCms:
    return get_website_cms_service().update_why(payload)


@router.put("/website/faqs", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_faqs(payload: WebsiteFaqs) -> WebsiteCms:
    return get_website_cms_service().update_faqs(payload)


@router.put("/website/flight-routes", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_flight_routes(payload: WebsiteFlightRoutes) -> WebsiteCms:
    return get_website_cms_service().update_flight_routes(payload)


@router.put("/website/airlines", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_airlines(payload: WebsiteAirlines) -> WebsiteCms:
    return get_website_cms_service().update_airlines(payload)


@router.put("/website/bus-routes", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_bus_routes(payload: WebsiteBusRoutes) -> WebsiteCms:
    return get_website_cms_service().update_bus_routes(payload)


@router.put("/website/social", response_model=WebsiteCms, dependencies=[Depends(require_admin)])
def update_website_social(payload: WebsiteSocial) -> WebsiteCms:
    return get_website_cms_service().update_social(payload)


@router.get("/themes", response_model=list[CustomTheme], dependencies=[Depends(require_admin)])
def admin_list_themes() -> list[CustomTheme]:
    return get_admin_ops_service().list_themes()


@router.put("/themes", response_model=list[CustomTheme], dependencies=[Depends(require_admin)])
def admin_update_themes(payload: CustomThemesPayload) -> list[CustomTheme]:
    return get_admin_ops_service().update_themes(payload)


@router.get(
    "/marketing",
    response_model=list[MarketingBanner],
    dependencies=[Depends(require_admin)],
)
def admin_list_marketing() -> list[MarketingBanner]:
    return get_admin_ops_service().list_marketing_banners()


@router.put(
    "/marketing",
    response_model=list[MarketingBanner],
    dependencies=[Depends(require_admin)],
)
def admin_update_marketing(payload: MarketingBannersPayload) -> list[MarketingBanner]:
    return get_admin_ops_service().update_marketing_banners(payload)


@router.get(
    "/marketing-videos",
    response_model=list[MarketingVideo],
    dependencies=[Depends(require_admin)],
)
def admin_list_marketing_videos() -> list[MarketingVideo]:
    return get_admin_ops_service().list_marketing_videos()


@router.put(
    "/marketing-videos",
    response_model=list[MarketingVideo],
    dependencies=[Depends(require_admin)],
)
def admin_update_marketing_videos(payload: MarketingVideosPayload) -> list[MarketingVideo]:
    return get_admin_ops_service().update_marketing_videos(payload)


@router.get(
    "/customers",
    response_model=list[CustomerLogin],
    dependencies=[Depends(require_admin)],
)
def admin_list_customers() -> list[CustomerLogin]:
    return get_admin_ops_service().list_customers()


@router.get(
    "/flight-searches",
    response_model=list[FlightSearchLog],
    dependencies=[Depends(require_admin)],
)
def admin_list_flight_searches() -> list[FlightSearchLog]:
    return get_admin_ops_service().list_flight_searches()


@router.get("/bookings", response_model=list[Booking], dependencies=[Depends(require_admin)])
def list_bookings() -> list[Booking]:
    return get_booking_service().list_bookings()


@router.post(
    "/bookings/{booking_id}/confirm",
    response_model=Booking,
    dependencies=[Depends(require_admin)],
)
def confirm_booking(booking_id: str, background_tasks: BackgroundTasks) -> Booking:
    booking, newly_confirmed = get_booking_service().confirm_booking(booking_id)
    if newly_confirmed:
        background_tasks.add_task(send_booking_confirmation_email, booking)
    return booking


@router.get("/stats", response_model=AdminStats, dependencies=[Depends(require_admin)])
def get_stats() -> AdminStats:
    bookings = get_booking_service().list_bookings()
    today = datetime.now(timezone.utc).date().isoformat()

    total_bookings = len(bookings)
    confirmed_bookings = sum(1 for b in bookings if b.status == "CONFIRMED")
    pending_bookings = sum(1 for b in bookings if b.status == "PROCESSING")
    bookings_today = sum(1 for b in bookings if b.createdAt[:10] == today)
    total_revenue = sum(b.totalAmount for b in bookings)

    return AdminStats(
        totalBookings=total_bookings,
        confirmedBookings=confirmed_bookings,
        pendingBookings=pending_bookings,
        bookingsToday=bookings_today,
        totalRevenue=total_revenue,
    )


@router.get("/packages", response_model=list[Package], dependencies=[Depends(require_admin)])
def admin_list_packages(
    catalog: PackageCatalog | None = Query(default=None),
) -> list[Package]:
    return get_package_service().list_packages(catalog=catalog, active_only=False)


@router.get(
    "/package-themes",
    response_model=list[PackageTheme],
    dependencies=[Depends(require_admin)],
)
def admin_list_package_themes() -> list[PackageTheme]:
    return get_package_theme_service().list_themes(active_only=False)


@router.post(
    "/package-themes",
    response_model=PackageTheme,
    dependencies=[Depends(require_admin)],
)
def admin_create_package_theme(payload: PackageThemeCreate) -> PackageTheme:
    return get_package_theme_service().create_theme(payload)


@router.put(
    "/package-themes/{theme_id}",
    response_model=PackageTheme,
    dependencies=[Depends(require_admin)],
)
def admin_update_package_theme(theme_id: str, payload: PackageThemeUpdate) -> PackageTheme:
    return get_package_theme_service().update_theme(theme_id, payload)


@router.delete(
    "/package-themes/{theme_id}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
def admin_delete_package_theme(theme_id: str) -> None:
    get_package_theme_service().delete_theme(theme_id)


@router.post("/packages", response_model=Package, dependencies=[Depends(require_admin)])
def admin_create_package(payload: PackageCreate) -> Package:
    return get_package_service().create_package(payload)


@router.put(
    "/packages/{package_id}",
    response_model=Package,
    dependencies=[Depends(require_admin)],
)
def admin_update_package(package_id: str, payload: PackageUpdate) -> Package:
    return get_package_service().update_package(package_id, payload)


@router.delete(
    "/packages/{package_id}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
def admin_delete_package(package_id: str) -> None:
    get_package_service().delete_package(package_id)


@router.get(
    "/enquiries/stats",
    response_model=EnquiryStats,
    dependencies=[Depends(require_admin)],
)
def admin_enquiry_stats() -> EnquiryStats:
    return get_enquiry_service().stats()


@router.get("/enquiries", response_model=list[Enquiry], dependencies=[Depends(require_admin)])
def admin_list_enquiries(
    source: EnquirySource | None = Query(default=None),
) -> list[Enquiry]:
    return get_enquiry_service().list_enquiries(source=source)


@router.post(
    "/enquiries/{enquiry_id}/status",
    response_model=Enquiry,
    dependencies=[Depends(require_admin)],
)
def admin_update_enquiry_status(enquiry_id: str, payload: EnquiryStatusUpdate) -> Enquiry:
    enquiry = get_enquiry_service().update_status(enquiry_id, payload.status)
    if enquiry is None:
        raise HTTPException(status_code=404, detail=f"Enquiry '{enquiry_id}' not found.")
    return enquiry
