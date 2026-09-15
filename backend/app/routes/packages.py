from fastapi import APIRouter, HTTPException, Query

from app.models.package import Package
from app.services.package_service import get_package_service

router = APIRouter()


@router.get("", response_model=list[Package])
def list_packages(
    category: str | None = Query(default=None),
) -> list[Package]:
    if category is not None:
        allowed = {"domestic", "international", "offer", "upcoming_event"}
        if category not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"category must be one of: {', '.join(sorted(allowed))}",
            )
    return get_package_service().list_packages(
        category=category,
        catalog="itinerary",
        active_only=True,
    )


@router.get("/{package_id}", response_model=Package)
def get_package(package_id: str) -> Package:
    pkg = get_package_service().get_package(package_id, active_only=True)
    if pkg is None or pkg.catalog != "itinerary":
        raise HTTPException(status_code=404, detail=f"Package '{package_id}' not found.")
    return pkg
