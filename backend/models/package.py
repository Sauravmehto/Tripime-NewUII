from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

PackageCategory = Literal["domestic", "international", "offer", "upcoming_event"]
PackageCatalog = Literal["itinerary", "flyshop"]


class PackageBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    tagline: str = Field("", max_length=200)
    destination: str = Field(..., min_length=1, max_length=120)
    category: PackageCategory
    catalog: PackageCatalog = "itinerary"
    themeId: str | None = None
    duration: str = Field(..., min_length=1, max_length=40)
    stays: str = Field("", max_length=80)
    guests: str = Field("2 Adults", max_length=40)
    highlights: list[str] = Field(default_factory=list)
    itinerary: list[str] = Field(default_factory=list)
    price: int = Field(..., ge=0)
    priceNote: str = Field("total package for 2 travelers", max_length=120)
    negotiable: bool = True
    imageUrl: str = Field("", max_length=500)
    pdfUrl: str = Field("", max_length=500)
    eventDate: str | None = None
    featured: bool = False
    sortOrder: int = Field(0, ge=0)
    active: bool = True

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        allowed = {"domestic", "international", "offer", "upcoming_event"}
        if value not in allowed:
            raise ValueError(f"category must be one of: {', '.join(sorted(allowed))}")
        return value

    @model_validator(mode="after")
    def validate_event_date(self) -> "PackageBase":
        if self.category == "upcoming_event" and not (self.eventDate and self.eventDate.strip()):
            raise ValueError("eventDate is required for upcoming_event packages")
        return self


class PackageCreate(PackageBase):
    pass


class PackageUpdate(PackageBase):
    pass


class Package(PackageBase):
    id: str
    createdAt: str
    updatedAt: str
