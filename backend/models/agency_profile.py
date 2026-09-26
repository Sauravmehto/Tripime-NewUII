from pydantic import BaseModel, EmailStr, Field


class AgencyProfile(BaseModel):
    companyName: str = Field(..., min_length=1, max_length=120)
    agencyName: str = Field(..., min_length=1, max_length=120)
    domainName: str = Field("", max_length=120)
    email: EmailStr
    contactNo: str = Field("", max_length=20)
    panNumber: str = Field("", max_length=20)
    gstNumber: str = Field("", max_length=20)
    address: str = Field("", max_length=400)
    updatedAt: str = ""


class AgencyProfileUpdate(BaseModel):
    companyName: str = Field(..., min_length=1, max_length=120)
    agencyName: str = Field(..., min_length=1, max_length=120)
    domainName: str = Field("", max_length=120)
    email: EmailStr
    contactNo: str = Field("", max_length=20)
    panNumber: str = Field("", max_length=20)
    gstNumber: str = Field("", max_length=20)
    address: str = Field("", max_length=400)


class AgencyProfileResponse(AgencyProfile):
    username: str
    passwordManagedBy: str = "environment"
