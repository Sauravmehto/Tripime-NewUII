import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app import config
from app.models.admin import AdminLoginRequest, AdminLoginResponse, AdminSessionResponse, AdminStats
from app.models.agency_profile import AgencyProfileResponse, AgencyProfileUpdate
from app.models.booking import (
    AirlineConfirmationRequest,
    Booking,
    InvoiceUpdateRequest,
    ManualPaymentRequest,
    StateNoteRequest,
    TicketIssueRequest,
)
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
from app.services.admin_auth import (
    admin_claims,
    clear_admin_cookie,
    create_admin_token,
    require_admin,
    set_admin_cookie,
)
from app.services.login_throttle import login_throttle
from app.services.rate_limit import client_ip
from app.services.agency_profile_service import get_agency_profile_service
from app.services.customer_account_service import get_customer_account_service
from app.services.booking_service import get_booking_service
from app.services.email_service import send_invoice_email
from app.services.notification_service import notify_booking_event, retry_undelivered
from app.services.enquiry_service import get_enquiry_service
from app.services.invoice_service import build_invoice_pdf, build_ticket_pdf
from app.services.package_service import get_package_service
from app.services.package_theme_service import get_package_theme_service
from app.services.admin_ops_service import get_admin_ops_service
from app.services.website_cms_service import get_website_cms_service

router = APIRouter()


LOGIN_FAILED = "Invalid admin username or password."


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest, request: Request, response: Response) -> AdminLoginResponse:
    ip = client_ip(request)
    locked = login_throttle.locked_seconds(ip, payload.username)
    if locked:
        # Checked before the password is looked at, so a lockout can't be used to keep guessing.
        raise HTTPException(
            status_code=429,
            detail=f"Too many sign-in attempts. Try again in {max(1, -(-locked // 60))} minute(s).",
            headers={"Retry-After": str(locked)},
        )

    # Both comparisons always run and the error is identical, so nothing reveals which part was wrong.
    valid_username = secrets.compare_digest(payload.username.encode(), config.ADMIN_USERNAME.encode())
    valid_password = secrets.compare_digest(payload.password.encode(), config.ADMIN_PASSWORD.encode())
    if not (valid_username and valid_password):
        login_throttle.record_failure(ip, payload.username)
        raise HTTPException(status_code=401, detail=LOGIN_FAILED)

    login_throttle.record_success(ip, payload.username)
    token, expires_at, csrf = create_admin_token()
    set_admin_cookie(response, token)
    return AdminLoginResponse(
        token=token if config.ADMIN_RETURN_TOKEN else None,
        csrfToken=csrf,
        expiresAt=expires_at.isoformat(),
    )


@router.get("/session", response_model=AdminSessionResponse)
def admin_session(request: Request) -> AdminSessionResponse:
    """Who am I? Also how the page learns its CSRF token after a reload (only the cookie holder can read it)."""
    try:
        claims = admin_claims(request)
    except HTTPException:
        return AdminSessionResponse(authenticated=False)
    expires = datetime.fromtimestamp(claims["exp"], tz=timezone.utc).isoformat()
    return AdminSessionResponse(authenticated=True, csrfToken=claims.get("csrf"), expiresAt=expires)


@router.post("/logout", status_code=204)
def admin_logout(response: Response) -> None:
    clear_admin_cookie(response)


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


class TemporaryPasswordResponse(BaseModel):
    customerId: str
    email: str
    # Shown to the admin once; only its hash is stored.
    temporaryPassword: str


