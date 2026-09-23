from typing import List
import datetime
from fastapi import APIRouter, HTTPException, Depends, status, Response, Request
import sqlalchemy
import pandas as pd

from backend.app.core.db_resilience import get_resilient_db_engine
from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.core.auth_dependencies import get_current_user, require_role
from backend.app.models.user import User
from backend.app.schemas.user import (
    UserResponse,
    LoginRequest,
    TokenResponse,
    ChangePasswordRequest,
    CreateUserRequest,
    UpdateUserRequest
)

from backend.app.middleware.security import (
    check_login_rate_limit, record_failed_login_attempt, reset_login_rate_limit
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])


@router.post("/login", response_model=TokenResponse)
def login(login_req: LoginRequest, response: Response, request: Request):
    """Authenticate user credentials and return JWT bearer token & session cookie."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_login_rate_limit(client_ip)

    engine = get_resilient_db_engine()
    query = """
        SELECT id, username, email, full_name, password_hash, role, is_active, created_at, last_login_at
        FROM users
        WHERE (username = :val OR email = :val)
        LIMIT 1
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(query), conn, params={"val": login_req.username_or_email.strip()})

    if df.empty:
        record_failed_login_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password."
        )

    row = df.iloc[0]
    if not bool(row["is_active"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been deactivated. Please contact a system administrator."
        )

    stored_hash = str(row["password_hash"])
    if not verify_password(login_req.password, stored_hash):
        record_failed_login_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password."
        )

    # Authentication succeeded -> reset rate limiter counter for client_ip
    reset_login_rate_limit(client_ip)

    user_id = int(row["id"])
    now = datetime.datetime.utcnow()

    # Update last_login_at timestamp in background
    update_sql = "UPDATE users SET last_login_at = :now WHERE id = :uid"
    try:
        with engine.begin() as conn:
            conn.execute(sqlalchemy.text(update_sql), {"now": now, "uid": user_id})
    except Exception as e:
        pass

    created_at_val = pd.to_datetime(row["created_at"]).to_pydatetime() if pd.notna(row["created_at"]) else None
    last_login_val = pd.to_datetime(row["last_login_at"]).to_pydatetime() if pd.notna(row["last_login_at"]) else now

    user_res = UserResponse(
        id=int(user_id),
        username=str(row["username"]),
        email=str(row["email"]),
        full_name=str(row["full_name"]),
        role=str(row["role"]),
        is_active=True,
        created_at=created_at_val,
        last_login_at=last_login_val
    )

    access_token = create_access_token(data={
        "sub": str(user_id),
        "username": user_res.username,
        "email": user_res.email,
        "role": user_res.role
    })

    # Set HttpOnly Session Cookie
    response.set_cookie(
        key="nirman_session",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS deployments
        max_age=43200  # 12 hours
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_res
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve current authenticated user profile."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at
    )


