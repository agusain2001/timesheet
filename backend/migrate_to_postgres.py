"""
migrate_to_postgres.py
======================
Migrate all data from the existing SQLite database (timesheet.db) to
the Neon PostgreSQL database specified in .env (DATABASE_URL).

Run from the backend directory:
    python migrate_to_postgres.py

Requirements:
    - .env must have DATABASE_URL pointing to Neon PostgreSQL
    - The SQLite file (timesheet.db) must exist in the backend directory
    - psycopg2-binary must be installed (already in requirements.txt)
"""

import os
import sys
import logging
from pathlib import Path

# ── Ensure app package is importable ──────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Load environment ───────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

POSTGRES_URL = os.getenv("DATABASE_URL", "")
SQLITE_URL = "sqlite:///./timesheet.db"

if not POSTGRES_URL or POSTGRES_URL.startswith("sqlite"):
    logger.error("DATABASE_URL in .env must point to PostgreSQL, not SQLite.")
    logger.error("Current value: %s", POSTGRES_URL)
    sys.exit(1)

if not Path("timesheet.db").exists():
    logger.warning("timesheet.db not found — no data to migrate. Creating tables only.")

# ── SQLAlchemy engines ─────────────────────────────────────────────────────────
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

logger.info("Connecting to SQLite: %s", SQLITE_URL)
sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

logger.info("Connecting to PostgreSQL: %s", POSTGRES_URL.split("@")[-1])  # hide credentials
pg_engine = create_engine(
    POSTGRES_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"connect_timeout": 30},
)

# ── Import ALL models (triggers Base.metadata registration) ───────────────────
logger.info("Loading all models...")
from app.database import Base
import app.models  # noqa — imports all models and registers them with Base

# ── Create all tables in PostgreSQL ───────────────────────────────────────────
logger.info("Creating tables in PostgreSQL...")
Base.metadata.create_all(bind=pg_engine)
logger.info("✓ All tables created (or already exist)")

# ── Migrate data table by table ───────────────────────────────────────────────
# Use the SQLAlchemy metadata table order (respects FK dependencies via sorted_tables)
tables = Base.metadata.sorted_tables
logger.info("Found %d tables to migrate", len(tables))

sqlite_inspector = inspect(sqlite_engine)
existing_sqlite_tables = sqlite_inspector.get_table_names()

PgSession = sessionmaker(bind=pg_engine)
pg_session = PgSession()

total_rows = 0
skipped_tables = []

for table in tables:
    table_name = table.name

    # Skip tables that don't exist in SQLite (new tables added for PostgreSQL)
    if table_name not in existing_sqlite_tables:
        logger.info("  • %-40s [not in SQLite, skipping]", table_name)
        skipped_tables.append(table_name)
        continue

    try:
        with sqlite_engine.connect() as sqlite_conn:
            result = sqlite_conn.execute(text(f'SELECT * FROM "{table_name}"'))
            rows = result.fetchall()
            columns = result.keys()

        if not rows:
            logger.info("  • %-40s [empty]", table_name)
            continue

        # Build list of dicts for bulk insert
        row_dicts = [dict(zip(columns, row)) for row in rows]

        # Insert with ON CONFLICT DO NOTHING (safe re-runs)
        # We use core insert so we can add the conflict clause
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        stmt = pg_insert(table).values(row_dicts)
        stmt = stmt.on_conflict_do_nothing()

        with pg_engine.connect() as pg_conn:
            pg_conn.execute(stmt)
            pg_conn.commit()

        total_rows += len(rows)
        logger.info("  • %-40s [%d rows migrated]", table_name, len(rows))

    except Exception as e:
        logger.warning("  ⚠ %-40s [ERROR: %s]", table_name, str(e))
        # Continue with other tables instead of aborting
        continue

pg_session.close()

logger.info("")
logger.info("=" * 60)
logger.info("Migration complete!")
logger.info("  Total rows migrated : %d", total_rows)
if skipped_tables:
    logger.info("  New tables (no SQLite data): %s", ", ".join(skipped_tables))
logger.info("=" * 60)
logger.info("")
logger.info("Next steps:")
logger.info("  1. Restart the backend server to use PostgreSQL")
logger.info("  2. Visit http://localhost:8000/health to verify DB connection")
logger.info("  3. Seed permissions if needed: python seed_permissions.py")
