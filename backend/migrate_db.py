"""
Migration script: Add multi-tenancy support columns to existing SQLite DB.
Run from the backend/ directory:  python migrate_db.py
"""
import sqlite3
import uuid
from pathlib import Path

DB_PATH = Path(__file__).parent / "timesheet.db"

def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())

def table_exists(cursor, table: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None

def add_column_if_missing(cursor, table: str, column: str, col_type: str):
    if table_exists(cursor, table) and not column_exists(cursor, table, column):
        print(f"  + Adding column '{column}' to table '{table}'")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
    elif not table_exists(cursor, table):
        print(f"  ! Table '{table}' does not exist, skipping column '{column}'")
    else:
        print(f"  . Column '{column}' already exists in '{table}', skipping")

def run_migration():
    print(f"Connecting to DB: {DB_PATH}")
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # ------------------------------------------------------------------
    # 1. Create organizations table
    # ------------------------------------------------------------------
    if not table_exists(cur, "organizations"):
        print("Creating 'organizations' table...")
        cur.execute("""
            CREATE TABLE organizations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE,
                logo_url TEXT,
                tax_id TEXT,
                website TEXT,
                industry TEXT,
                address TEXT,
                city TEXT,
                state TEXT,
                country TEXT,
                zip_code TEXT,
                phone TEXT,
                email TEXT,
                subscription_plan TEXT DEFAULT 'free',
                max_users INTEGER DEFAULT 50,
                max_projects INTEGER DEFAULT 20,
                is_verified INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  + 'organizations' table created.")
    else:
        print("  . 'organizations' table already exists, skipping.")

    # ------------------------------------------------------------------
    # 2. Add organization_id FK to tables that reference organizations
    # ------------------------------------------------------------------
    tables_needing_org_id = [
        "users",
        "departments",
        "teams",
        "projects",
        "clients",
        "timesheets",
        "expenses",
        "workspaces",
    ]
    print("\nAdding organization_id columns...")
    for table in tables_needing_org_id:
        add_column_if_missing(cur, table, "organization_id", "TEXT")

    # ------------------------------------------------------------------
    # 3. Add verification & approval columns to users
    # ------------------------------------------------------------------
    print("\nAdding verification/approval columns to 'users'...")
    add_column_if_missing(cur, "users", "email_verified",             "INTEGER DEFAULT 0")
    add_column_if_missing(cur, "users", "user_status",                "TEXT DEFAULT 'approved'")
    add_column_if_missing(cur, "users", "email_verification_token",   "TEXT")

    # ------------------------------------------------------------------
    # 4. Add any other new user profile columns that may be missing
    # ------------------------------------------------------------------
    print("\nAdding extended profile columns to 'users'...")
    add_column_if_missing(cur, "users", "skills",               "TEXT")          # JSON stored as text
    add_column_if_missing(cur, "users", "expertise_level",      "TEXT")
    add_column_if_missing(cur, "users", "working_hours_start",  "TEXT DEFAULT '09:00'")
    add_column_if_missing(cur, "users", "working_hours_end",    "TEXT DEFAULT '17:00'")
    add_column_if_missing(cur, "users", "timezone",             "TEXT DEFAULT 'Africa/Cairo'")
    add_column_if_missing(cur, "users", "availability_status",  "TEXT DEFAULT 'available'")
    add_column_if_missing(cur, "users", "capacity_hours_week",  "REAL DEFAULT 40.0")
    add_column_if_missing(cur, "users", "notification_preferences", "TEXT")
    add_column_if_missing(cur, "users", "ui_preferences",       "TEXT")
    add_column_if_missing(cur, "users", "settings",             "TEXT")
    add_column_if_missing(cur, "users", "last_login_at",        "DATETIME")

    con.commit()
    con.close()
    print("\n✅ Migration complete!")

if __name__ == "__main__":
    run_migration()
