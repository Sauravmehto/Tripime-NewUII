from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from app.models.website_cms import (
    WebsiteAbout,
    WebsiteAccount,
    WebsiteAgency,
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
    WebsiteSitemapCheckResult,
    WebsiteSocial,
    WebsiteTestimonials,
    WebsiteVideoBlogs,
    WebsiteVisa,
    WebsiteWhy,
    WebsiteAirlines,
    WebsiteBusRoutes,
)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
CMS_PATH = DATA_DIR / "website_cms.json"

DEFAULT_CMS = WebsiteCms(
    general=WebsiteGeneral(
        account=WebsiteAccount(
            firstName="Rohan",
            lastName="Kiroriwal",
            email="tripimetrips@gmail.com",
            mobileNumber="9899644177",
            displayNumber="",
            alternativePhone="",
            country="India",
            state="",
            city="",
            address=(
                "Building No-3, FFS-11, First Floor, Ansal Chambers-1, "
                "Bhikaji Cama Place, New Delhi - 110066"
            ),
            pincode="110066",
        ),
        agency=WebsiteAgency(
            domainName="tripime.com",
            agencyName="Tripime",
            whitelabelType="B2C",
            gstNumber="",
            panNumber="",
            domainSupplierName="",
        ),
    ),
    website=WebsiteSetting(),
    seo=WebsiteSeo(),
    updatedAt=datetime.now(timezone.utc).isoformat(),
)

_service: WebsiteCmsService | None = None


class WebsiteCmsService:
    def __init__(self, path: Path = CMS_PATH) -> None:
        self._path = path
        self._lock = Lock()
        self._cms = self._load()

    def _load(self) -> WebsiteCms:
        if not self._path.exists():
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._save(DEFAULT_CMS)
            return DEFAULT_CMS.model_copy(deep=True)
        raw = json.loads(self._path.read_text(encoding="utf-8-sig"))
        cms = WebsiteCms.model_validate(raw)
        missing = [
            key
            for key in (
                "website",
                "seo",
                "seoMore",
                "servicePages",
                "about",
                "banners",
                "deals",
                "visa",
                "testimonials",
                "blogs",
                "videoBlogs",
                "marquees",
                "destinations",
                "why",
                "faqs",
                "flightRoutes",
                "airlines",
                "busRoutes",
                "social",
            )
            if key not in raw
        ]
        if missing:
            self._save(cms)
        return cms

    def _save(self, cms: WebsiteCms) -> None:
        self._path.write_text(json.dumps(cms.model_dump(), indent=2), encoding="utf-8")

    def get_cms(self) -> WebsiteCms:
        return self._cms.model_copy(deep=True)

    def update_general(self, payload: WebsiteGeneral) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            current.general = payload
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def update_website(self, payload: WebsiteSetting) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            current.website = payload
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def update_seo(self, payload: WebsiteSeo) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            current.seo = payload
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def update_seo_more(self, payload: WebsiteSeoMore) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            current.seoMore = payload
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def update_service_pages(self, payload: WebsiteServicePages) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            current.servicePages = payload
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def update_about(self, payload: WebsiteAbout) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            current.about = payload
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def update_banners(self, payload: WebsiteBanners) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            current.banners = payload
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def update_deals(self, payload: WebsiteDeals) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            current.deals = payload
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def update_visa(self, payload: WebsiteVisa) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            current.visa = payload
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def update_testimonials(self, payload: WebsiteTestimonials) -> WebsiteCms:
        return self._set("testimonials", payload)

    def update_blogs(self, payload: WebsiteBlogs) -> WebsiteCms:
        return self._set("blogs", payload)

    def update_video_blogs(self, payload: WebsiteVideoBlogs) -> WebsiteCms:
        return self._set("videoBlogs", payload)

    def update_marquees(self, payload: WebsiteMarquees) -> WebsiteCms:
        return self._set("marquees", payload)

    def update_destinations(self, payload: WebsiteDestinations) -> WebsiteCms:
        return self._set("destinations", payload)

    def update_why(self, payload: WebsiteWhy) -> WebsiteCms:
        return self._set("why", payload)

    def update_faqs(self, payload: WebsiteFaqs) -> WebsiteCms:
        return self._set("faqs", payload)

    def update_flight_routes(self, payload: WebsiteFlightRoutes) -> WebsiteCms:
        return self._set("flightRoutes", payload)

    def update_airlines(self, payload: WebsiteAirlines) -> WebsiteCms:
        return self._set("airlines", payload)

    def update_bus_routes(self, payload: WebsiteBusRoutes) -> WebsiteCms:
        return self._set("busRoutes", payload)

    def update_social(self, payload: WebsiteSocial) -> WebsiteCms:
        return self._set("social", payload)

    def _set(self, field: str, payload: object) -> WebsiteCms:
        with self._lock:
            current = self._cms.model_copy(deep=True)
            setattr(current, field, payload)
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._cms = current
            self._save(current)
        return self.get_cms()

    def check_sitemap(self, url: str) -> WebsiteSitemapCheckResult:
        return _check_sitemap_url(url.strip())


def _check_sitemap_url(url: str) -> WebsiteSitemapCheckResult:
    import ipaddress
    import socket
    import urllib.error
    import urllib.request
    from urllib.parse import urlparse

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return WebsiteSitemapCheckResult(ok=False, message="Sitemap URL must start with http:// or https://")

    host = parsed.hostname.lower()
    if host in {"localhost", "metadata.google.internal"} or host.endswith(".local"):
        return WebsiteSitemapCheckResult(ok=False, message="That host cannot be checked from the admin API.")

    try:
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if not ip.is_global:
                return WebsiteSitemapCheckResult(
                    ok=False,
                    message="That host cannot be checked from the admin API.",
                )
    except OSError:
        return WebsiteSitemapCheckResult(ok=False, message="Could not resolve the sitemap host.")

    request = urllib.request.Request(
        url,
        method="GET",
        headers={"User-Agent": "TripimeAdminSitemapCheck/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            status = int(getattr(response, "status", 200))
            content_type = str(response.headers.get("Content-Type", ""))
            snippet = response.read(800).decode("utf-8", errors="replace").lstrip()
    except urllib.error.HTTPError as err:
        return WebsiteSitemapCheckResult(
            ok=False,
            statusCode=int(err.code),
            message=f"Sitemap returned HTTP {err.code}.",
        )
    except urllib.error.URLError as err:
        return WebsiteSitemapCheckResult(ok=False, message=f"Could not reach sitemap: {err.reason}")
    except TimeoutError:
        return WebsiteSitemapCheckResult(ok=False, message="Sitemap check timed out.")

    looks_xml = "xml" in content_type.lower() or snippet.startswith("<?xml") or "<urlset" in snippet.lower() or "<sitemapindex" in snippet.lower()
    if status >= 400:
        return WebsiteSitemapCheckResult(
            ok=False,
            statusCode=status,
            contentType=content_type,
            message=f"Sitemap returned HTTP {status}.",
        )
    if not looks_xml:
        return WebsiteSitemapCheckResult(
            ok=False,
            statusCode=status,
            contentType=content_type,
            message="URL responded, but the body does not look like a sitemap XML file.",
        )
    return WebsiteSitemapCheckResult(
        ok=True,
        statusCode=status,
        contentType=content_type,
        message="Sitemap is reachable and looks like XML.",
    )


def get_website_cms_service() -> WebsiteCmsService:
    global _service
    if _service is None:
        _service = WebsiteCmsService()
    return _service
