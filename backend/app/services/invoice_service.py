from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.booking import Booking


def build_invoice_pdf(booking: Booking) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=18,
        textColor=colors.HexColor("#0c4a6e"),
        spaceAfter=6,
    )
    subtitle = ParagraphStyle(
        "InvoiceSub",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#475569"),
        spaceAfter=12,
    )
    heading = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=10,
        spaceAfter=6,
    )

    story = []
    story.append(Paragraph("Flight Invoice", title_style))
    story.append(Paragraph("Tripime — Mock Domestic Booking", subtitle))

    invoice_number = f"INV-{booking.bookingId}"
    meta = [
        ["Invoice Number", invoice_number],
        ["Booking ID", booking.bookingId],
        ["PNR", booking.pnr],
        ["Booking Date", booking.createdAt[:10]],
        ["Status", booking.status],
    ]
    meta_table = Table(meta, colWidths=[45 * mm, 120 * mm])
    meta_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#334155")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(meta_table)

    story.append(Paragraph("Flight details", heading))
    flight_rows = [
        ["Airline", f"{booking.flight.airline.name} ({booking.flight.airline.code})"],
        ["Flight", booking.flight.flightNumber],
        [
            "Route",
            f"{booking.flight.origin.city} ({booking.flight.origin.code}) → "
            f"{booking.flight.destination.city} ({booking.flight.destination.code})",
        ],
        [
            "Departure",
            f"{booking.flight.departureDate} {booking.flight.departureTime}",
        ],
        [
            "Arrival",
            f"{booking.flight.arrivalDate} {booking.flight.arrivalTime}",
        ],
        ["Cabin", booking.flight.cabinClass],
        [
            "Baggage",
            f"Cabin {booking.flight.baggage.cabin} · Check-in {booking.flight.baggage.checkIn}",
        ],
    ]
    flight_table = Table(flight_rows, colWidths=[45 * mm, 120 * mm])
    flight_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(flight_table)

    story.append(Paragraph("Passengers & seats", heading))
    pax_data = [["#", "Passenger", "Seat"]]
    for i, pax in enumerate(booking.passengers, start=1):
        pax_data.append(
            [
                str(i),
                f"{pax.title} {pax.firstName} {pax.lastName}",
                pax.seatNumber or "—",
            ]
        )
    pax_table = Table(pax_data, colWidths=[15 * mm, 100 * mm, 50 * mm])
    pax_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(pax_table)

    story.append(Paragraph("Fare & payment", heading))
    fare_data = [
        ["Flight base fare", f"INR {booking.fare.baseFare:,}"],
        ["Taxes", f"INR {booking.fare.taxes:,}"],
        ["Flight fare total", f"INR {booking.fare.totalFare:,}"],
        ["Seat charges", f"INR {booking.seatCharges:,}"],
        ["Total paid", f"INR {booking.totalAmount:,}"],
        ["Payment method", booking.payment.method.upper()],
        ["Transaction ID", booking.payment.transactionId],
        ["Payment status", booking.payment.status],
    ]
    fare_table = Table(fare_data, colWidths=[60 * mm, 105 * mm])
    fare_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (0, 4), (-1, 4), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 4), (-1, 4), colors.HexColor("#e0f2fe")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
            ]
        )
    )
    story.append(fare_table)
    story.append(Spacer(1, 12))
    story.append(
        Paragraph(
            "This is a mock invoice for development testing. No real payment was processed.",
            subtitle,
        )
    )

    doc.build(story)
    return buffer.getvalue()
