"""
Seed script to create multiple users and assign tasks across them.
Run from backend directory: python seed_users_tasks.py
"""
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.utils import get_password_hash
import uuid


USERS = [
    {"email": "ayush@lightidea.com",  "password": "password", "full_name": "Ayush Sharma",   "role": "admin"},
    {"email": "priya@lightidea.com",  "password": "password", "full_name": "Priya Patel",    "role": "manager"},
    {"email": "rahul@lightidea.com",  "password": "password", "full_name": "Rahul Verma",    "role": "employee"},
    {"email": "sneha@lightidea.com",  "password": "password", "full_name": "Sneha Gupta",    "role": "employee"},
    {"email": "dev@lightidea.com",    "password": "password", "full_name": "Dev Kumar",      "role": "employee"},
]

# Tasks assigned to specific users (by index in USERS list)
# owner_idx = who created it, assignee_idx = who it's assigned to
TASKS = [
    # ---- Ayush's tasks (admin) ----
    {"name": "Review Sprint Backlog",         "desc": "Review and prioritize the sprint backlog items for the next sprint cycle.",        "type": "project",     "priority": "urgent",   "status": "in_progress", "due_days": 1,   "hours": 4,  "assignee": 0, "owner": 0},
    {"name": "Approve Production Deployment", "desc": "Review and approve the latest production deployment checklist.",                   "type": "assigned",    "priority": "critical", "status": "in_progress", "due_days": 0,   "hours": 2,  "assignee": 0, "owner": 1},
    {"name": "Client Demo Preparation",       "desc": "Prepare slides and demo environment for the client presentation.",                "type": "project",     "priority": "high",     "status": "overdue",     "due_days": -2,  "hours": 6,  "assignee": 0, "owner": 0},
    {"name": "Setup Team Standup Process",    "desc": "Define standup format, timing, and tracking for the development team.",            "type": "personal",    "priority": "medium",   "status": "completed",   "due_days": -5,  "hours": 3,  "assignee": 0, "owner": 0, "completed_days": -3},

    # ---- Priya's tasks (manager) ----
    {"name": "Design System Documentation",   "desc": "Create comprehensive design system docs with component library and usage guides.", "type": "project",     "priority": "high",     "status": "in_progress", "due_days": 3,   "hours": 10, "assignee": 1, "owner": 0},
    {"name": "Conduct Code Reviews",          "desc": "Review pull requests from the team and provide constructive feedback.",            "type": "assigned",    "priority": "medium",   "status": "in_progress", "due_days": 1,   "hours": 4,  "assignee": 1, "owner": 0},
    {"name": "Update Project Roadmap",        "desc": "Revise the Q1 project roadmap based on stakeholder feedback.",                    "type": "project",     "priority": "urgent",   "status": "overdue",     "due_days": -3,  "hours": 5,  "assignee": 1, "owner": 0},
    {"name": "Team Performance Review",       "desc": "Complete quarterly performance reviews for all team members.",                     "type": "personal",    "priority": "high",     "status": "overdue",     "due_days": -1,  "hours": 8,  "assignee": 1, "owner": 1},
    {"name": "Onboarding Guide for New Hires","desc": "Write step-by-step onboarding guide covering tools, repos, and processes.",       "type": "feature",     "priority": "medium",   "status": "completed",   "due_days": -7,  "hours": 6,  "assignee": 1, "owner": 1, "completed_days": -5},
    {"name": "Sprint Retrospective Summary",  "desc": "Compile and share sprint retro notes with action items.",                         "type": "project",     "priority": "low",      "status": "completed",   "due_days": -4,  "hours": 2,  "assignee": 1, "owner": 0, "completed_days": -3},

    # ---- Rahul's tasks (developer) ----
    {"name": "Build REST API for Expenses",   "desc": "Implement CRUD endpoints for the expense management module.",                     "type": "feature",     "priority": "high",     "status": "in_progress", "due_days": 4,   "hours": 8,  "assignee": 2, "owner": 1},
    {"name": "Fix Pagination Bug",            "desc": "Fix the off-by-one error in task list pagination that skips items.",              "type": "bug",         "priority": "urgent",   "status": "in_progress", "due_days": 1,   "hours": 3,  "assignee": 2, "owner": 1},
    {"name": "Write Unit Tests for Auth",     "desc": "Add comprehensive unit tests for login, registration, and token refresh flows.",  "type": "assigned",    "priority": "medium",   "status": "todo",        "due_days": 7,   "hours": 6,  "assignee": 2, "owner": 1},
    {"name": "Database Indexing Optimization", "desc": "Add missing database indexes for frequently queried columns.",                   "type": "improvement", "priority": "medium",   "status": "overdue",     "due_days": -4,  "hours": 4,  "assignee": 2, "owner": 0},
    {"name": "Implement WebSocket Notifications", "desc": "Build real-time notification delivery using WebSocket connections.",           "type": "feature",     "priority": "high",     "status": "completed",   "due_days": -6,  "hours": 10, "assignee": 2, "owner": 1, "completed_days": -4},
    {"name": "Refactor Error Handling",       "desc": "Standardize error responses across all API endpoints.",                           "type": "improvement", "priority": "low",      "status": "completed",   "due_days": -8,  "hours": 5,  "assignee": 2, "owner": 1, "completed_days": -6},

    # ---- Sneha's tasks (developer) ----
    {"name": "Create Timesheet Entry Form",   "desc": "Build the timesheet entry form with time picker, project selector, and notes.",   "type": "feature",     "priority": "high",     "status": "in_progress", "due_days": 2,   "hours": 7,  "assignee": 3, "owner": 1},
    {"name": "Responsive Sidebar Navigation", "desc": "Make the sidebar collapse on mobile and add hamburger menu toggle.",              "type": "improvement", "priority": "medium",   "status": "in_progress", "due_days": 5,   "hours": 4,  "assignee": 3, "owner": 0},
    {"name": "Fix Chart Rendering Issue",     "desc": "Resolve the dashboard chart that renders blank on first load.",                   "type": "bug",         "priority": "urgent",   "status": "overdue",     "due_days": -1,  "hours": 3,  "assignee": 3, "owner": 1},
    {"name": "Add Export to CSV Feature",     "desc": "Implement CSV export for task lists and timesheet reports.",                      "type": "feature",     "priority": "medium",   "status": "todo",        "due_days": 10,  "hours": 5,  "assignee": 3, "owner": 1},
    {"name": "UI Component Library Setup",    "desc": "Set up shared UI component library with Storybook integration.",                 "type": "project",     "priority": "high",     "status": "completed",   "due_days": -10, "hours": 8,  "assignee": 3, "owner": 0, "completed_days": -8},
    {"name": "Accessibility Audit Fixes",     "desc": "Fix WCAG compliance issues identified in the accessibility audit.",              "type": "improvement", "priority": "medium",   "status": "completed",   "due_days": -5,  "hours": 6,  "assignee": 3, "owner": 1, "completed_days": -3},

    # ---- Dev's tasks (developer) ----
    {"name": "Setup Docker Compose",          "desc": "Create Docker Compose config for local development with all services.",           "type": "project",     "priority": "high",     "status": "in_progress", "due_days": 3,   "hours": 6,  "assignee": 4, "owner": 0},
    {"name": "Implement File Upload API",     "desc": "Build file upload endpoints with S3 storage and virus scanning.",                "type": "feature",     "priority": "medium",   "status": "in_progress", "due_days": 6,   "hours": 8,  "assignee": 4, "owner": 1},
    {"name": "Fix CORS Configuration",        "desc": "Resolve CORS errors that block frontend-backend communication in staging.",       "type": "bug",         "priority": "critical", "status": "overdue",     "due_days": -2,  "hours": 2,  "assignee": 4, "owner": 0},
    {"name": "Load Testing Setup",            "desc": "Configure k6 load testing scripts for API performance benchmarking.",            "type": "assigned",    "priority": "low",      "status": "backlog",     "due_days": 21,  "hours": 5,  "assignee": 4, "owner": 1},
    {"name": "CI Pipeline Optimization",      "desc": "Reduce CI build time by implementing caching and parallel test execution.",      "type": "improvement", "priority": "medium",   "status": "completed",   "due_days": -3,  "hours": 4,  "assignee": 4, "owner": 0, "completed_days": -1},
    {"name": "Migrate to PostgreSQL",         "desc": "Plan and execute migration from SQLite to PostgreSQL for production readiness.",  "type": "project",     "priority": "high",     "status": "completed",   "due_days": -12, "hours": 12, "assignee": 4, "owner": 0, "completed_days": -10},
]


