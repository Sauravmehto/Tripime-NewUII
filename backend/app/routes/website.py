"""Public, read-only slices of the admin-managed website content."""

from fastapi import APIRouter, Query

from app.models.website_cms import WebsitePromoItem
from app.services.website_cms_service import get_website_cms_service

router = APIRouter()


@router.get("/banners", response_model=list[WebsitePromoItem])
def list_banners(category: str | None = Query(None, max_length=40)) -> list[WebsitePromoItem]:
    """Active promotional banners (Admin → Websites → Promotional banner), optionally by category."""
    items = get_website_cms_service().get_cms().banners.items
    return [b for b in items if b.active and (category is None or b.category == category)]
