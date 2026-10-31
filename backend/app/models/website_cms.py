import re
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class WebsiteAccount(BaseModel):
    firstName: str = Field(..., min_length=1, max_length=80)
    lastName: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    mobileNumber: str = Field("", max_length=20)
    displayNumber: str = Field("", max_length=20)
    alternativePhone: str = Field("", max_length=20)
    country: str = Field("India", max_length=80)
    state: str = Field("", max_length=80)
    city: str = Field("", max_length=80)
    address: str = Field("", max_length=400)
    pincode: str = Field("", max_length=12)


class WebsiteAgency(BaseModel):
    domainName: str = Field("", max_length=120)
    agencyName: str = Field(..., min_length=1, max_length=120)
    whitelabelType: str = Field("B2C", max_length=40)
    gstNumber: str = Field("", max_length=20)
    panNumber: str = Field("", max_length=20)
    domainSupplierName: str = Field("", max_length=120)


class WebsiteGeneral(BaseModel):
    account: WebsiteAccount
    agency: WebsiteAgency


class WebsiteLogos(BaseModel):
    logoUrl: str = Field("/brand/tripime_logo.png", max_length=500)
    faviconUrl: str = Field("/brand/tripime_logo.png", max_length=500)
    mobileLogoUrl: str = Field("/brand/tripime_logo.png", max_length=500)
    footerLogoUrl: str = Field("", max_length=500)
    desktopBannerUrl: str = Field("", max_length=500)
    mobileBannerUrl: str = Field("", max_length=500)


class WebsiteTheme(BaseModel):
    colorTheme: str = Field("#2563eb", max_length=20)
    backgroundColor: str = Field("#dbeafe", max_length=20)
    headerColor: str = Field("#101010", max_length=20)
    gradientColor: str = Field("#101010", max_length=20)
    textColor: str = Field("#101010", max_length=20)
    footerColor: str = Field("#101010", max_length=20)


class WebsiteDefaultFlight(BaseModel):
    fromCode: str = Field("DEL", min_length=3, max_length=8)
    toCode: str = Field("BOM", min_length=3, max_length=8)


class WebsiteRecaptcha(BaseModel):
    siteKey: str = Field("", max_length=200)
    secretKey: str = Field("", max_length=200)


class WebsiteSupportMap(BaseModel):
    embedUrl: str = Field("", max_length=1000)


class WebsiteSetting(BaseModel):
    logos: WebsiteLogos = Field(default_factory=WebsiteLogos)
    theme: WebsiteTheme = Field(default_factory=WebsiteTheme)
    defaultFlight: WebsiteDefaultFlight = Field(default_factory=WebsiteDefaultFlight)
    recaptcha: WebsiteRecaptcha = Field(default_factory=WebsiteRecaptcha)
    supportMap: WebsiteSupportMap = Field(default_factory=WebsiteSupportMap)


class WebsiteHomeSeo(BaseModel):
    title: str = Field(
        "Tripime Trips | Best Travel Agency in India for Flights, Holidays & Tours",
        max_length=200,
    )
    keywords: str = Field(
        "Tripime, Tripime travel, travel agency India, flight booking, holidays, tours",
        max_length=1000,
    )
    description: str = Field(
        "Tripime is a travel agency in India for flights, holiday packages, hotels, and tours. Book smart and travel better with expert support.",
        max_length=500,
    )
    headerScript: str = Field("", max_length=50000)
    bodyScript: str = Field("", max_length=50000)
    footerScript: str = Field("", max_length=50000)
    facebookPixel: str = Field("", max_length=50000)


class WebsitePageSeo(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=80)
    title: str = Field("", max_length=200)
    keywords: str = Field("", max_length=1000)
    description: str = Field("", max_length=500)
    content: str = Field("", max_length=20000)


class WebsiteDynamicRoutes(BaseModel):
    flight: str = Field("flight", max_length=80)
    hotel: str = Field("hotel", max_length=80)
    holiday: str = Field("holiday", max_length=80)
    activity: str = Field("activity", max_length=80)
    groupEnquiry: str = Field("group_enquiry", max_length=80)


