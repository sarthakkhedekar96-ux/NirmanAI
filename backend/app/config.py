import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_VERSION_DIR = BASE_DIR / "models" / "risk_engine_v1"
FALLBACK_SQLITE_PATH = BASE_DIR / "database" / "nirman.db"

# Load .env file manually so env vars are available even without python-dotenv
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _key, _, _val = _line.partition("=")
            _key = _key.strip()
            _val = _val.strip().strip('"\'')
            if _key and _key not in os.environ:  # don't override existing shell env vars
                os.environ[_key] = _val

def normalize_database_url(url: str | None) -> str:
    """
    Centralized, safe normalization of PostgreSQL database URLs.
    If url starts with 'postgres://', normalizes prefix to 'postgresql://'.
    Preserves username, password, hostname, port, database name, and query parameters.
    """
    if not url:
        return ""
    url_str = str(url).strip()
    if url_str.startswith("postgres://"):
        return "postgresql://" + url_str[len("postgres://"):]
    return url_str


def mask_database_url(url: str | None) -> str:
    """Mask password in connection URL for safe logging."""
    if not url:
        return ""
    try:
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(url)
        if parsed.password:
            netloc = parsed.netloc.replace(f":{parsed.password}@", ":***@")
            parsed = parsed._replace(netloc=netloc)
            return urlunparse(parsed)
    except Exception:
        pass
    return str(url)


RAW_DATABASE_URL = os.getenv("DATABASE_URL")
HAS_EXPLICIT_DB_URL = bool(RAW_DATABASE_URL and RAW_DATABASE_URL.strip())
DATABASE_URL = normalize_database_url(RAW_DATABASE_URL) if HAS_EXPLICIT_DB_URL else ""