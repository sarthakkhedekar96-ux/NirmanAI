from typing import List, Optional
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import sqlalchemy
import pandas as pd
from backend.app.core.db_resilience import get_resilient_db_engine
from backend.app.core.security import decode_access_token
from backend.app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> User:
    """
    FastAPI dependency extracting Bearer token from Authorization header or cookie,
    verifying identity, and fetching active User from database.
    """
    token: Optional[str] = None

    if credentials and credentials.credentials:
        token = credentials.credentials
    elif "nirman_session" in request.cookies:
        token = request.cookies.get("nirman_session")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    engine = get_resilient_db_engine()
    query = """
        SELECT id, username, email, full_name, password_hash, role, is_active, created_at, updated_at, last_login_at
        FROM users
        WHERE (id = :uid OR username = :uname) AND is_active = TRUE
        LIMIT 1
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(query), conn, params={"uid": user_id if str(user_id).isdigit() else -1, "uname": str(user_id)})

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    row = df.iloc[0]
    user = User(
        id=int(row["id"]),
        username=str(row["username"]),
        email=str(row["email"]),
        full_name=str(row["full_name"]),
        password_hash=str(row["password_hash"]),
        role=str(row["role"]),
        is_active=bool(row["is_active"])
    )
    return user


def require_role(allowed_roles: List[str]):
    """
    Dependency factory enforcing Role-Based Access Control (RBAC).
    Raises HTTP 403 Forbidden if user's role is not allowed.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").upper()
        allowed_upper = [r.upper() for r in allowed_roles]
        if user_role not in allowed_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}. Your role: {current_user.role}."
            )
        return current_user

    return role_checker
