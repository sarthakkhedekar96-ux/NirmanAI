import os
import secrets
import datetime
import logging
import bcrypt
import jwt

import backend.app.config  # Ensure .env file is loaded into os.environ

logger = logging.getLogger("nirman.security")

# Load Secret Key from Environment Variable
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    logger.warning("⚠️ JWT_SECRET_KEY environment variable not set. Using default development secret key.")
    JWT_SECRET_KEY = "nirman_dev_secret_key_2026_super_secure_stable_jwt_key"

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "720"))  # Default 12 hours


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    pwd_bytes = password.encode('utf-8')
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_access_token(data: dict, expires_delta: datetime.timedelta | None = None) -> str:
    """Create short-lived JWT access token with user claims."""
    to_encode = data.copy()
    now = datetime.datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": now,
        "iss": "nirman-ai-auth"
    })
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM], issuer="nirman-ai-auth")
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token signature has expired.")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        return None