@router.post(
    "/customers/{customer_id}/password",
    response_model=TemporaryPasswordResponse,
    dependencies=[Depends(require_admin)],
)
def admin_reset_customer_password(customer_id: str) -> TemporaryPasswordResponse:
    """Give a customer a one-time password (forgotten password, or claiming bookings made
    before accounts existed). They must choose their own password after signing in."""
    customer = get_admin_ops_service().find_customer_by_id(customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found.")
    password = get_customer_account_service().admin_set_temporary_password(customer)
    return TemporaryPasswordResponse(customerId=customer.id, email=customer.email, temporaryPassword=password)


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


def _then_notify(tasks: BackgroundTasks, booking: Booking, event: str) -> Booking:
    tasks.add_task(notify_booking_event, booking.bookingId, event)
    return booking


@router.post("/bookings/{booking_id}/payment/confirm", response_model=Booking, dependencies=[Depends(require_admin)])
def confirm_payment(booking_id: str, payload: ManualPaymentRequest, background_tasks: BackgroundTasks) -> Booking:
    """Record a payment the admin has verified (bank statement / UPI app). Never automatic."""
    return _then_notify(background_tasks, get_booking_service().confirm_payment(booking_id, payload), "payment_confirmed")


@router.post("/bookings/{booking_id}/payment/fail", response_model=Booking, dependencies=[Depends(require_admin)])
def fail_payment(booking_id: str, payload: StateNoteRequest, background_tasks: BackgroundTasks) -> Booking:
    return _then_notify(background_tasks, get_booking_service().fail_payment(booking_id, payload.note), "payment_failed")


@router.post("/bookings/{booking_id}/payment/reopen", response_model=Booking, dependencies=[Depends(require_admin)])
def reopen_payment(booking_id: str, payload: StateNoteRequest) -> Booking:
    return get_booking_service().reopen_payment(booking_id, payload.note)


@router.post("/bookings/{booking_id}/confirm", response_model=Booking, dependencies=[Depends(require_admin)])
def confirm_booking(booking_id: str, payload: AirlineConfirmationRequest, background_tasks: BackgroundTasks) -> Booking:
    """Record the airline's confirmation (PNR) for a paid booking."""
    return _then_notify(background_tasks, get_booking_service().confirm_with_airline(booking_id, payload), "booking_confirmed")


@router.post("/bookings/{booking_id}/ticket", response_model=Booking, dependencies=[Depends(require_admin)])
def issue_ticket(booking_id: str, payload: TicketIssueRequest, background_tasks: BackgroundTasks) -> Booking:
    """Record the airline's ticket numbers; the e-ticket becomes available."""
    return _then_notify(background_tasks, get_booking_service().issue_ticket(booking_id, payload), "ticket_issued")


@router.post("/bookings/{booking_id}/fail", response_model=Booking, dependencies=[Depends(require_admin)])
def fail_booking(booking_id: str, payload: StateNoteRequest, background_tasks: BackgroundTasks) -> Booking:
    return _then_notify(background_tasks, get_booking_service().fail_booking(booking_id, payload.note), "booking_failed")


class CancelRequest(BaseModel):
    reason: str = Field("", max_length=300)


@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=Booking,
    dependencies=[Depends(require_admin)],
)
def cancel_booking(booking_id: str, payload: CancelRequest, background_tasks: BackgroundTasks) -> Booking:
    """Cancel a booking and release its seats. Refunds for paid bookings are handled offline."""
    booking, newly_cancelled = get_booking_service().cancel_booking(booking_id, payload.reason.strip())
    if newly_cancelled:
        background_tasks.add_task(notify_booking_event, booking_id, "booking_cancelled")
    return booking


@router.post(
    "/bookings/{booking_id}/notifications/retry",
    response_model=Booking,
    dependencies=[Depends(require_admin)],
)
def retry_notifications(booking_id: str) -> Booking:
    """Re-send notifications that failed or weren't configured. Runs synchronously so the
    admin sees the new delivery status straight away."""
    if get_booking_service().get_booking(booking_id) is None:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
    retry_undelivered(booking_id)
    return get_booking_service().get_booking(booking_id)  # type: ignore[return-value]


@router.get(
    "/bookings/{booking_id}/ticket.pdf",
    dependencies=[Depends(require_admin)],
)
def admin_download_ticket(booking_id: str) -> Response:
    booking = get_booking_service().get_booking(booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
    try:
        content = build_ticket_pdf(booking)
    except ValueError:
        raise HTTPException(status_code=409, detail="No ticket has been issued for this booking yet.") from None
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="E-ticket-{booking.bookingId}.pdf"'},
    )


@router.put(
    "/bookings/{booking_id}/invoice",
    response_model=Booking,
    dependencies=[Depends(require_admin)],
)
def admin_update_invoice(booking_id: str, payload: InvoiceUpdateRequest) -> Booking:
    return get_booking_service().update_invoice(booking_id, payload)


@router.get(
    "/bookings/{booking_id}/invoice",
    dependencies=[Depends(require_admin)],
)
def admin_download_invoice(booking_id: str) -> Response:
    booking = get_booking_service().get_booking(booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
    pdf_bytes = build_invoice_pdf(booking)
    filename = f"Invoice-{booking.bookingId}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/bookings/{booking_id}/invoice/send",
    response_model=Booking,
    dependencies=[Depends(require_admin)],
)
def admin_send_invoice(booking_id: str) -> Booking:
    booking = get_booking_service().get_booking(booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
    pdf_bytes = build_invoice_pdf(booking)
    send_invoice_email(booking, pdf_bytes)
    return get_booking_service().mark_invoice_sent(booking_id, booking.contact.email)


@router.get("/stats", response_model=AdminStats, dependencies=[Depends(require_admin)])
def get_stats() -> AdminStats:
    bookings = get_booking_service().list_bookings()
    today = datetime.now(timezone.utc).date().isoformat()

    total_bookings = len(bookings)
    confirmed_bookings = sum(1 for b in bookings if b.bookingStatus == "confirmed")
    pending_bookings = sum(1 for b in bookings if b.bookingStatus == "pending")
    bookings_today = sum(1 for b in bookings if b.createdAt[:10] == today)
    # Revenue counts money actually taken, excluding cancelled bookings (refund due).
    total_revenue = sum(
        b.totalAmount for b in bookings if b.paymentStatus == "paid" and b.bookingStatus != "cancelled"
    )

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
