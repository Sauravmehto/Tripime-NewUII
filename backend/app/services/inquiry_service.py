"""The inquiry CRM: capture from every entry point, admin management, audit trail, WhatsApp message linking."""

from __future__ import annotations

import json
import logging
import re
import secrets
import sqlite3
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException

from app import config
from app.models.enquiry import Enquiry
from app.models.inquiry import (
    CLOSED_STATUSES,
    OPEN_STATUSES,
    CustomerInquiry,
    CustomerInquiryCreate,
    CustomerInquiryResult,
    Inquiry,
    InquiryActivity,
    InquiryDetail,
    InquiryPage,
    InquiryStats,
    InquiryUpdate,
    WhatsAppMessage,
)
from app.paths import DATA_DIR
from app.services.customer_auth_service import CustomerSession
from app.storage.inquiry_db import migrate, session as db_session

log = logging.getLogger("tripime.inquiries")

# A repeat of the same inquiry inside these windows (double click, retry, refresh) returns the saved one.
CUSTOMER_DUPLICATE_WINDOW = timedelta(minutes=10)
FORM_DUPLICATE_WINDOW = timedelta(minutes=2)

SORT_COLUMNS = {
    "created_at": "created_at",
    "updated_at": "updated_at",
    "customer_name": "customer_name COLLATE NOCASE",
    "package_name": "package_name COLLATE NOCASE",
    "inquiry_status": "inquiry_status",
    "priority": "CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END",
    "assigned_to": "assigned_to COLLATE NOCASE",
}

