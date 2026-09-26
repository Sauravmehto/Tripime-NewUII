from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    expiresAt: str


class AdminStats(BaseModel):
    totalBookings: int
    confirmedBookings: int
    pendingBookings: int
    bookingsToday: int
    totalRevenue: int
