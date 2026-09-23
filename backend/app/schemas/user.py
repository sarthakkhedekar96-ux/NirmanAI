import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


def _check_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[0-9]", v):
        raise ValueError("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", v):
        raise ValueError("Password must contain at least one special character (!@#$%^&*...).")
    return v


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Username or email address")
    password: str = Field(..., min_length=1, description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., description="New password")
    confirm_password: str = Field(..., description="Confirm new password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _check_password_strength(v)


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: str = Field(..., min_length=3, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=128)
    password: str = Field(..., description="Account password")
    role: str = Field("ANALYST", description="ADMIN, DECISION_MAKER, or ANALYST")

    @field_validator("password")
    @classmethod
    def validate_user_password(cls, v: str) -> str:
        return _check_password_strength(v)


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

