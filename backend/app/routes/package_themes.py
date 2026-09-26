from fastapi import APIRouter

from app.models.package_theme import PackageTheme
from app.services.package_theme_service import get_package_theme_service

router = APIRouter()


@router.get("", response_model=list[PackageTheme])
def list_public_package_themes() -> list[PackageTheme]:
    return get_package_theme_service().list_themes(active_only=True)
