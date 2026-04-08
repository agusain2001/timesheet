from app.database import engine
from sqlalchemy import text
print("DB URL:", engine.url)
with engine.connect() as conn:
    result = conn.execute(text("PRAGMA table_info(users)"))
    cols = [row for row in result]
    for row in cols:
        print(row)
    org_id_found = any(r[1] == "organization_id" for r in cols)
    print("\norganization_id column present:", org_id_found)
