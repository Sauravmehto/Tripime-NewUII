from typing import Literal

from pydantic import BaseModel, Field


class CustomTheme(BaseModel):
    id: str
    kind: Literal["desktop", "mobile"]
    name: str = Field(..., min_length=1, max_length=80)
    previewUrl: str = Field("", max_length=500)
    active: bool = True
    selected: bool = False


class CustomThemesPayload(BaseModel):
    items: list[CustomTheme]


class MarketingBanner(BaseModel):
    id: str
    category: str = Field(..., min_length=1, max_length=40)
    title: str = Field("", max_length=160)
    subtitle: str = Field("", max_length=240)
    imageUrl: str = Field("", max_length=500)
    linkUrl: str = Field("", max_length=500)
    active: bool = True


class MarketingBannersPayload(BaseModel):
    items: list[MarketingBanner]


class MarketingVideo(BaseModel):
    id: str
    category: str = Field(..., min_length=1, max_length=40)
    title: str = Field("", max_length=160)
    thumbnailUrl: str = Field("", max_length=500)
    videoUrl: str = Field("", max_length=500)
    active: bool = True


class MarketingVideosPayload(BaseModel):
    items: list[MarketingVideo]


class CustomerLogin(BaseModel):
    id: str
    name: str = Field("", max_length=120)
    email: str = Field("", max_length=160)
    mobile: str = Field("", max_length=80)
    firstLoginAt: str = Field(..., min_length=8, max_length=40)


class FlightSearchLog(BaseModel):
    id: str
    fromCode: str = Field(..., min_length=3, max_length=8)
    fromCity: str = Field(..., min_length=1, max_length=80)
    toCode: str = Field(..., min_length=3, max_length=8)
    toCity: str = Field(..., min_length=1, max_length=80)
    ip: str = Field(..., min_length=3, max_length=64)
    searchedAt: str = Field(..., min_length=8, max_length=40)


class AdminOps(BaseModel):
    themes: list[CustomTheme] = Field(default_factory=list)
    marketingBanners: list[MarketingBanner] = Field(default_factory=list)
    marketingVideos: list[MarketingVideo] = Field(default_factory=list)
    customers: list[CustomerLogin] = Field(default_factory=list)
    flightSearches: list[FlightSearchLog] = Field(default_factory=list)
    updatedAt: str = ""
