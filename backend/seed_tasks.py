"""
Seed script to create sample tasks in the database.
Run this from the backend directory: python seed_tasks.py
"""
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
import uuid


SAMPLE_TASKS = [
    # -------- In Progress / Due Today / My Tasks --------
    {
        "name": "Create Dashboard UI",
        "description": "Design and implement the main dashboard interface with stat cards, charts, and activity feed.",
        "task_type": "project",
        "priority": "urgent",
        "status": "in_progress",
        "due_date": datetime.utcnow() + timedelta(days=1),
        "estimated_hours": 8,
    },
    {
        "name": "Fix Login Token Expiry",
        "description": "Investigate and fix the token expiry issue that causes users to be logged out unexpectedly.",
        "task_type": "bug",
        "priority": "high",
        "status": "in_progress",
        "due_date": datetime.utcnow() + timedelta(days=2),
        "estimated_hours": 4,
    },
    {
        "name": "Implement User Settings Page",
        "description": "Create user settings page allowing profile editing, theme preferences, and notification settings.",
        "task_type": "feature",
        "priority": "medium",
        "status": "in_progress",
        "due_date": datetime.utcnow() + timedelta(days=3),
        "estimated_hours": 6,
    },
    {
        "name": "Complete UI Profile Section",
        "description": "Build the user profile section with avatar upload, bio, and contact information display.",
        "task_type": "project",
        "priority": "medium",
        "status": "todo",
        "due_date": datetime.utcnow() + timedelta(days=5),
        "estimated_hours": 5,
    },
    {
        "name": "Add Dark Mode Toggle",
        "description": "Implement theme switching functionality with persistence across sessions.",
        "task_type": "improvement",
        "priority": "low",
        "status": "in_progress",
        "due_date": datetime.utcnow() + timedelta(days=4),
        "estimated_hours": 3,
    },

    # -------- Overdue Tasks --------
    {
        "name": "Setup CI/CD Pipeline",
        "description": "Configure GitHub Actions for automated testing, linting, and deployment.",
        "task_type": "project",
        "priority": "critical",
        "status": "overdue",
        "due_date": datetime.utcnow() - timedelta(days=3),
        "estimated_hours": 10,
    },
    {
        "name": "Write API Documentation",
        "description": "Document all REST API endpoints with request/response examples using Swagger/OpenAPI.",
        "task_type": "assigned",
        "priority": "high",
        "status": "overdue",
        "due_date": datetime.utcnow() - timedelta(days=5),
        "estimated_hours": 8,
    },
    {
        "name": "Fix Database Migration Script",
        "description": "Resolve the broken Alembic migration that causes table conflicts on fresh deployments.",
        "task_type": "bug",
        "priority": "urgent",
        "status": "overdue",
        "due_date": datetime.utcnow() - timedelta(days=2),
        "estimated_hours": 4,
    },
    {
        "name": "Update Security Headers",
        "description": "Add proper CORS, CSP, and security headers to all API responses.",
        "task_type": "improvement",
        "priority": "high",
        "status": "overdue",
        "due_date": datetime.utcnow() - timedelta(days=7),
        "estimated_hours": 3,
    },

    # -------- Completed Tasks --------
    {
        "name": "Design Login Page",
        "description": "Created a modern login page with email/password form, social login options, and responsive layout.",
        "task_type": "project",
        "priority": "urgent",
        "status": "completed",
        "due_date": datetime.utcnow() - timedelta(days=10),
        "estimated_hours": 6,
        "completed_at": datetime.utcnow() - timedelta(days=8),
    },
    {
        "name": "Setup Backend API",
        "description": "Initialized FastAPI project with SQLAlchemy, authentication, and basic CRUD endpoints.",
        "task_type": "project",
        "priority": "critical",
        "status": "completed",
        "due_date": datetime.utcnow() - timedelta(days=14),
        "estimated_hours": 12,
        "completed_at": datetime.utcnow() - timedelta(days=12),
    },
    {
        "name": "Create User Registration Flow",
        "description": "Implemented user registration with email validation, password hashing, and account activation.",
        "task_type": "feature",
        "priority": "high",
        "status": "completed",
        "due_date": datetime.utcnow() - timedelta(days=8),
        "estimated_hours": 5,
        "completed_at": datetime.utcnow() - timedelta(days=6),
    },
    {
        "name": "Add Password Reset Feature",
        "description": "Built password reset flow with email token verification and new password setting.",
        "task_type": "feature",
        "priority": "medium",
        "status": "completed",
        "due_date": datetime.utcnow() - timedelta(days=6),
        "estimated_hours": 4,
        "completed_at": datetime.utcnow() - timedelta(days=4),
    },
    {
        "name": "Optimize Database Queries",
        "description": "Added indexes, eager loading, and query optimization for the task and user endpoints.",
        "task_type": "improvement",
        "priority": "medium",
        "status": "completed",
        "due_date": datetime.utcnow() - timedelta(days=4),
        "estimated_hours": 6,
        "completed_at": datetime.utcnow() - timedelta(days=3),
    },

    # -------- Backlog / Todo / Waiting --------
    {
        "name": "Implement Notifications System",
        "description": "Build real-time notification system with WebSocket support for task updates and mentions.",
        "task_type": "feature",
        "priority": "medium",
        "status": "backlog",
        "due_date": datetime.utcnow() + timedelta(days=14),
        "estimated_hours": 12,
    },
    {
        "name": "Create Report Generation Module",
        "description": "Build PDF/Excel report generation for timesheets, tasks, and project progress.",
        "task_type": "feature",
        "priority": "low",
        "status": "todo",
        "due_date": datetime.utcnow() + timedelta(days=21),
        "estimated_hours": 10,
    },
    {
        "name": "Add Role-Based Access Control",
        "description": "Implement RBAC with admin, manager, and employee permission levels across all endpoints.",
        "task_type": "assigned",
        "priority": "high",
        "status": "waiting",
        "due_date": datetime.utcnow() + timedelta(days=7),
        "estimated_hours": 8,
    },
    {
        "name": "Mobile Responsive Layout",
        "description": "Make all pages fully responsive for mobile and tablet devices with proper breakpoints.",
        "task_type": "improvement",
        "priority": "medium",
        "status": "review",
        "due_date": datetime.utcnow() + timedelta(days=3),
        "estimated_hours": 6,
    },
]


