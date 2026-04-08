"""Add new columns to support_requests table."""
import sqlite3

conn = sqlite3.connect("timesheet.db")
cursor = conn.cursor()

# Check existing columns
cursor.execute("PRAGMA table_info(support_requests)")
existing = [col[1] for col in cursor.fetchall()]
print(f"Existing columns: {existing}")

new_columns = [
    ("subject", "VARCHAR(255)"),
    ("priority", 'VARCHAR(20) DEFAULT "normal"'),
    ("related_module", "VARCHAR(50)"),
    ("image_url", "VARCHAR(500)"),
    ("is_draft", "BOOLEAN DEFAULT 0"),
    ("recipient_ids", "TEXT"),
]

for col_name, col_type in new_columns:
    if col_name not in existing:
        sql = f"ALTER TABLE support_requests ADD COLUMN {col_name} {col_type}"
        cursor.execute(sql)
        print(f"Added column: {col_name}")
    else:
        print(f"Column already exists: {col_name}")

conn.commit()

# Verify
cursor.execute("PRAGMA table_info(support_requests)")
final = [col[1] for col in cursor.fetchall()]
print(f"Final columns: {final}")

conn.close()
print("Migration complete!")
