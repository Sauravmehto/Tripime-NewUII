from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.routes import admin, bookings, enquiries, flights, package_themes, packages, payments

app = FastAPI(
    title="Tripime Mock Flight API",
    description="Domestic mock flight search and booking for development.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_origin_regex=config.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(flights.router, prefix="/api/flights", tags=["flights"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(packages.router, prefix="/api/packages", tags=["packages"])
app.include_router(package_themes.router, prefix="/api/package-themes", tags=["package-themes"])
app.include_router(enquiries.router, prefix="/api/enquiries", tags=["enquiries"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/api/health")
def health():
    return {"ok": True, "service": "tripime-mock-api"}