def seed_tasks():
    db = SessionLocal()
    try:
        # Get the test user
        user = db.query(User).filter(User.email == "test@example.com").first()
        if not user:
            print("ERROR: Test user not found. Run create_user.py first.")
            return

        # Optionally find or create a project
        project = db.query(Project).first()
        project_id = project.id if project else None

        if not project_id:
            # Create a sample project
            project = Project(
                id=str(uuid.uuid4()),
                name="TimeSheet",
                description="TimeSheet is an internal project focused on tracking employee work hours, task progress, and team productivity.",
                status="active",
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            project_id = project.id
            print(f"Created sample project: {project.name}")

        # Delete existing tasks for clean seed
        existing = db.query(Task).filter(Task.assignee_id == user.id).count()
        if existing > 0:
            db.query(Task).filter(Task.assignee_id == user.id).delete()
            db.commit()
            print(f"Deleted {existing} existing tasks for user {user.email}")

        # Create tasks
        created = 0
        for t in SAMPLE_TASKS:
            task = Task(
                id=str(uuid.uuid4()),
                name=t["name"],
                description=t.get("description"),
                task_type=t.get("task_type", "personal"),
                priority=t.get("priority", "medium"),
                status=t.get("status", "todo"),
                due_date=t.get("due_date"),
                estimated_hours=t.get("estimated_hours"),
                completed_at=t.get("completed_at"),
                assignee_id=user.id,
                owner_id=user.id,
                project_id=project_id,
                created_at=datetime.utcnow() - timedelta(days=created + 1),
            )
            db.add(task)
            created += 1

        db.commit()
        print(f"\n✅ Created {created} sample tasks for user: {user.email}")
        print(f"   Project: {project.name}")
        print(f"   Breakdown:")

        # Count by status
        for status in ["in_progress", "todo", "overdue", "completed", "backlog", "waiting", "review"]:
            count = sum(1 for t in SAMPLE_TASKS if t["status"] == status)
            if count > 0:
                print(f"     • {status}: {count} tasks")

    except Exception as e:
        print(f"Error seeding tasks: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed_tasks()