def seed():
    db = SessionLocal()
    try:
        # --- Create users ---
        user_objs = []
        # Keep the existing test user
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if test_user:
            user_objs.append(test_user)
            print(f"  ✓ Existing user: {test_user.full_name} ({test_user.email})")

        for u in USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if existing:
                user_objs.append(existing)
                print(f"  ✓ Existing user: {existing.full_name} ({existing.email})")
            else:
                new_user = User(
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True,
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                user_objs.append(new_user)
                print(f"  + Created user: {new_user.full_name} ({new_user.email})")

        # --- Get or create project ---
        project = db.query(Project).filter(Project.name == "TimeSheet").first()
        if not project:
            project = Project(
                id=str(uuid.uuid4()),
                name="TimeSheet",
                description="Internal project for tracking employee work hours and productivity.",
                status="active",
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            print(f"  + Created project: {project.name}")

        # --- Clear old seeded tasks (only for these users) ---
        for u in user_objs:
            count = db.query(Task).filter(Task.assignee_id == u.id).count()
            if count > 0:
                db.query(Task).filter(Task.assignee_id == u.id).delete()
                print(f"  🗑 Deleted {count} old tasks for {u.full_name}")
        db.commit()

        # --- Create tasks ---
        now = datetime.utcnow()
        created_count = 0
        for t in TASKS:
            assignee = user_objs[t["assignee"] + 1] if (t["assignee"] + 1) < len(user_objs) else user_objs[0]
            owner = user_objs[t["owner"] + 1] if (t["owner"] + 1) < len(user_objs) else user_objs[0]

            completed_at = None
            if t.get("completed_days") is not None:
                completed_at = now + timedelta(days=t["completed_days"])

            task = Task(
                id=str(uuid.uuid4()),
                name=t["name"],
                description=t["desc"],
                task_type=t["type"],
                priority=t["priority"],
                status=t["status"],
                due_date=now + timedelta(days=t["due_days"]),
                estimated_hours=t["hours"],
                completed_at=completed_at,
                assignee_id=assignee.id,
                owner_id=owner.id,
                project_id=project.id,
                created_at=now - timedelta(days=created_count + 1),
            )
            db.add(task)
            created_count += 1

        db.commit()

        # --- Summary ---
        print(f"\n{'='*50}")
        print(f"✅ SEED COMPLETE")
        print(f"{'='*50}")
        print(f"  Users: {len(user_objs)} (including test@example.com)")
        print(f"  Tasks: {created_count} total")
        print()

        for i, u in enumerate(user_objs):
            if i == 0:
                continue  # skip test user, tasks are assigned to USERS list
            task_count = db.query(Task).filter(Task.assignee_id == u.id).count()
            print(f"  👤 {u.full_name} ({u.email}) — {task_count} tasks")

        print()
        print("  Login credentials (all use password: 'password'):")
        for u in USERS:
            print(f"    • {u['email']}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
