"""Centralised customer inquiries (the Tripime inquiry CRM).

An inquiry is a customer asking about a package or a trip. It is NOT a booking: marking an inquiry
"converted" never creates or confirms a booking by itself (see models/booking.py for bookings)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

InquirySource = Literal["whatsapp", "package_booking", "brochure_request", "contact_form", "custom_trip"]
InquiryType = Literal[
    "package_inquiry", "booking_request", "brochure_request", "general_contact", "custom_trip", "service_request"
]
InquiryStatus = Literal[
    "new", "contacted", "follow_up_required", "quote_shared", "converted", "not_interested", "cancelled"
]
InquiryPriority = Literal["low", "normal", "high"]
ActivityAction = Literal[
    "created",
    "status_changed",
    "assigned",
    "priority_changed",
    "note_added",
    "follow_up_scheduled",
    "quote_shared",
    "converted",
    "booking_linked",
    "whatsapp_clicked",
    "whatsapp_message_received",
    "legacy_imported",
]

# Statuses that mean the inquiry is finished (no follow-up expected).
CLOSED_STATUSES: tuple[str, ...] = ("converted", "not_interested", "cancelled")
OPEN_STATUSES: tuple[str, ...] = ("new", "contacted", "follow_up_required", "quote_shared")


# ---- customer-facing ---------------------------------------------------------------------------------------------

class CustomerInquiryCreate(BaseModel):
    """Only the package and where the click came from are sent by the browser. Everything else is set server-side."""

    model_config = ConfigDict(extra="forbid")

    package_id: str = Field(..., min_length=1, max_length=100)
    inquiry_source: Literal["whatsapp", "brochure_request"] = "whatsapp"


class CustomerInquiry(BaseModel):
    """What a customer may see about their own inquiry (no internal notes, assignee or contact data of others)."""

    id: str
    package_id: str | None
    package_name: str
    destination: str
    package_price: int | None
    price_note: str = ""
    image_url: str = ""
    package_url: str | None
    inquiry_source: InquirySource
    inquiry_type: InquiryType
    inquiry_status: InquiryStatus
    created_at: str
    updated_at: str
    # "confirmed" only when a linked booking has really been confirmed; an inquiry alone is never a booking.
    booking_confirmation: Literal["not_confirmed", "confirmed"] = "not_confirmed"
    whatsapp_message: str = ""


class CustomerInquiryResult(BaseModel):
    inquiry: CustomerInquiry
    # False when a very recent identical inquiry was returned instead of saving a duplicate.
    created: bool


# ---- admin -------------------------------------------------------------------------------------------------------

class Inquiry(BaseModel):
    inquiry_id: str
    user_id: str | None = None
    customer_name: str = ""
    customer_email: str = ""
    customer_phone: str = ""
    is_registered: bool = False
    package_id: str | None = None
    package_name: str = ""
    destination: str = ""
    package_price: int | None = None
    package_url: str | None = None
    inquiry_source: InquirySource
    inquiry_type: InquiryType
    inquiry_message: str = ""
    inquiry_status: InquiryStatus = "new"
    assigned_to: str = ""
    priority: InquiryPriority = "normal"
    admin_notes: str = ""
    follow_up_date: str | None = None
    whatsapp_clicked_at: str | None = None
    converted_booking_id: str | None = None
    created_at: str
    updated_at: str


class InquiryActivity(BaseModel):
    activity_id: int
    inquiry_id: str
    action: ActivityAction
    actor_type: Literal["customer", "admin", "system", "whatsapp"]
    actor: str = ""
    detail: str = ""
    old_value: str = ""
    new_value: str = ""
    created_at: str


class WhatsAppMessage(BaseModel):
    message_id: str
    inquiry_id: str | None = None
    sender_phone: str
    sender_name: str = ""
    body: str = ""
    message_type: str = "text"
    message_timestamp: str
    received_at: str


class InquiryDetail(BaseModel):
    inquiry: Inquiry
    activities: list[InquiryActivity]
    whatsapp_messages: list[WhatsAppMessage]


class InquiryPage(BaseModel):
    items: list[Inquiry]
    total: int
    page: int
    page_size: int


class InquiryStats(BaseModel):
    total: int = 0
    new: int = 0
    pending_follow_ups: int = 0
    contacted: int = 0
    quote_shared: int = 0
    converted: int = 0
    not_interested: int = 0
    cancelled: int = 0


class InquiryUpdate(BaseModel):
    """Fields an admin may change. Anything not sent is left alone."""

    model_config = ConfigDict(extra="forbid")

    inquiry_status: InquiryStatus | None = None
    assigned_to: str | None = Field(None, max_length=80)
    priority: InquiryPriority | None = None
    # ISO date (YYYY-MM-DD); an empty string clears it.
    follow_up_date: str | None = Field(None, max_length=10)
    # Reference of an existing booking this inquiry turned into; an empty string clears it.
    converted_booking_id: str | None = Field(None, max_length=60)


class InquiryNoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: str = Field(..., min_length=1, max_length=2000)


class TeamMembers(BaseModel):
    members: list[str]
