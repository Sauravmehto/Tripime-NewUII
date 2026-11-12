"""Admin inquiry CRM. Every route needs an admin session (and the CSRF header for writes)."""

from typing import Literal

from fastapi import APIRouter, Depends, Query

from app import config
from app.models.inquiry import (
    Inquiry,
    InquiryDetail,
    InquiryNoteCreate,
    InquiryPage,
    InquiryPriority,
    InquirySource,
    InquiryStats,
    InquiryStatus,
    InquiryUpdate,
    TeamMembers,
)
from app.services.admin_auth import require_admin
from app.services.inquiry_service import get_inquiry_service

router = APIRouter(dependencies=[Depends(require_admin)])


def _admin_name() -> str:
    # There is a single admin login; its username is the identity recorded in the audit trail.
    return config.ADMIN_USERNAME or "admin"


@router.get("", response_model=InquiryPage)
def list_inquiries(
    search: str = Query("", max_length=120),
    status: InquiryStatus | None = None,
    source: InquirySource | None = None,
    assigned_to: str | None = Query(None, max_length=80),
    priority: InquiryPriority | None = None,
    date_from: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    date_to: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    sort: Literal[
        "created_at", "updated_at", "customer_name", "package_name", "inquiry_status", "priority", "assigned_to"
    ] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1, le=100000),
    page_size: int = Query(25, ge=1, le=100),
) -> InquiryPage:
    return get_inquiry_service().admin_list(
        search=search, status=status, source=source, assigned_to=assigned_to, priority=priority,
        date_from=date_from, date_to=date_to, sort=sort, order=order, page=page, page_size=page_size,
    )


@router.get("/stats", response_model=InquiryStats)
def inquiry_stats() -> InquiryStats:
    return get_inquiry_service().stats()


@router.get("/team", response_model=TeamMembers)
def team_members() -> TeamMembers:
    return TeamMembers(members=get_inquiry_service().team_members())


@router.get("/{inquiry_id}", response_model=InquiryDetail)
def inquiry_detail(inquiry_id: str) -> InquiryDetail:
    return get_inquiry_service().get_detail(inquiry_id)


@router.patch("/{inquiry_id}", response_model=Inquiry)
def update_inquiry(inquiry_id: str, payload: InquiryUpdate) -> Inquiry:
    return get_inquiry_service().update(inquiry_id, payload, _admin_name())


@router.post("/{inquiry_id}/notes", response_model=Inquiry, status_code=201)
def add_inquiry_note(inquiry_id: str, payload: InquiryNoteCreate) -> Inquiry:
    return get_inquiry_service().add_note(inquiry_id, payload.note, _admin_name())
