from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    username: str = Field(max_length=256)
    password: str = Field(max_length=256)


class AdminLoginResponse(BaseModel):
    # Browsers use the HttpOnly cookie + csrfToken; `token` is only returned outside production.
    token: str | None = None
    csrfToken: str
    expiresAt: str


class AdminSessionResponse(BaseModel):
    authenticated: bool
    csrfToken: str | None = None
    expiresAt: str | None = None


class AdminStats(BaseModel):
    totalBookings: int
    confirmedBookings: int
    pendingBookings: int
    bookingsToday: int
    totalRevenue: int