# Existing enquiry form sources -> (inquiry source, inquiry type)
ENQUIRY_MAP = {
    "package": ("package_booking", "booking_request"),
    "group": ("custom_trip", "custom_trip"),
    "itinerary": ("custom_trip", "custom_trip"),
    "contact": ("contact_form", "general_contact"),
    "service": ("contact_form", "service_request"),
}
LEGACY_STATUS = {"NEW": "new", "CONTACTED": "contacted", "CLOSED": "cancelled"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _stamp(value: datetime | None = None) -> str:
    return (value or _now()).isoformat()


def digits(phone: str) -> str:
    return re.sub(r"\D", "", phone or "")


def whatsapp_message_for(package_name: str) -> str:
    return f'Hi Tripime, I\'m interested in the "{package_name}" package.'


def brochure_message_for(package_name: str) -> str:
    return f'Hi Tripime, please share the brochure for the "{package_name}" package.'


class InquiryService:
    def __init__(self, path: Path | None = None) -> None:
        explicit = path is not None
        if explicit:
            self._path = Path(path)
        elif config.INQUIRY_DB_PATH:
            self._path = Path(config.INQUIRY_DB_PATH)
        else:
            self._path = DATA_DIR / "inquiries.db"
        migrate(self._path)
        # The live service brings in enquiries saved before the CRM existed. A service built on an explicit
        # path (tests, tools) is left empty until asked.
        if not explicit:
            self.backfill_legacy_enquiries(DATA_DIR / "enquiries.json")
            self.import_first_version_inquiries(DATA_DIR / "package_inquiries.json")

    # ---- lookups that live in other services (imported lazily so tests can patch them) ----------------------------

    @staticmethod
    def _package(package_id: str | None, *, active_only: bool = False):
        from app.services.package_service import get_package_service

        if not package_id:
            return None
        return get_package_service().get_package(package_id.strip(), active_only=active_only)

    @staticmethod
    def _customer_record(customer_id: str):
        try:
            from app.services.admin_ops_service import get_admin_ops_service

            return get_admin_ops_service().find_customer_by_id(customer_id)
        except Exception:  # a missing profile must never block an inquiry
            return None

    @staticmethod
    def _account_name(customer_id: str) -> str:
        """The name the customer gave when they registered (the account record is the authority for it)."""
        try:
            from app.services.customer_account_service import get_customer_account_service

            account = get_customer_account_service().find_by_id(customer_id)
            return (account.name if account else "") or ""
        except Exception:
            return ""

    @staticmethod
    def _booking(booking_id: str):
        from app.services.booking_service import get_booking_service

        return get_booking_service().get_booking(booking_id)

    # ---- row mapping ----------------------------------------------------------------------------------------------

    @staticmethod
    def _inquiry(row: sqlite3.Row) -> Inquiry:
        return Inquiry(
            inquiry_id=row["inquiry_id"],
            user_id=row["user_id"],
            customer_name=row["customer_name"],
            customer_email=row["customer_email"],
            customer_phone=row["customer_phone"],
            is_registered=row["user_id"] is not None,
            package_id=row["package_id"],
            package_name=row["package_name"],
            destination=row["destination"],
            package_price=row["package_price"],
            package_url=f"/packages/{row['package_id']}" if row["package_id"] else None,
            inquiry_source=row["inquiry_source"],
            inquiry_type=row["inquiry_type"],
            inquiry_message=row["inquiry_message"],
            inquiry_status=row["inquiry_status"],
            assigned_to=row["assigned_to"],
            priority=row["priority"],
            admin_notes=row["admin_notes"],
            follow_up_date=row["follow_up_date"],
            whatsapp_clicked_at=row["whatsapp_clicked_at"],
            converted_booking_id=row["converted_booking_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _customer_view(self, inquiry: Inquiry) -> CustomerInquiry:
        pkg = self._package(inquiry.package_id)
        confirmed = False
        if inquiry.converted_booking_id:
            booking = self._booking(inquiry.converted_booking_id)
            confirmed = bool(booking and booking.state in ("BOOKING_CONFIRMED", "TICKET_ISSUED"))
        return CustomerInquiry(
            id=inquiry.inquiry_id,
            package_id=inquiry.package_id,
            package_name=inquiry.package_name,
            destination=inquiry.destination,
            package_price=inquiry.package_price,
            price_note=pkg.priceNote if pkg else "",
            image_url=pkg.imageUrl if pkg else "",
            package_url=inquiry.package_url,
            inquiry_source=inquiry.inquiry_source,
            inquiry_type=inquiry.inquiry_type,
            inquiry_status=inquiry.inquiry_status,
            created_at=inquiry.created_at,
            updated_at=inquiry.updated_at,
            booking_confirmation="confirmed" if confirmed else "not_confirmed",
            whatsapp_message=inquiry.inquiry_message if inquiry.inquiry_source in ("whatsapp", "brochure_request") else "",
        )

    @staticmethod
    def _log(
        conn: sqlite3.Connection,
        inquiry_id: str,
        action: str,
        actor_type: str,
        actor: str = "",
        detail: str = "",
        old: str = "",
        new: str = "",
        at: str | None = None,
    ) -> None:
        conn.execute(
            "INSERT INTO inquiry_activity (inquiry_id, action, actor_type, actor, detail, old_value, new_value, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (inquiry_id, action, actor_type, actor, detail[:2000], old, new, at or _stamp()),
        )

    @staticmethod
    def _new_id(conn: sqlite3.Connection) -> str:
        while True:
            candidate = f"INQ-{_now():%Y%m%d}-{secrets.token_hex(3).upper()}"
            if conn.execute("SELECT 1 FROM inquiries WHERE inquiry_id = ?", (candidate,)).fetchone() is None:
                return candidate

    # ---- capture --------------------------------------------------------------------------------------------------

    def create_for_customer(self, payload: CustomerInquiryCreate, session: CustomerSession) -> CustomerInquiryResult:
        """A signed-in customer's WhatsApp click or brochure request. Package facts come from our records only."""
        pkg = self._package(payload.package_id, active_only=True)
        if pkg is None:
            raise HTTPException(status_code=404, detail="That package is no longer available.")
        profile = self._customer_record(session.customer_id)
        name = self._account_name(session.customer_id) or (profile.name if profile else "") or ""
        phone = (profile.mobile if profile else "") or ""
        is_whatsapp = payload.inquiry_source == "whatsapp"
        message = whatsapp_message_for(pkg.title) if is_whatsapp else brochure_message_for(pkg.title)
        inquiry_type = "package_inquiry" if is_whatsapp else "brochure_request"
        now = _now()

        with db_session(self._path, write=True) as conn:
            cutoff = _stamp(now - CUSTOMER_DUPLICATE_WINDOW)
            row = conn.execute(
                "SELECT * FROM inquiries WHERE user_id = ? AND package_id = ? AND inquiry_source = ? AND created_at >= ?"
                " ORDER BY created_at DESC LIMIT 1",
                (session.customer_id, pkg.id, payload.inquiry_source, cutoff),
            ).fetchone()
            if row is not None:
                return CustomerInquiryResult(inquiry=self._customer_view(self._inquiry(row)), created=False)

            inquiry_id = self._new_id(conn)
            stamp = _stamp(now)
            conn.execute(
                "INSERT INTO inquiries (inquiry_id, user_id, customer_name, customer_email, customer_phone, package_id,"
                " package_name, destination, package_price, inquiry_source, inquiry_type, inquiry_message,"
                " inquiry_status, whatsapp_clicked_at, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)",
                (
                    inquiry_id, session.customer_id, name, session.email, phone, pkg.id, pkg.title, pkg.destination,
                    pkg.price, payload.inquiry_source, inquiry_type, message,
                    stamp if is_whatsapp else None, stamp, stamp,
                ),
            )
            self._log(conn, inquiry_id, "created", "customer", session.email, f"Source: {payload.inquiry_source}", at=stamp)
            if is_whatsapp:
                # The click is recorded; nothing here says the WhatsApp message was actually sent.
                self._log(conn, inquiry_id, "whatsapp_clicked", "customer", session.email, "Opened WhatsApp", at=stamp)
            row = conn.execute("SELECT * FROM inquiries WHERE inquiry_id = ?", (inquiry_id,)).fetchone()
        return CustomerInquiryResult(inquiry=self._customer_view(self._inquiry(row)), created=True)

    def create_from_enquiry(self, enquiry: Enquiry, session: CustomerSession | None) -> Inquiry:
        """Mirror a website form submission (Book now, contact, group, itinerary, service) into the central inquiry list."""
        source, inquiry_type = ENQUIRY_MAP[enquiry.source]
        pkg = self._package(enquiry.packageId)
        parts = [enquiry.message.strip()]
        details = []
        if enquiry.travelMonth:
            details.append(f"Travel month: {enquiry.travelMonth}")
        if enquiry.travelers:
            details.append(f"Travellers: {enquiry.travelers}")
        if enquiry.serviceType:
            details.append(f"Service: {enquiry.serviceType}")
        if details:
            parts.append(" · ".join(details))
        message = "\n".join(p for p in parts if p)
        email = enquiry.email.strip().lower()
        now = _now()

        with db_session(self._path, write=True) as conn:
            cutoff = _stamp(now - FORM_DUPLICATE_WINDOW)
            row = conn.execute(
                "SELECT * FROM inquiries WHERE customer_email = ? AND COALESCE(package_id,'') = ? AND inquiry_source = ?"
                " AND inquiry_type = ? AND inquiry_message = ? AND created_at >= ? LIMIT 1",
                (email, pkg.id if pkg else (enquiry.packageId or ""), source, inquiry_type, message, cutoff),
            ).fetchone()
            if row is not None:
                return self._inquiry(row)
            inquiry_id = self._new_id(conn)
            stamp = _stamp(now)
            conn.execute(
                "INSERT INTO inquiries (inquiry_id, user_id, customer_name, customer_email, customer_phone, package_id,"
                " package_name, destination, package_price, inquiry_source, inquiry_type, inquiry_message,"
                " inquiry_status, legacy_enquiry_id, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)",
                (
                    inquiry_id, session.customer_id if session else None, enquiry.name.strip(), email, enquiry.phone.strip(),
                    pkg.id if pkg else None, pkg.title if pkg else (enquiry.packageTitle or ""),
                    pkg.destination if pkg else "", pkg.price if pkg else None, source, inquiry_type, message,
                    enquiry.id, stamp, stamp,
                ),
            )
            self._log(
                conn, inquiry_id, "created", "customer", email,
                f"Source: {source}" + ("" if session else " (guest)"), at=stamp,
            )
            row = conn.execute("SELECT * FROM inquiries WHERE inquiry_id = ?", (inquiry_id,)).fetchone()
        return self._inquiry(row)

    def backfill_legacy_enquiries(self, enquiries_path: Path) -> int:
        """Bring enquiries saved before the CRM existed into it (once each; safe to run on every start)."""
        if not enquiries_path.exists():
            return 0
        try:
            rows = json.loads(enquiries_path.read_text(encoding="utf-8-sig") or "[]")
        except (OSError, ValueError):
            log.warning("Could not read %s for the inquiry backfill", enquiries_path)
            return 0
        imported = 0
        with db_session(self._path, write=True) as conn:
            for item in rows:
                try:
                    enquiry = Enquiry.model_validate(item)
                except Exception:
                    continue
                if conn.execute("SELECT 1 FROM inquiries WHERE legacy_enquiry_id = ?", (enquiry.id,)).fetchone():
                    continue
                source, inquiry_type = ENQUIRY_MAP[enquiry.source]
                pkg = self._package(enquiry.packageId)
                inquiry_id = self._new_id(conn)
                stamp = enquiry.createdAt or _stamp()
                conn.execute(
                    "INSERT INTO inquiries (inquiry_id, customer_name, customer_email, customer_phone, package_id,"
                    " package_name, destination, package_price, inquiry_source, inquiry_type, inquiry_message,"
                    " inquiry_status, legacy_enquiry_id, created_at, updated_at)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        inquiry_id, enquiry.name, enquiry.email.lower(), enquiry.phone, pkg.id if pkg else None,
                        pkg.title if pkg else (enquiry.packageTitle or ""), pkg.destination if pkg else "",
                        pkg.price if pkg else None, source, inquiry_type, enquiry.message,
                        LEGACY_STATUS.get(enquiry.status, "new"), enquiry.id, stamp, stamp,
                    ),
                )
                self._log(conn, inquiry_id, "legacy_imported", "system", "", f"Imported from enquiry {enquiry.id}", at=stamp)
                imported += 1
        return imported

    def import_first_version_inquiries(self, path: Path) -> int:
        """Bring in WhatsApp inquiries saved by the first version of this feature (a JSON file), keeping their ids."""
        if not path.exists():
            return 0
        try:
            rows = json.loads(path.read_text(encoding="utf-8-sig") or "[]")
        except (OSError, ValueError):
            log.warning("Could not read %s for the inquiry import", path)
            return 0
        imported = 0
        with db_session(self._path, write=True) as conn:
            for row in rows:
                try:
                    inquiry_id, created = str(row["id"]), str(row["created_at"])
                    if conn.execute("SELECT 1 FROM inquiries WHERE inquiry_id = ?", (inquiry_id,)).fetchone():
                        continue
                    email = str(row.get("user_email", "")).lower()
                    conn.execute(
                        "INSERT INTO inquiries (inquiry_id, user_id, customer_name, customer_email, package_id, package_name,"
                        " destination, package_price, inquiry_source, inquiry_type, inquiry_message, inquiry_status,"
                        " whatsapp_clicked_at, created_at, updated_at)"
                        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'whatsapp', 'package_inquiry', ?, 'new', ?, ?, ?)",
                        (
                            inquiry_id, row.get("user_id"), self._account_name(str(row.get("user_id", ""))), email,
                            row.get("package_id"), row.get("package_name", ""), row.get("destination", ""),
                            row.get("package_price"), row.get("whatsapp_message", ""), created, created, created,
                        ),
                    )
                    self._log(conn, inquiry_id, "created", "customer", email, "Source: whatsapp (first version)", at=created)
                    self._log(conn, inquiry_id, "whatsapp_clicked", "customer", email, "Opened WhatsApp", at=created)
                    imported += 1
                except (KeyError, TypeError, ValueError):
                    continue
        return imported

    # ---- customer reads -------------------------------------------------------------------------------------------

    def list_for_customer(self, session: CustomerSession) -> list[CustomerInquiry]:
        with db_session(self._path) as conn:
            rows = conn.execute(
                "SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC", (session.customer_id,)
            ).fetchall()
        return [self._customer_view(self._inquiry(r)) for r in rows]

    # ---- admin ----------------------------------------------------------------------------------------------------

    def admin_list(
        self,
        *,
        search: str = "",
        status: str | None = None,
        source: str | None = None,
        assigned_to: str | None = None,
        priority: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        sort: str = "created_at",
        order: str = "desc",
        page: int = 1,
        page_size: int = 25,
    ) -> InquiryPage:
        where, params = [], []
        if search.strip():
            like = f"%{search.strip().lower()}%"
            where.append(
                "(LOWER(customer_name) LIKE ? OR LOWER(customer_email) LIKE ? OR customer_phone LIKE ?"
                " OR LOWER(package_name) LIKE ? OR LOWER(destination) LIKE ? OR LOWER(inquiry_id) LIKE ?"
                " OR LOWER(inquiry_message) LIKE ?)"
            )
            params += [like, like, f"%{search.strip()}%", like, like, like, like]
        for column, value in (
            ("inquiry_status", status), ("inquiry_source", source), ("priority", priority),
        ):
            if value:
                where.append(f"{column} = ?")
                params.append(value)
        if assigned_to:
            if assigned_to == "__unassigned__":
                where.append("assigned_to = ''")
            else:
                where.append("assigned_to = ?")
                params.append(assigned_to)
        if date_from:
            where.append("substr(created_at, 1, 10) >= ?")
            params.append(date_from)
        if date_to:
            where.append("substr(created_at, 1, 10) <= ?")
            params.append(date_to)
        clause = f"WHERE {' AND '.join(where)}" if where else ""
        order_sql = SORT_COLUMNS.get(sort, SORT_COLUMNS["created_at"]) + (" ASC" if order == "asc" else " DESC")
        offset = (page - 1) * page_size
        with db_session(self._path) as conn:
            total = conn.execute(f"SELECT COUNT(*) AS n FROM inquiries {clause}", params).fetchone()["n"]
            rows = conn.execute(
                f"SELECT * FROM inquiries {clause} ORDER BY {order_sql}, created_at DESC LIMIT ? OFFSET ?",
                [*params, page_size, offset],
            ).fetchall()
        return InquiryPage(items=[self._inquiry(r) for r in rows], total=total, page=page, page_size=page_size)

    def stats(self) -> InquiryStats:
        today = date.today().isoformat()
        open_list = ",".join(f"'{s}'" for s in OPEN_STATUSES)
        with db_session(self._path) as conn:
            counts = {r["inquiry_status"]: r["n"] for r in conn.execute(
                "SELECT inquiry_status, COUNT(*) AS n FROM inquiries GROUP BY inquiry_status")}
            pending = conn.execute(
                "SELECT COUNT(*) AS n FROM inquiries WHERE inquiry_status = 'follow_up_required'"
                f" OR (follow_up_date IS NOT NULL AND follow_up_date <= ? AND inquiry_status IN ({open_list}))",
                (today,),
            ).fetchone()["n"]
        return InquiryStats(
            total=sum(counts.values()),
            new=counts.get("new", 0),
            pending_follow_ups=pending,
            contacted=counts.get("contacted", 0),
            quote_shared=counts.get("quote_shared", 0),
            converted=counts.get("converted", 0),
            not_interested=counts.get("not_interested", 0),
            cancelled=counts.get("cancelled", 0),
        )

    def get_detail(self, inquiry_id: str) -> InquiryDetail:
        with db_session(self._path) as conn:
            row = conn.execute("SELECT * FROM inquiries WHERE inquiry_id = ?", (inquiry_id,)).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Inquiry not found.")
            activities = conn.execute(
                "SELECT * FROM inquiry_activity WHERE inquiry_id = ? ORDER BY activity_id DESC", (inquiry_id,)
            ).fetchall()
            messages = conn.execute(
                "SELECT * FROM whatsapp_messages WHERE inquiry_id = ? ORDER BY message_timestamp DESC", (inquiry_id,)
            ).fetchall()
        return InquiryDetail(
            inquiry=self._inquiry(row),
            activities=[InquiryActivity(**{k: a[k] for k in a.keys()}) for a in activities],
            whatsapp_messages=[
                WhatsAppMessage(**{k: m[k] for k in m.keys() if k != "matched_user_id"}) for m in messages
            ],
        )

    def update(self, inquiry_id: str, changes: InquiryUpdate, admin: str) -> Inquiry:
        data = changes.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(status_code=422, detail="Nothing to update.")
        with db_session(self._path, write=True) as conn:
            row = conn.execute("SELECT * FROM inquiries WHERE inquiry_id = ?", (inquiry_id,)).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Inquiry not found.")
            sets: dict[str, object] = {}
            stamp = _stamp()

            new_status = data.get("inquiry_status")
            if new_status is not None and new_status != row["inquiry_status"]:
                sets["inquiry_status"] = new_status
                self._log(conn, inquiry_id, "status_changed", "admin", admin, "", row["inquiry_status"], new_status, stamp)
                if new_status == "quote_shared":
                    self._log(conn, inquiry_id, "quote_shared", "admin", admin, "Quote shared with the customer", at=stamp)
                if new_status == "converted":
                    # Converting an inquiry records the outcome only. A booking is confirmed by the booking workflow.
                    self._log(conn, inquiry_id, "converted", "admin", admin, "Marked as converted", at=stamp)

            if "assigned_to" in data and data["assigned_to"] is not None:
                value = data["assigned_to"].strip()
                if value != row["assigned_to"]:
                    sets["assigned_to"] = value
                    self._log(conn, inquiry_id, "assigned", "admin", admin, "", row["assigned_to"], value, stamp)

            if data.get("priority") is not None and data["priority"] != row["priority"]:
                sets["priority"] = data["priority"]
                self._log(conn, inquiry_id, "priority_changed", "admin", admin, "", row["priority"], data["priority"], stamp)

            if "follow_up_date" in data and data["follow_up_date"] is not None:
                value = data["follow_up_date"].strip()
                if value:
                    try:
                        date.fromisoformat(value)
                    except ValueError:
                        raise HTTPException(status_code=422, detail="Follow-up date must be a real date (YYYY-MM-DD).")
                if (value or None) != row["follow_up_date"]:
                    sets["follow_up_date"] = value or None
                    self._log(
                        conn, inquiry_id, "follow_up_scheduled", "admin", admin,
                        "Follow-up cleared" if not value else "", row["follow_up_date"] or "", value, stamp,
                    )

            if "converted_booking_id" in data and data["converted_booking_id"] is not None:
                value = data["converted_booking_id"].strip()
                if value and self._booking(value) is None:
                    raise HTTPException(status_code=404, detail=f"Booking '{value}' was not found.")
                if (value or None) != row["converted_booking_id"]:
                    sets["converted_booking_id"] = value or None
                    self._log(conn, inquiry_id, "booking_linked", "admin", admin, "", row["converted_booking_id"] or "", value, stamp)

            if sets:
                sets["updated_at"] = stamp
                assignments = ", ".join(f"{column} = ?" for column in sets)
                conn.execute(f"UPDATE inquiries SET {assignments} WHERE inquiry_id = ?", [*sets.values(), inquiry_id])
            row = conn.execute("SELECT * FROM inquiries WHERE inquiry_id = ?", (inquiry_id,)).fetchone()
        return self._inquiry(row)

    def add_note(self, inquiry_id: str, note: str, admin: str) -> Inquiry:
        text = note.strip()
        if not text:
            raise HTTPException(status_code=422, detail="Write a note first.")
        with db_session(self._path, write=True) as conn:
            if conn.execute("SELECT 1 FROM inquiries WHERE inquiry_id = ?", (inquiry_id,)).fetchone() is None:
                raise HTTPException(status_code=404, detail="Inquiry not found.")
            stamp = _stamp()
            self._log(conn, inquiry_id, "note_added", "admin", admin, text, at=stamp)
            conn.execute(
                "UPDATE inquiries SET admin_notes = ?, updated_at = ? WHERE inquiry_id = ?", (text, stamp, inquiry_id)
            )
            row = conn.execute("SELECT * FROM inquiries WHERE inquiry_id = ?", (inquiry_id,)).fetchone()
        return self._inquiry(row)

    def team_members(self) -> list[str]:
        members = list(config.INQUIRY_TEAM_MEMBERS)
        admin = config.ADMIN_USERNAME
        if admin and admin not in members:
            members.insert(0, admin)
        return members

    # ---- incoming WhatsApp ----------------------------------------------------------------------------------------

    def record_incoming_whatsapp(
        self, *, message_id: str, sender_phone: str, sender_name: str, body: str, message_type: str, timestamp: str
    ) -> tuple[bool, str | None]:
        """Store one incoming message. Returns (is_new, linked_inquiry_id). A repeated message id is ignored."""
        phone = digits(sender_phone)
        tail = phone[-10:]
        with db_session(self._path, write=True) as conn:
            cur = conn.execute(
                "INSERT OR IGNORE INTO whatsapp_messages (message_id, sender_phone, sender_name, body, message_type,"
                " message_timestamp, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (message_id, phone, sender_name[:120], body[:4000], message_type[:30], timestamp, _stamp()),
            )
            if cur.rowcount == 0:
                return False, None

            user_id = None
            if len(tail) >= 7:
                try:
                    from app.services.admin_ops_service import get_admin_ops_service

                    for customer in get_admin_ops_service().list_customers():
                        if digits(customer.mobile)[-10:] == tail:
                            user_id = customer.id
                            break
                except Exception:
                    user_id = None

            open_list = ",".join(f"'{s}'" for s in OPEN_STATUSES)
            candidates = conn.execute(
                f"SELECT inquiry_id, user_id, customer_phone FROM inquiries WHERE inquiry_status IN ({open_list})"
                " ORDER BY created_at DESC LIMIT 500"
            ).fetchall()
            linked = None
            for row in candidates:
                same_phone = len(tail) >= 7 and digits(row["customer_phone"])[-10:] == tail
                same_user = user_id is not None and row["user_id"] == user_id
                if same_phone or same_user:
                    linked = row["inquiry_id"]
                    break
            conn.execute(
                "UPDATE whatsapp_messages SET inquiry_id = ?, matched_user_id = ? WHERE message_id = ?",
                (linked, user_id, message_id),
            )
            if linked:
                stamp = _stamp()
                self._log(conn, linked, "whatsapp_message_received", "whatsapp", phone, body[:500], at=stamp)
                conn.execute("UPDATE inquiries SET updated_at = ? WHERE inquiry_id = ?", (stamp, linked))
        return True, linked


_service: InquiryService | None = None


def get_inquiry_service() -> InquiryService:
    global _service
    if _service is None:
        _service = InquiryService()
    return _service
