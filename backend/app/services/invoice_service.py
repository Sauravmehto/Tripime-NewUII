"""Branded PDF documents for a booking: the invoice/quote and the e-ticket.

Both reflect the booking's real state. Until an admin has verified payment the
invoice is a quote stamped PAYMENT PENDING. The e-ticket exists only once the
airline's PNR and ticket numbers are recorded (TICKET_ISSUED).
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.booking import Booking
from app.models.flight import Flight

LOGO_PATH = Path(__file__).resolve().parents[1] / "assets" / "tripime_logo.png"
SUPPORT_LINE = "Tripime · +91 98996 44177 · info@tripime.com"

INK = colors.HexColor("#101010")
MUTED = colors.HexColor("#5c5c5c")
PRIMARY = colors.HexColor("#1d4ed8")
GRID = colors.HexColor("#d6d3d1")
HEADER_BG = colors.HexColor("#eff6ff")

TONES = {
    "pending": (colors.HexColor("#fffbeb"), colors.HexColor("#b45309")),
    "paid": (colors.HexColor("#f0fdf4"), colors.HexColor("#15803d")),
    "cancelled": (colors.HexColor("#fef2f2"), colors.HexColor("#b91c1c")),
    "info": (colors.HexColor("#eff6ff"), colors.HexColor("#1d4ed8")),
}

_styles = getSampleStyleSheet()
H_TITLE = ParagraphStyle("DocTitle", parent=_styles["Heading1"], fontSize=17, textColor=INK, alignment=2, spaceAfter=0)
H_SUB = ParagraphStyle("DocSub", parent=_styles["Normal"], fontSize=9, textColor=MUTED, alignment=2)
H_SECTION = ParagraphStyle("Section", parent=_styles["Heading2"], fontSize=11.5, textColor=INK, spaceBefore=10, spaceAfter=5)
BODY = ParagraphStyle("Body", parent=_styles["Normal"], fontSize=8.5, textColor=INK, leading=11)
SMALL = ParagraphStyle("Small", parent=_styles["Normal"], fontSize=7.5, textColor=MUTED, leading=10)


def _money(amount: int) -> str:
    return f"INR {amount:,}"


def _masked(passport: str | None) -> str:
    if not passport:
        return "—"
    return f"{'X' * max(0, len(passport) - 4)}{passport[-4:]}"


def _hm(minutes: int) -> str:
    return f"{minutes // 60}h {minutes % 60:02d}m"


def _table(rows: list[list], widths: list[float], header: bool = False, bold_first_col: bool = False) -> Table:
    table = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("LINEBELOW", (0, 0), (-1, -1), 0.3, GRID),
        ]
    if bold_first_col:
        style.append(("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"))
    table.setStyle(TableStyle(style))
    return table


def _banner(text: str, tone: str, width: float) -> Table:
    bg, fg = TONES[tone]
    table = Table([[text]], colWidths=[width])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), bg),
                ("TEXTCOLOR", (0, 0), (-1, -1), fg),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOX", (0, 0), (-1, -1), 0.8, fg),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def _header(title: str, number: str, width: float) -> Table:
    logo = Image(str(LOGO_PATH), width=42 * mm, height=42 * mm * 244 / 934) if LOGO_PATH.exists() else Paragraph(
        "<b>tripime</b>", H_TITLE
    )
    right = [Paragraph(title, H_TITLE), Paragraph(number, H_SUB)]
    table = Table([[logo, right]], colWidths=[width * 0.45, width * 0.55])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LINEBELOW", (0, 0), (-1, -1), 1.2, PRIMARY),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


STATE_LABELS = {
    "DRAFT": "Draft",
    "PASSENGERS_COMPLETED": "Draft — travellers added",
    "REVIEWED": "Draft — reviewed",
    "PAYMENT_PENDING": "Booking request submitted — payment pending",
    "PAYMENT_FAILED": "Payment not received",
    "PAYMENT_CONFIRMED": "Payment verified — booking with airline",
    "BOOKING_CONFIRMED": "Confirmed by airline — ticket pending",
    "TICKET_ISSUED": "Ticket issued",
    "BOOKING_FAILED": "Airline booking failed",
    "CANCELLED": "Cancelled",
}


def _is_test(booking: Booking) -> bool:
    return booking.legacy


def _payment_rows(booking: Booking) -> list[list[str]]:
    payment = booking.payment
    rows = [["Payment status", booking.paymentStatus.upper()]]
    if payment and payment.status == "SUCCESS":
        rows += [
            ["Payment method", payment.method.upper().replace("_", " ") + (" (TEST MODE)" if payment.testMode else "")],
            ["Reference", payment.transactionId],
            ["Verified", ("by Tripime team " if payment.provider == "manual" else "") + payment.paidAt[:19].replace("T", " ") + " UTC"],
        ]
    else:
        rows.append(["Payment", "Not paid. Our team will confirm availability and the final price before arranging payment."])
    return rows


def _segments(flight: Flight) -> list:
    """(segment-like objects, layovers) with a fallback for pre-segment bookings."""
    return flight.segments or [flight]  # type: ignore[list-item]


def _itinerary(booking: Booking, width: float) -> list:
    story: list = []
    legs = [("Departing flight", booking.flight)]
    if booking.returnFlight is not None:
        legs.append(("Return flight", booking.returnFlight))
    for title, flight in legs:
        stops = "Non-stop" if not flight.stops else f"{flight.stops} stop"
        story.append(
            Paragraph(
                f"{title if len(legs) > 1 else 'Itinerary'} · {flight.origin.city} → {flight.destination.city} · "
                f"{stops} · {_hm(flight.durationMinutes)} · {flight.cabinClass}",
                H_SECTION,
            )
        )
        rows = [["Flight", "From", "Departs", "To", "Arrives", "Duration"]]
        for index, seg in enumerate(_segments(flight)):
            if index and flight.layovers:
                lay = flight.layovers[index - 1]
                rows.append([f"Change planes in {lay.airport.city} ({lay.airport.code}) — layover {_hm(lay.durationMinutes)}", "", "", "", "", ""])
            terminal = lambda a: f" T:{a.terminal}" if getattr(a, "terminal", None) else ""  # noqa: E731
            rows.append(
                [
                    Paragraph(f"<b>{seg.flightNumber}</b><br/>{seg.airline.name}", BODY),
                    Paragraph(f"<b>{seg.origin.code}</b>{terminal(seg.origin)}<br/>{seg.origin.city}", BODY),
                    Paragraph(f"<b>{seg.departureTime}</b><br/>{seg.departureDate}", BODY),
                    Paragraph(f"<b>{seg.destination.code}</b>{terminal(seg.destination)}<br/>{seg.destination.city}", BODY),
                    Paragraph(f"<b>{seg.arrivalTime}</b><br/>{seg.arrivalDate}", BODY),
                    _hm(seg.durationMinutes),
                ]
            )
        table = _table(rows, [w * width for w in (0.2, 0.17, 0.16, 0.17, 0.16, 0.14)], header=True)
        # Layover rows span the full width.
        for r, row in enumerate(rows):
            if isinstance(row[0], str) and row[0].startswith("Change planes"):
                table.setStyle(
                    TableStyle([("SPAN", (0, r), (-1, r)), ("TEXTCOLOR", (0, r), (-1, r), colors.HexColor("#b45309"))])
                )
        story.append(table)
        story.append(
            Paragraph(f"Baggage per passenger: cabin {flight.baggage.cabin}, check-in {flight.baggage.checkIn}.", SMALL)
        )
    return story


def _passengers(booking: Booking, width: float) -> Table:
    round_trip = booking.returnFlight is not None
    has_seats = any(p.seatNumber for p in booking.passengers)
    header = ["#", "Passenger", "Type", "Passport"]
    if has_seats:
        header += ["Seats (departing)"] + (["Seats (return)"] if round_trip else [])
    rows = [header]
    for i, pax in enumerate(booking.passengers, start=1):
        lap = "Lap infant" if pax.type == "infant" else "—"
        row = [str(i), f"{pax.title} {pax.firstName} {pax.lastName}", pax.type.capitalize(), _masked(pax.passportNumber)]
        if has_seats:
            row.append(pax.seatNumber or lap)
            if round_trip:
                row.append(pax.returnSeatNumber or lap)
        rows.append(row)
    widths = [0.05, 0.43, 0.14, 0.2] + ([0.18] + ([0.18] if round_trip else []) if has_seats else [])
    scale = 1 / sum(widths)
    return _table(rows, [w * scale * width for w in widths], header=True)


def _watermark(text: str | None):
    def draw(canvas, doc) -> None:
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(doc.leftMargin, 10 * mm, SUPPORT_LINE)
        canvas.drawRightString(A4[0] - doc.rightMargin, 10 * mm, f"Page {doc.page}")
        if text:
            canvas.setFont("Helvetica-Bold", 58)
            canvas.setFillColor(colors.Color(0.85, 0.47, 0.04, alpha=0.12))
            canvas.translate(A4[0] / 2, A4[1] / 2)
            canvas.rotate(35)
            canvas.drawCentredString(0, 0, text)
        canvas.restoreState()

    return draw


def _document(build_story, watermark: str | None) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=14 * mm, bottomMargin=18 * mm
    )
    story = build_story(doc.width)
    doc.build(story, onFirstPage=_watermark(watermark), onLaterPages=_watermark(watermark))
    return buffer.getvalue()


def _meta(booking: Booking, width: float) -> Table:
    rows = [
        ["Booking reference", booking.bookingId, "Invoice number", booking.invoiceNumber],
        ["Airline PNR", booking.pnr or "Not issued yet", "Requested on", booking.createdAt[:10]],
        ["Status", STATE_LABELS.get(booking.state, booking.state), "Payment status", booking.paymentStatus.upper()],
        ["Contact", f"{booking.contact.email} · {booking.contact.countryCode} {booking.contact.phone}", "", ""],
    ]
    table = _table(rows, [width * 0.18, width * 0.34, width * 0.18, width * 0.3])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
                ("TEXTCOLOR", (2, 0), (2, -1), MUTED),
                ("SPAN", (1, 3), (3, 3)),
            ]
        )
    )
    return table


def build_invoice_pdf(booking: Booking) -> bytes:
    unpaid = booking.paymentStatus != "paid"
    cancelled = booking.state in {"CANCELLED", "BOOKING_FAILED"}

    def story(width: float) -> list:
        title = "QUOTE / BOOKING REQUEST" if unpaid else "INVOICE"
        out: list = [_header(title, booking.invoiceNumber, width), Spacer(1, 8)]
        if cancelled:
            out.append(_banner(STATE_LABELS.get(booking.state, "CANCELLED").upper(), "cancelled", width))
        elif unpaid:
            out.append(_banner("PAYMENT PENDING — this is a quote, not a receipt. Not a ticket.", "pending", width))
        else:
            out.append(_banner("PAID — payment verified by Tripime", "paid", width))
        if _is_test(booking):
            out += [Spacer(1, 4), _banner("LEGACY TEST BOOKING — created by the earlier mock checkout; no real payment", "info", width)]
        out += [Spacer(1, 8), _meta(booking, width)]
        out += _itinerary(booking, width)
        out += [Paragraph("Passengers", H_SECTION), _passengers(booking, width)]

        out.append(Paragraph("Fare breakdown", H_SECTION))
        rows = [
            [f"{line.leg.capitalize()} · {line.count} × {line.passengerType}",
             f"{_money(line.unitFare)} each", _money(line.total)]
            for line in booking.fareBreakdown
        ]
        rows += [
            ["Base fare", "", _money(booking.fare.baseFare)],
            ["Taxes and fees", "", _money(booking.fare.taxes)],
            ["Seat charges", "", _money(booking.seatCharges)],
            ["Total" + (" payable" if unpaid else " paid"), "", _money(booking.totalAmount)],
        ]
        fare = _table(rows, [width * 0.5, width * 0.25, width * 0.25])
        fare.setStyle(
            TableStyle(
                [
                    ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                    ("BACKGROUND", (0, -1), (-1, -1), HEADER_BG),
                    ("LINEABOVE", (0, -1), (-1, -1), 0.6, PRIMARY),
                ]
            )
        )
        out.append(fare)

        invoice = booking.invoice
        if invoice.extraCharges or invoice.discountAmount > 0:
            out.append(Paragraph("Adjustments", H_SECTION))
            adj = [[c.label, _money(c.amount)] for c in invoice.extraCharges]
            if invoice.discountAmount > 0:
                adj.append([invoice.discountLabel or "Discount", f"- {_money(invoice.discountAmount)}"])
            adjusted = booking.totalAmount - invoice.discountAmount + sum(c.amount for c in invoice.extraCharges)
            adj.append(["Adjusted total", _money(adjusted)])
            table = _table(adj, [width * 0.6, width * 0.4], bold_first_col=True)
            table.setStyle(TableStyle([("ALIGN", (1, 0), (-1, -1), "RIGHT"), ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")]))
            out.append(table)

        out += [Paragraph("Payment", H_SECTION), _table(_payment_rows(booking), [width * 0.3, width * 0.7], bold_first_col=True)]
        if invoice.notes.strip():
            out += [Paragraph("Notes", H_SECTION), Paragraph(invoice.notes, BODY)]
        out += [Spacer(1, 10), Paragraph("Computer-generated invoice; no signature required.", SMALL)]
        return out

    return _document(story, "CANCELLED" if cancelled else ("PAYMENT PENDING" if unpaid else None))


def build_ticket_pdf(booking: Booking) -> bytes:
    """E-ticket for an issued booking. Raises ValueError before the airline has issued tickets."""
    if booking.state != "TICKET_ISSUED" or not booking.pnr or not booking.ticketNumbers:
        raise ValueError("No ticket has been issued for this booking yet.")

    def story(width: float) -> list:
        out: list = [_header("E-TICKET", f"Airline PNR {booking.pnr} · {booking.bookingId}", width), Spacer(1, 8)]
        out.append(_banner(f"TICKET ISSUED — ticket number(s) {', '.join(booking.ticketNumbers)}", "paid", width))
        out += [Spacer(1, 8), _meta(booking, width)]
        out += _itinerary(booking, width)
        out += [Paragraph("Passengers", H_SECTION), _passengers(booking, width)]
        out += [
            Paragraph("Payment", H_SECTION),
            _table(_payment_rows(booking) + [["Total", _money(booking.totalAmount)]], [width * 0.3, width * 0.7], bold_first_col=True),
            Paragraph("Before you fly", H_SECTION),
            Paragraph(
                "Carry a government photo ID (a passport for international travel). Check in with the airline using "
                "the PNR above. Seats are assigned by the airline at check-in. Check visa and transit requirements "
                "for every country on your route, including connection airports.",
                BODY,
            ),
        ]
        return out

    return _document(story, None)
