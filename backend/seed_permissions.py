"""
Seed default roles and permissions for the LightIDEA system.
Run: python seed_permissions.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.permission import (
    Permission, Role, RolePermission, UserRole as UserRoleModel,
    PermissionAction, ResourceType
)
import uuid
from datetime import datetime

SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001"


# ─── Permission Definitions ───────────────────────────────────────────────────

PERMISSIONS = []
for resource in [r.value for r in ResourceType]:
    for action in [a.value for a in PermissionAction]:
        PERMISSIONS.append({
            "name": f"{resource}.{action}",
            "display_name": f"{action.title()} {resource.title()}",
            "description": f"Can {action} {resource}s",
            "resource_type": resource,
            "action": action,
            "is_system": True,
        })

# ─── Role Definitions ─────────────────────────────────────────────────────────

ROLE_PERMISSIONS = {
    "system_admin": ["*"],  # All permissions

    "org_admin": [
        f"{r}.{a}" for r in [
            "project", "task", "team", "user", "report", "timesheet", "workspace", "automation", "setting"
        ] for a in ["read", "create", "update", "delete", "approve", "reassign", "export"]
    ],

    "project_manager": [
        f"project.{a}" for a in ["read", "create", "update", "reassign", "export"]
    ] + [
        f"task.{a}" for a in ["read", "create", "update", "delete", "reassign", "approve"]
    ] + [
        f"team.{a}" for a in ["read", "update"]
    ] + [
        f"user.{a}" for a in ["read"]
    ] + [
        f"report.{a}" for a in ["read", "create", "export"]
    ] + [
        f"timesheet.{a}" for a in ["read", "approve"]
    ],

    "team_lead": [
        f"task.{a}" for a in ["read", "create", "update", "reassign"]
    ] + [
        f"team.{a}" for a in ["read", "update"]
    ] + [
        f"user.{a}" for a in ["read"]
    ] + [
        f"report.{a}" for a in ["read"]
    ] + [
        f"timesheet.{a}" for a in ["read"]
    ],

    "contributor": [
        f"task.{a}" for a in ["read", "create", "update"]
    ] + [
        f"project.{a}" for a in ["read"]
    ] + [
        f"team.{a}" for a in ["read"]
    ] + [
        f"user.{a}" for a in ["read"]
    ] + [
        f"timesheet.{a}" for a in ["read", "create", "update"]
    ],

    "stakeholder": [
        f"{r}.read" for r in ["project", "task", "team", "report", "timesheet"]
    ] + [
        f"report.export"
    ],
}

ROLES = {
    "system_admin": {"display_name": "System Administrator", "level": "system", "description": "Global system administrator with full access"},
    "org_admin": {"display_name": "Organization Admin", "level": "org", "description": "Manages users, teams, and projects within the organization"},
    "project_manager": {"display_name": "Project Manager", "level": "project", "description": "Plans and orchestrates project tasks"},
    "team_lead": {"display_name": "Team Lead", "level": "team", "description": "Manages day-to-day team execution"},
    "contributor": {"display_name": "Contributor", "level": "user", "description": "Executes assigned tasks"},
    "stakeholder": {"display_name": "Stakeholder", "level": "user", "description": "Read-only visibility into projects and reports"},
}


def seed():
    db = SessionLocal()
    try:
        print("Seeding permissions...")

        # ── Create all permissions ────────────────────────────────────────────
        perm_map = {}
        for pdef in PERMISSIONS:
            existing = db.query(Permission).filter(
                Permission.name == pdef["name"]
            ).first()
            if not existing:
                perm = Permission(
                    id=str(uuid.uuid4()),
                    name=pdef["name"],
                    display_name=pdef["display_name"],
                    description=pdef["description"],
                    resource_type=pdef["resource_type"],
                    action=pdef["action"],
                    category=pdef["resource_type"],
                    is_system=pdef["is_system"],
                )
                db.add(perm)
                perm_map[pdef["name"]] = perm
                print(f"  + Permission: {pdef['name']}")
            else:
                perm_map[pdef["name"]] = existing

        db.flush()

        # ── Create roles and assign permissions ───────────────────────────────
        for role_name, role_info in ROLES.items():
            existing_role = db.query(Role).filter(Role.name == role_name).first()
            if existing_role:
                role = existing_role
                print(f"  ~ Role exists: {role_name}")
            else:
                role = Role(
                    id=str(uuid.uuid4()),
                    name=role_name,
                    display_name=role_info["display_name"],
                    description=role_info["description"],
                    level=role_info["level"],
                    is_system=True,
                    created_by=SYSTEM_USER_ID,
                )
                db.add(role)
                db.flush()
                print(f"  + Role: {role_name}")

            # Clear existing permissions for a fresh seed
            db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()

            # Assign permissions
            perms_to_assign = ROLE_PERMISSIONS.get(role_name, [])
            if "*" in perms_to_assign:
                perms_to_assign = list(perm_map.keys())

            for pname in perms_to_assign:
                if pname in perm_map:
                    rp = RolePermission(
                        id=str(uuid.uuid4()),
                        role_id=role.id,
                        permission_id=perm_map[pname].id,
                    )
                    db.add(rp)

            print(f"    → Assigned {len(perms_to_assign)} permissions")

        db.commit()
        print("\n✅ Permissions and roles seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding permissions: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
