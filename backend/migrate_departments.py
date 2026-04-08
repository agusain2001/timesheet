import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy import text
from app.database import engine

def run_migration():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE departments ADD COLUMN status VARCHAR(50) DEFAULT 'active';"))
            print("Added status column successfully.")
        except Exception as e:
            print("Status column might already exist:", e)
            
        try:
            conn.execute(text("ALTER TABLE departments ADD COLUMN budget NUMERIC(15,2) DEFAULT 0.0;"))
            print("Added budget column successfully.")
        except Exception as e:
            print("Budget column might already exist:", e)

if __name__ == "__main__":
    run_migration()
