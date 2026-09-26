from typing import Literal

from pydantic import BaseModel, EmailStr, Field

EnquiryStatus = Literal["NEW", "CONTACTED", "CLOSED"]
EnquirySource = Literal["package", "group", "itinerary", "contact", "service"]
ServiceType = Literal["visa", "hotel", "bus", "other"]


class EnquiryCreateRequest(BaseModel):
    source: EnquirySource = "package"
    serviceType: ServiceType | None = None
    packageId: str | None = None
    packageTitle: str | None = None
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=6, max_length=20)
    travelMonth: str = Field("", max_length=40)
    travelers: int = Field(2, ge=1, le=20)
    message: str = Field("", max_length=1000)


class Enquiry(EnquiryCreateRequest):
    id: str
    status: EnquiryStatus = "NEW"
    createdAt: str


class EnquiryStatusUpdate(BaseModel):
    status: EnquiryStatus


class EnquirySourceCounts(BaseModel):
    package: int = 0
    group: int = 0
    itinerary: int = 0
    contact: int = 0
    service: int = 0


class EnquiryStats(BaseModel):
    today: EnquirySourceCounts
    total: EnquirySourceCounts