@router.post("/logout")
def logout(response: Response, current_user: User = Depends(get_current_user)):
    """Clear session cookies and end user session."""
    response.delete_cookie(key="nirman_session")
    return {"message": "Successfully logged out."}


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user)
):
    """Change authenticated user password after verifying current password."""
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match.")

    engine = get_resilient_db_engine()
    query = "SELECT password_hash FROM users WHERE id = :uid LIMIT 1"
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(query), conn, params={"uid": current_user.id})

    if df.empty:
        raise HTTPException(status_code=404, detail="User account not found.")

    current_hash = str(df.iloc[0]["password_hash"])
    if not verify_password(req.current_password, current_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password.")

    new_hash = hash_password(req.new_password)
    update_sql = "UPDATE users SET password_hash = :hash, updated_at = :now WHERE id = :uid"
    with engine.begin() as conn:
        conn.execute(sqlalchemy.text(update_sql), {"hash": new_hash, "now": datetime.datetime.utcnow(), "uid": current_user.id})

    return {"message": "Password changed successfully."}


# ============================================================
# ADMIN USER MANAGEMENT ENDPOINTS (Role: ADMIN required)
# ============================================================

@router.get("/users", response_model=List[UserResponse])
def list_users(admin: User = Depends(require_role(["ADMIN"]))):
    """List all registered platform users (Admin only)."""
    engine = get_resilient_db_engine()
    query = """
        SELECT id, username, email, full_name, role, is_active, created_at, last_login_at
        FROM users
        ORDER BY id ASC
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(query), conn)

    users = []
    for _, row in df.iterrows():
        c_at = pd.to_datetime(row["created_at"]).to_pydatetime() if pd.notna(row["created_at"]) else None
        ll_at = pd.to_datetime(row["last_login_at"]).to_pydatetime() if pd.notna(row["last_login_at"]) else None
        users.append(UserResponse(
            id=int(row["id"]),
            username=str(row["username"]),
            email=str(row["email"]),
            full_name=str(row["full_name"]),
            role=str(row["role"]),
            is_active=bool(row["is_active"]),
            created_at=c_at,
            last_login_at=ll_at
        ))
    return users


@router.post("/users", response_model=UserResponse)
def create_user(req: CreateUserRequest, admin: User = Depends(require_role(["ADMIN"]))):
    """Create a new platform user account (Admin only)."""
    engine = get_resilient_db_engine()

    # Check existing
    check_query = "SELECT id FROM users WHERE username = :uname OR email = :email LIMIT 1"
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(check_query), conn, params={"uname": req.username.strip(), "email": req.email.strip()})

    if not df.empty:
        raise HTTPException(status_code=400, detail="Username or email already exists.")

    new_hash = hash_password(req.password)
    now = datetime.datetime.utcnow()

    insert_sql = """
        INSERT INTO users (username, email, full_name, password_hash, role, is_active, created_at, updated_at)
        VALUES (:uname, :email, :fname, :hash, :role, TRUE, :now, :now)
        RETURNING id
    """
    with engine.begin() as conn:
        result = conn.execute(sqlalchemy.text(insert_sql), {
            "uname": req.username.strip(),
            "email": req.email.strip(),
            "fname": req.full_name.strip(),
            "hash": new_hash,
            "role": req.role.upper(),
            "now": now
        })
        new_id = result.scalar()

    return UserResponse(
        id=new_id,
        username=req.username.strip(),
        email=req.email.strip(),
        full_name=req.full_name.strip(),
        role=req.role.upper(),
        is_active=True,
        created_at=now,
        last_login_at=None
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    req: UpdateUserRequest,
    admin: User = Depends(require_role(["ADMIN"]))
):
    """Update role or active status of a user (Admin only)."""
    engine = get_resilient_db_engine()

    query = "SELECT id, username, email, full_name, role, is_active, created_at, last_login_at FROM users WHERE id = :uid LIMIT 1"
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(query), conn, params={"uid": user_id})

    if df.empty:
        raise HTTPException(status_code=404, detail="User not found.")

    row = df.iloc[0]
    new_role = req.role.upper() if req.role else str(row["role"])
    new_active = req.is_active if req.is_active is not None else bool(row["is_active"])
    new_fname = req.full_name.strip() if req.full_name else str(row["full_name"])

    update_sql = "UPDATE users SET role = :role, is_active = :active, full_name = :fname, updated_at = :now WHERE id = :uid"
    with engine.begin() as conn:
        conn.execute(sqlalchemy.text(update_sql), {
            "role": new_role,
            "active": new_active,
            "fname": new_fname,
            "now": datetime.datetime.utcnow(),
            "uid": user_id
        })

    c_at = pd.to_datetime(row["created_at"]).to_pydatetime() if pd.notna(row["created_at"]) else None
    ll_at = pd.to_datetime(row["last_login_at"]).to_pydatetime() if pd.notna(row["last_login_at"]) else None

    return UserResponse(
        id=int(user_id),
        username=str(row["username"]),
        email=str(row["email"]),
        full_name=new_fname,
        role=new_role,
        is_active=new_active,
        created_at=c_at,
        last_login_at=ll_at
    )
