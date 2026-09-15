from pydantic import BaseModel, Field


class PackageThemeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    active: bool = True
    sortOrder: int = Field(0, ge=0)


class PackageThemeCreate(PackageThemeBase):
    pass


class PackageThemeUpdate(PackageThemeBase):
    pass


class PackageTheme(PackageThemeBase):
    id: str
    createdAt: str