def default_all_pages() -> list[WebsitePageSeo]:
    return [
        WebsitePageSeo(id="about", label="About"),
        WebsitePageSeo(id="contact", label="Contact"),
        WebsitePageSeo(id="flights", label="Flights"),
        WebsitePageSeo(id="hotels", label="Hotels"),
        WebsitePageSeo(id="buses", label="Buses"),
        WebsitePageSeo(id="packages", label="Packages"),
        WebsitePageSeo(id="visa", label="Visa"),
        WebsitePageSeo(id="terms", label="Terms"),
        WebsitePageSeo(id="privacy", label="Privacy"),
    ]


def default_slug_pages() -> list[WebsitePageSeo]:
    return [
        WebsitePageSeo(id="holiday-india", label="holiday-india"),
        WebsitePageSeo(id="group-enquiry", label="group_enquiry"),
    ]


class WebsiteSeo(BaseModel):
    home: WebsiteHomeSeo = Field(default_factory=WebsiteHomeSeo)
    allPages: list[WebsitePageSeo] = Field(default_factory=default_all_pages)
    allPagesSelected: str = "about"
    slugPages: list[WebsitePageSeo] = Field(default_factory=default_slug_pages)
    slugPagesSelected: str = "holiday-india"
    routes: WebsiteDynamicRoutes = Field(default_factory=WebsiteDynamicRoutes)


DEFAULT_ROBOTS_TXT = (
    "User-agent: *\n"
    "Disallow: /admin/\n"
    "Disallow: /login/\n"
    "Disallow: /account/\n"
    "Disallow: /cart/\n"
    "Disallow: /checkout/\n"
    "Disallow: /payment/\n"
    "Disallow: /thank-you/\n"
    "Disallow: /booking-confirmation/\n"
    "Disallow: /search\n"
    "Disallow: /*?*\n"
    "Sitemap: https://tripime.com/sitemap.xml\n"
)


class WebsiteSeoMore(BaseModel):
    sitemapUrl: str = Field("https://tripime.com/sitemap.xml", max_length=500)
    robotsTxt: str = Field(DEFAULT_ROBOTS_TXT, max_length=20000)


class WebsiteSitemapCheckRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=500)


class WebsiteSitemapCheckResult(BaseModel):
    ok: bool
    statusCode: int | None = None
    contentType: str = ""
    message: str


