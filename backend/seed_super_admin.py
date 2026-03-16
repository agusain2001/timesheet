"""
Seed script: Create the first Super Admin user.

Run from the backend/ directory:
    python seed_super_admin.py

You will be prompted for: email, full name, and password.
"""
import uuid
import sqlite3
import hashlib
import getpass
from pathlib import Path

DB_PATH = Path(__file__).parent / "timesheet.db"


def hash_password(password: str) -> str:
    """
    Bcrypt-like placeholder — replaces with the real bcrypt hash used by the app.
    Since the app uses passlib/bcrypt, this just calls the same hash logic via Python.
    """
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)
    except ImportError:
        # Fallback: use sha256 (not production-safe, but lets the script run)
        print("⚠️  passlib not available, falling back to sha256 (not for prod!)")
        return hashlib.sha256(password.encode()).hexdigest()


def seed_super_admin():
    print("=== LightIDEA Super Admin Seed ===\n")
    email = input("Email: ").strip()
    full_name = input("Full Name: ").strip()
    password = getpass.getpass("Password (min 8 chars): ")
    if len(password) < 8:
        print("❌ Password too short.")
        return

    hashed = hash_password(password)
    user_id = str(uuid.uuid4())

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # Check if user already exists
    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    existing = cur.fetchone()
    if existing:
        # Update existing user to super admin
        cur.execute("""
            UPDATE users SET
                role = 'system_admin',
                user_status = 'approved',
                email_verified = 1,
                hashed_password = ?
            WHERE email = ?
        """, (hashed, email))
        print(f"\n✅ Existing user '{email}' promoted to system_admin!")
    else:
        # Insert new super admin
        cur.execute("""
            INSERT INTO users (
                id, email, full_name, hashed_password,
                role, is_active, user_status, email_verified,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'system_admin', 1, 'approved', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (user_id, email, full_name, hashed))
        print(f"\n✅ Super Admin created!")
        print(f"   ID    : {user_id}")
        print(f"   Email : {email}")
        print(f"   Role  : system_admin")

    con.commit()
    con.close()
    print("\n🚀 You can now log in with these credentials.")


if __name__ == "__main__":
    seed_super_admin()
