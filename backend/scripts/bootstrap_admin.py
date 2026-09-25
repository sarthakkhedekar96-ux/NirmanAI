import sys
import getpass
import argparse
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.core.db_init import ensure_users_table_exists
from backend.app.core.db_resilience import get_resilient_db_engine
from backend.app.core.security import hash_password
import sqlalchemy
import pandas as pd


def main():
    parser = argparse.ArgumentParser(description="Nirman AI — One-Time Secure User Bootstrap Script")
    parser.add_argument("--username", help="Username for account")
    parser.add_argument("--email", help="Email for account")
    parser.add_argument("--full-name", help="Full display name")
    parser.add_argument("--role", default="ADMIN", choices=["ADMIN", "DECISION_MAKER", "ANALYST"], help="User role")
    args = parser.parse_args()

    print("\n==================================================")
    print("NIRMAN AI — INSTITUTIONAL SECURE ACCOUNT BOOTSTRAP")
    print("==================================================\n")

    ensure_users_table_exists()

    username = args.username or input("Enter Username: ").strip()
    if not username:
        print("❌ Error: Username cannot be empty.")
        sys.exit(1)

    email = args.email or input("Enter Email Address: ").strip()
    if not email:
        print("❌ Error: Email cannot be empty.")
        sys.exit(1)

    full_name = args.full_name or input("Enter Full Display Name: ").strip()
    if not full_name:
        print("❌ Error: Full Name cannot be empty.")
        sys.exit(1)

    role = args.role.upper()

    # Prompt password securely without echoing characters
    password = getpass.getpass("Enter Password (hidden): ")
    if len(password) < 6:
        print("❌ Error: Password must be at least 6 characters long.")
        sys.exit(1)

    confirm_pwd = getpass.getpass("Confirm Password (hidden): ")
    if password != confirm_pwd:
        print("❌ Error: Passwords do not match.")
        sys.exit(1)

    engine = get_resilient_db_engine()

    # Check if user already exists
    check_query = "SELECT id FROM users WHERE username = :uname OR email = :email LIMIT 1"
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(check_query), conn, params={"uname": username, "email": email})

    if not df.empty:
        print(f"⚠️ User '{username}' / '{email}' already exists. Password will NOT be overwritten.")
        sys.exit(0)

    pwd_hash = hash_password(password)

    insert_sql = """
    INSERT INTO users (username, email, full_name, password_hash, role, is_active)
    VALUES (:uname, :email, :fname, :hash, :role, TRUE)
    """
    with engine.begin() as conn:
        conn.execute(sqlalchemy.text(insert_sql), {
            "uname": username,
            "email": email,
            "fname": full_name,
            "hash": pwd_hash,
            "role": role
        })

    print(f"\n✅ User '{username}' ({email}) successfully created with role [{role}].")


if __name__ == "__main__":
    main()