class WebsiteServicePage(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    title: str = Field(..., min_length=1, max_length=200)
    link: str = Field(..., min_length=1, max_length=300)
    status: str = Field("Active", max_length=20)
    metaTitle: str = Field("", max_length=200)
    metaKeywords: str = Field("", max_length=1000)
    metaDescription: str = Field("", max_length=500)
    content: str = Field("", max_length=20000)


class WebsiteServicePages(BaseModel):
    pages: list[WebsiteServicePage] = Field(default_factory=list)


class WebsiteAboutBlock(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=120)
    heading: str = Field("Home About", max_length=120)
    body: str = Field("", max_length=20000)
    bulletsTitle: str = Field("", max_length=120)
    bullets: list[str] = Field(default_factory=list)
    tagline: str = Field("", max_length=200)


def default_about_blocks() -> list[WebsiteAboutBlock]:
    return [
        WebsiteAboutBlock(
            id="index",
            label="Home About (Index Page)",
            heading="Home About",
            body=(
                "Tripime is a travel platform designed to make flight bookings, hotel stays, "
                "and holiday planning simple, transparent, and affordable. Whether you are flying "
                "for business, planning a family vacation, or exploring a new destination, Tripime "
                "helps you compare options and book with confidence."
            ),
            bulletsTitle="Why Choose Tripime?",
            bullets=[
                "Affordable flight and hotel bookings",
                "Curated domestic and international holiday packages",
                "Clear pricing with expert support when you need it",
                "Easy enquiry flow for groups and custom itineraries",
            ],
            tagline="Tripime — Book Smart. Travel Better.",
        ),
        WebsiteAboutBlock(
            id="hotel",
            label="Home About (Hotel Page)",
            heading="Home About",
            body=(
                "Find the perfect stay with Tripime. Browse verified hotels and homestays at "
                "competitive prices, with clear inclusions and support when you need to change dates."
            ),
        ),
        WebsiteAboutBlock(
            id="holiday",
            label="Home About (Holiday Page)",
            heading="Home About",
            body=(
                "Discover memorable holiday packages for couples, families, and groups. From short "
                "getaways to international tours, Tripime curates itineraries you can customise."
            ),
        ),
        WebsiteAboutBlock(
            id="bus",
            label="Home About (Bus Page)",
            heading="Home About",
            body="",
        ),
    ]


class WebsiteAbout(BaseModel):
    blocks: list[WebsiteAboutBlock] = Field(default_factory=default_about_blocks)


PEXELS = "https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&cs=tinysrgb&w=1200"


PromoLinkType = Literal["page", "package", "external"]

# Categories an offer (Deals & Offers) may belong to. "popup" is the homepage popup slot, not an offer.
DEAL_CATEGORIES = ("flight", "hotel", "bus", "holiday", "bank", "activity", "popup")

_COUPON_RE = re.compile(r"^[A-Z0-9][A-Z0-9_-]{2,29}$")
_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_PACKAGE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
_IST = timezone(timedelta(hours=5, minutes=30))


def parse_valid_until(value: str) -> date | None:
    """Strict YYYY-MM-DD only. Empty means the offer has no end date."""
    value = (value or "").strip()
    if not value:
        return None
    if not _ISO_DATE_RE.match(value):
        raise ValueError("Validity date must be in YYYY-MM-DD format.")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("Validity date is not a real calendar date.") from exc


def promo_is_expired(valid_until: str, today: date | None = None) -> bool:
    """An offer is valid through the whole of its end date (India time)."""
    try:
        end = parse_valid_until(valid_until)
    except ValueError:
        return False
    if end is None:
        return False
    return end < (today or datetime.now(_IST).date())


class WebsitePromoItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    category: str = Field(..., min_length=1, max_length=40)
    imageUrl: str = Field(..., min_length=1, max_length=500)
    linkUrl: str = Field("", max_length=500)
    linkType: PromoLinkType = "page"
    title: str = Field("", max_length=200)
    subtitle: str = Field("", max_length=240)
    description: str = Field("", max_length=1000)
    discountText: str = Field("", max_length=80)
    couponCode: str = Field("", max_length=40)
    validUntil: str = Field("", max_length=40)
    terms: str = Field("", max_length=1200)
    minBookingValue: float = Field(0, ge=0, le=10_000_000)
    ctaLabel: str = Field("", max_length=40)
    bankName: str = Field("", max_length=80)
    bankLogoUrl: str = Field("", max_length=500)
    sortOrder: int = Field(0, ge=0, le=9999)
    active: bool = True

    @field_validator("imageUrl", "bankLogoUrl")
    @classmethod
    def _check_image_url(cls, value: str, info) -> str:
        value = value.strip()
        if not value:
            if info.field_name == "imageUrl":
                raise ValueError("Image URL is required.")
            return value
        if not (value.startswith(("https://", "http://")) or (value.startswith("/") and not value.startswith("//"))):
            raise ValueError("Image URL must start with https:// or /.")
        return value

    @field_validator("couponCode")
    @classmethod
    def _check_coupon(cls, value: str) -> str:
        value = value.strip().upper()
        if value and not _COUPON_RE.match(value):
            raise ValueError("Coupon code must be 3-30 characters: letters, numbers, - or _.")
        return value

    @field_validator("validUntil")
    @classmethod
    def _check_valid_until(cls, value: str) -> str:
        value = value.strip()
        parse_valid_until(value)
        return value

    @model_validator(mode="after")
    def _check_link(self) -> "WebsitePromoItem":
        url = self.linkUrl.strip()
        if url != self.linkUrl:
            self.linkUrl = url
        # Older records stored external links as plain URLs without a link type.
        if "linkType" not in self.model_fields_set and url.startswith(("https://", "http://")):
            self.linkType = "external"
        if not url:
            return self
        if any(ch.isspace() for ch in url):
            raise ValueError("Link must not contain spaces.")
        if self.linkType == "page":
            if not url.startswith("/") or url.startswith("//") or "\\" in url:
                raise ValueError("Page links must start with a single / (for example /packages).")
        elif self.linkType == "package":
            if not _PACKAGE_ID_RE.match(url):
                raise ValueError("Package link must be a package ID (letters, numbers, - or _).")
        elif not url.startswith("https://"):
            raise ValueError("External links must start with https://.")
        return self


def default_banners() -> list[WebsitePromoItem]:
    return [
        WebsitePromoItem(
            id="ban_flight_1",
            category="flight",
            title="Zero convenience fee",
            imageUrl=PEXELS.format(id=457882),
            linkUrl="/flights",
            active=True,
        ),
        WebsitePromoItem(
            id="ban_flight_2",
            category="flight",
            title="Travel now, pay later",
            imageUrl=PEXELS.format(id=2166553),
            linkUrl="/flights",
            active=False,
        ),
        WebsitePromoItem(
            id="ban_flight_3",
            category="flight",
            title="Domestic flight deals",
            imageUrl=PEXELS.format(id=2387866),
            linkUrl="/flights",
            active=False,
        ),
        WebsitePromoItem(
            id="ban_hotel_1",
            category="hotel",
            title="Hotel stays",
            imageUrl=PEXELS.format(id=258154),
            linkUrl="/hotels",
            active=True,
        ),
        WebsitePromoItem(
            id="ban_bus_1",
            category="bus",
            title="Bus routes",
            imageUrl=PEXELS.format(id=1178448),
            linkUrl="/buses",
            active=True,
        ),
        WebsitePromoItem(
            id="ban_holiday_1",
            category="holiday",
            title="Holiday packages",
            imageUrl=PEXELS.format(id=2166559),
            linkUrl="/packages",
            active=True,
        ),
        WebsitePromoItem(
            id="ban_hotel_bg_1",
            category="hotel-background",
            title="Hotel background",
            imageUrl=PEXELS.format(id=325193),
            linkUrl="/hotels",
            active=True,
        ),
        WebsitePromoItem(
            id="ban_bus_bg_1",
            category="bus-background",
            title="Bus background",
            imageUrl=PEXELS.format(id=1366919),
            linkUrl="/buses",
            active=True,
        ),
        WebsitePromoItem(
            id="ban_holiday_bg_1",
            category="holiday-background",
            title="Holiday background",
            imageUrl=PEXELS.format(id=2166553),
            linkUrl="/packages",
            active=True,
        ),
    ]


def default_deals() -> list[WebsitePromoItem]:
    return [
        WebsitePromoItem(
            id="deal_flight_1",
            category="flight",
            title="Zero convenience fee — UPI",
            imageUrl=PEXELS.format(id=457882),
            linkUrl="/flights",
            active=True,
        ),
        WebsitePromoItem(
            id="deal_flight_2",
            category="flight",
            title="Airline fare offers",
            imageUrl=PEXELS.format(id=2387866),
            linkUrl="/flights",
            active=True,
        ),
        WebsitePromoItem(
            id="deal_hotel_1",
            category="hotel",
            title="Stay offers",
            imageUrl=PEXELS.format(id=258154),
            linkUrl="/hotels",
            active=True,
        ),
        WebsitePromoItem(
            id="deal_popup_1",
            category="popup",
            title="Homepage popup",
            imageUrl=PEXELS.format(id=325193),
            linkUrl="/",
            active=False,
        ),
    ]


class WebsiteBanners(BaseModel):
    items: list[WebsitePromoItem] = Field(default_factory=default_banners)


class WebsiteDeals(BaseModel):
    items: list[WebsitePromoItem] = Field(default_factory=default_deals)

    @model_validator(mode="after")
    def _check_items(self) -> "WebsiteDeals":
        seen: set[str] = set()
        for item in self.items:
            if item.id in seen:
                raise ValueError(f"Duplicate offer id: {item.id}")
            seen.add(item.id)
            if item.category not in DEAL_CATEGORIES:
                raise ValueError(f"Unknown offer category: {item.category}")
            if not item.title.strip():
                raise ValueError("Every offer needs a title.")
        return self


class WebsiteVisaType(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    imageUrl: str = Field("", max_length=500)
    visaType: str = Field(..., min_length=1, max_length=80)
    location: str = Field(..., min_length=1, max_length=120)
    b2cPrice: float = Field(0, ge=0)
    b2bPrice: float = Field(0, ge=0)
    duration: str = Field("", max_length=80)
    status: str = Field("Active", max_length=20)


class WebsiteVisa(BaseModel):
    types: list[WebsiteVisaType] = Field(default_factory=list)


class WebsiteTestimonialItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    imageUrl: str = Field("", max_length=500)
    name: str = Field(..., min_length=1, max_length=120)
    rating: int = Field(5, ge=1, le=5)
    content: str = Field(..., min_length=1, max_length=2000)
    status: str = Field("Active", max_length=20)


def default_testimonials() -> list[WebsiteTestimonialItem]:
    return [
        WebsiteTestimonialItem(
            id="tst_1",
            imageUrl="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200",
            name="Anshul Das",
            rating=5,
            content=(
                "Booked a Dubai trip with Tripime and the whole process was smooth. "
                "Clear pricing, quick tickets, and a real person when I had a question."
            ),
        ),
        WebsiteTestimonialItem(
            id="tst_2",
            imageUrl="https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200",
            name="Vishwas Adhikari",
            rating=5,
            content=(
                "Udaipur and Ranthambore package was well planned. Hotels matched what was promised "
                "and the team helped us adjust one night without hassle."
            ),
        ),
        WebsiteTestimonialItem(
            id="tst_3",
            imageUrl="https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200",
            name="Priya Sharma",
            rating=5,
            content=(
                "Delhi to Mumbai in under five minutes. E-ticket landed instantly, and a real person "
                "picked up when I had a date question."
            ),
        ),
        WebsiteTestimonialItem(
            id="tst_4",
            imageUrl="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
            name="Sneha Patel",
            rating=5,
            content=(
                "Goa holiday enquiry turned into a custom itinerary the same day. Honest pricing "
                "and WhatsApp support that actually replies."
            ),
        ),
    ]


class WebsiteTestimonials(BaseModel):
    items: list[WebsiteTestimonialItem] = Field(default_factory=default_testimonials)


class WebsiteBlogPost(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    imageUrl: str = Field("", max_length=500)
    heading: str = Field(..., min_length=1, max_length=240)
    videoUrl: str = Field("", max_length=500)
    excerpt: str = Field("", max_length=500)
    content: str = Field("", max_length=50000)
    status: str = Field("Active", max_length=20)


def default_blogs() -> list[WebsiteBlogPost]:
    return [
        WebsiteBlogPost(
            id="blog_1",
            imageUrl=PEXELS.format(id=590016),
            heading="Explore India for Less: Cheap Flights and the Best Holiday Packages on Tripime",
            excerpt="How to find value fares and packages without surprise fees.",
        ),
        WebsiteBlogPost(
            id="blog_2",
            imageUrl=PEXELS.format(id=2166553),
            heading="3-Day Jaipur Itinerary: Explore the Pink City with Tripime",
            excerpt="A practical three-day plan for palaces, food, and day trips.",
        ),
        WebsiteBlogPost(
            id="blog_3",
            imageUrl=PEXELS.format(id=258154),
            heading="Top 10 Romantic Resorts Near Delhi for Couples",
            excerpt="Weekend stays within driving distance of the capital.",
        ),
    ]


class WebsiteBlogs(BaseModel):
    items: list[WebsiteBlogPost] = Field(default_factory=default_blogs)


class WebsiteVideoBlogs(BaseModel):
    items: list[WebsiteBlogPost] = Field(default_factory=list)


class WebsiteMarqueeItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    category: str = Field(..., min_length=1, max_length=40)
    contents: str = Field(..., min_length=1, max_length=500)
    status: str = Field("Active", max_length=20)


def default_marquees() -> list[WebsiteMarqueeItem]:
    text = "Zero Convenience fee on every flight booking through UPI"
    return [
        WebsiteMarqueeItem(id="mq_1", category="Flight", contents=text),
        WebsiteMarqueeItem(id="mq_2", category="Hotel", contents=text),
        WebsiteMarqueeItem(id="mq_3", category="Holiday", contents=text),
    ]


class WebsiteMarquees(BaseModel):
    items: list[WebsiteMarqueeItem] = Field(default_factory=default_marquees)


class WebsiteDestination(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    imageUrl: str = Field("", max_length=500)
    city: str = Field(..., min_length=1, max_length=80)
    status: str = Field("Active", max_length=20)


def default_destinations() -> list[WebsiteDestination]:
    return [
        WebsiteDestination(id="dest_1", city="Andaman", imageUrl=PEXELS.format(id=457882)),
        WebsiteDestination(id="dest_2", city="Thailand", imageUrl=PEXELS.format(id=2166559)),
        WebsiteDestination(id="dest_3", city="Bali", imageUrl=PEXELS.format(id=2166553)),
        WebsiteDestination(id="dest_4", city="Dubai", imageUrl=PEXELS.format(id=325193)),
        WebsiteDestination(id="dest_5", city="Shimla", imageUrl=PEXELS.format(id=1366919)),
    ]


class WebsiteDestinations(BaseModel):
    items: list[WebsiteDestination] = Field(default_factory=default_destinations)


class WebsiteWhyItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    iconUrl: str = Field("", max_length=500)
    heading: str = Field(..., min_length=1, max_length=120)
    category: str = Field("Flight", max_length=40)
    contents: str = Field("", max_length=2000)
    status: str = Field("Active", max_length=20)


def default_why() -> list[WebsiteWhyItem]:
    return [
        WebsiteWhyItem(
            id="why_1",
            heading="Fast Booking",
            category="Flight",
            contents="Quick search, competitive prices, and a smooth booking experience from start to finish.",
        ),
        WebsiteWhyItem(
            id="why_2",
            heading="Exciting Deals",
            category="Flight",
            contents="Exclusive offers on flights across trusted airlines, domestic and international routes.",
        ),
        WebsiteWhyItem(
            id="why_3",
            heading="24/7 Support",
            category="Flight",
            contents="Get assistance anytime for travel queries. Our team is here to help you fly worry-free.",
        ),
    ]


class WebsiteWhy(BaseModel):
    items: list[WebsiteWhyItem] = Field(default_factory=default_why)


class WebsiteFaqItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    category: str = Field(..., min_length=1, max_length=40)
    question: str = Field(..., min_length=1, max_length=300)
    answer: str = Field(..., min_length=1, max_length=5000)
    status: str = Field("Active", max_length=20)


def default_faqs() -> list[WebsiteFaqItem]:
    return [
        WebsiteFaqItem(
            id="faq_f1",
            category="flight",
            question="How do I book a flight through your website?",
            answer=(
                "You can search for flights by entering your departure city, destination, travel dates, "
                "and number of passengers. Compare multiple airline options and complete your booking "
                "securely online in just a few clicks."
            ),
        ),
        WebsiteFaqItem(
            id="faq_f2",
            category="flight",
            question="Do you offer both domestic and international flight bookings?",
            answer="Yes, we offer flight bookings for both domestic and international destinations, covering major airlines and routes worldwide.",
        ),
        WebsiteFaqItem(
            id="faq_f3",
            category="flight",
            question="Will I get the cheapest airfare?",
            answer="We compare fares from multiple airlines and travel partners to provide competitive prices and the best available deals at the time of booking. Prices may vary based on demand and availability.",
        ),
        WebsiteFaqItem(
            id="faq_f4",
            category="flight",
            question="Are flight tickets refundable?",
            answer="Refundability depends on the airline's fare rules. Some tickets are fully refundable, while others may be partially refundable or non-refundable.",
        ),
        WebsiteFaqItem(
            id="faq_f5",
            category="flight",
            question="Can I reschedule or cancel my flight ticket?",
            answer="Yes, flight rescheduling or cancellation is possible as per the airline's policy. Change fees and fare differences may apply.",
        ),
        WebsiteFaqItem(
            id="faq_h1",
            category="hotel",
            question="Can I book hotels on Tripime?",
            answer="Hotel booking is coming soon. You can enquire with our team for stays bundled with flights or holiday packages.",
        ),
    ]


class WebsiteFaqs(BaseModel):
    items: list[WebsiteFaqItem] = Field(default_factory=default_faqs)


class WebsiteFlightRoute(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    fromCity: str = Field(..., min_length=1, max_length=80)
    fromCode: str = Field(..., min_length=3, max_length=8)
    toCity: str = Field(..., min_length=1, max_length=80)
    toCode: str = Field(..., min_length=3, max_length=8)
    price: float = Field(0, ge=0)
    airlineName: str = Field("", max_length=80)
    airlineLogoUrl: str = Field("", max_length=500)
    status: str = Field("Active", max_length=20)


def default_flight_routes() -> list[WebsiteFlightRoute]:
    return [
        WebsiteFlightRoute(id="rt_1", fromCity="Mumbai", fromCode="BOM", toCity="Bangkok", toCode="BKK", price=10299, airlineName="IndiGo"),
        WebsiteFlightRoute(id="rt_2", fromCity="Delhi", fromCode="DEL", toCity="New York", toCode="JFK", price=39999, airlineName="Air India"),
        WebsiteFlightRoute(id="rt_3", fromCity="Chennai", fromCode="MAA", toCity="Dubai", toCode="DXB", price=18499, airlineName="Emirates"),
        WebsiteFlightRoute(id="rt_4", fromCity="Delhi", fromCode="DEL", toCity="Mumbai", toCode="BOM", price=4299, airlineName="IndiGo"),
        WebsiteFlightRoute(id="rt_5", fromCity="Delhi", fromCode="DEL", toCity="Bangalore", toCode="BLR", price=4899, airlineName="Air India"),
        WebsiteFlightRoute(id="rt_6", fromCity="Mumbai", fromCode="BOM", toCity="Delhi", toCode="DEL", price=4499, airlineName="Vistara"),
    ]


class WebsiteFlightRoutes(BaseModel):
    items: list[WebsiteFlightRoute] = Field(default_factory=default_flight_routes)


class WebsiteAirline(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    logoUrl: str = Field("", max_length=500)
    name: str = Field(..., min_length=1, max_length=120)
    code: str = Field(..., min_length=2, max_length=8)
    status: str = Field("Active", max_length=20)


def default_airlines() -> list[WebsiteAirline]:
    logo = "https://images.kiwi.com/airlines/64/{code}.png"
    return [
        WebsiteAirline(id="al_6e", name="IndiGo", code="6E", logoUrl=logo.format(code="6E")),
        WebsiteAirline(id="al_qp", name="Akasa Air", code="QP", logoUrl=logo.format(code="QP")),
        WebsiteAirline(id="al_sg", name="SpiceJet", code="SG", logoUrl=logo.format(code="SG")),
        WebsiteAirline(id="al_ek", name="Emirates Airlines", code="EK", logoUrl=logo.format(code="EK")),
        WebsiteAirline(id="al_qr", name="Qatar Airways", code="QR", logoUrl=logo.format(code="QR")),
        WebsiteAirline(id="al_ai", name="Air India", code="AI", logoUrl=logo.format(code="AI")),
    ]


class WebsiteAirlines(BaseModel):
    items: list[WebsiteAirline] = Field(default_factory=default_airlines)


class WebsiteBusRoute(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    fromCity: str = Field(..., min_length=1, max_length=80)
    toCity: str = Field(..., min_length=1, max_length=80)
    status: str = Field("Active", max_length=20)


class WebsiteBusRoutes(BaseModel):
    items: list[WebsiteBusRoute] = Field(default_factory=list)


class WebsiteSocial(BaseModel):
    facebook: str = Field(
        "https://www.facebook.com/p/Tripime-trips-61572517748551/",
        max_length=500,
    )
    instagram: str = Field("https://www.instagram.com/tripimetrips/", max_length=500)
    linkedin: str = Field("https://www.linkedin.com/company/tripime-trips/", max_length=500)
    youtube: str = Field("", max_length=500)
    twitter: str = Field("", max_length=500)
    whatsapp: str = Field("9899644177", max_length=20)


class WebsiteCms(BaseModel):
    general: WebsiteGeneral
    website: WebsiteSetting = Field(default_factory=WebsiteSetting)
    seo: WebsiteSeo = Field(default_factory=WebsiteSeo)
    seoMore: WebsiteSeoMore = Field(default_factory=WebsiteSeoMore)
    servicePages: WebsiteServicePages = Field(default_factory=WebsiteServicePages)
    about: WebsiteAbout = Field(default_factory=WebsiteAbout)
    banners: WebsiteBanners = Field(default_factory=WebsiteBanners)
    deals: WebsiteDeals = Field(default_factory=WebsiteDeals)
    visa: WebsiteVisa = Field(default_factory=WebsiteVisa)
    testimonials: WebsiteTestimonials = Field(default_factory=WebsiteTestimonials)
    blogs: WebsiteBlogs = Field(default_factory=WebsiteBlogs)
    videoBlogs: WebsiteVideoBlogs = Field(default_factory=WebsiteVideoBlogs)
    marquees: WebsiteMarquees = Field(default_factory=WebsiteMarquees)
    destinations: WebsiteDestinations = Field(default_factory=WebsiteDestinations)
    why: WebsiteWhy = Field(default_factory=WebsiteWhy)
    faqs: WebsiteFaqs = Field(default_factory=WebsiteFaqs)
    flightRoutes: WebsiteFlightRoutes = Field(default_factory=WebsiteFlightRoutes)
    airlines: WebsiteAirlines = Field(default_factory=WebsiteAirlines)
    busRoutes: WebsiteBusRoutes = Field(default_factory=WebsiteBusRoutes)
    social: WebsiteSocial = Field(default_factory=WebsiteSocial)
    updatedAt: str = ""
