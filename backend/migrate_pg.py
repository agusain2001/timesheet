import os
import sys
from sqlalchemy import text
from app.database import engine

def migrate():
    print("Migrating PostgreSQL Database...")
    with engine.begin() as conn:
        # Create organizations table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS organizations (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                slug VARCHAR UNIQUE,
                logo_url VARCHAR,
                tax_id VARCHAR,
                website VARCHAR,
                industry VARCHAR,
                address VARCHAR,
                city VARCHAR,
                state VARCHAR,
                country VARCHAR,
                postal_code VARCHAR,
                subscription_plan VARCHAR DEFAULT 'free',
                max_users INTEGER DEFAULT 10,
                max_projects INTEGER DEFAULT 5,
                is_active BOOLEAN DEFAULT TRUE,
                is_verified BOOLEAN DEFAULT FALSE,
                settings JSON,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Helper for adding columns
        def ensure_column(table, column, definition):
            # Check if column exists
            result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='{column}'"))
            if not result.fetchone():
                print(f"Adding {column} to {table}...")
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
            else:
                print(f"Column {column} already exists in {table}.")

        # Multi-tenancy columns
        tables_with_org = [
            'users', 'departments', 'teams', 'projects', 'clients', 
            'timesheets', 'expenses', 'workspaces', 'tasks', 'time_logs', 
            'active_timers', 'capacities', 'cost_centers', 'expense_categories', 
            'approval_rules'
        ]
        
        for table in tables_with_org:
            ensure_column(table, 'organization_id', 'VARCHAR')

        # User columns
        ensure_column('users', 'email_verified', 'BOOLEAN DEFAULT FALSE')
        ensure_column('users', 'user_status', "VARCHAR DEFAULT 'active'")
        ensure_column('users', 'email_verification_token', 'VARCHAR')
        ensure_column('users', 'skills', 'VARCHAR')
        ensure_column('users', 'expertise_level', 'VARCHAR')
        ensure_column('users', 'working_hours_start', 'TIME')
        ensure_column('users', 'working_hours_end', 'TIME')
        ensure_column('users', 'timezone', 'VARCHAR')
        ensure_column('users', 'availability_status', "VARCHAR DEFAULT 'available'")
        ensure_column('users', 'capacity_hours_week', 'INTEGER DEFAULT 40')
        ensure_column('users', 'notification_preferences', 'JSON')
        ensure_column('users', 'ui_preferences', 'JSON')
        ensure_column('users', 'settings', 'JSON')
        ensure_column('users', 'last_login_at', 'TIMESTAMP WITH TIME ZONE')
        
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
