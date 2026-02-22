"""
Direct DB seed: inserts clients and departments directly into the SQLite database.
Run from the backend directory: python seed_direct.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models import Client, Department
import uuid
import json

db = SessionLocal()

# ── Clients ────────────────────────────────────────────────────────────────────
CLIENTS = [
    {
        "name": "Apex Pharmaceuticals",
        "alias": "ApexPharma",
        "region": "Mumbai, India",
        "business_sector": "Pharmacy",
        "address": "14, Bandra Kurla Complex, Mumbai 400051",
        "contacts": json.dumps({
            "client_type": "Company",
            "company_size": "Large (51-200 members)",
            "contact_person_name": "Rajan Mehta",
            "contact_person_role": "Director",
            "primary_phone": "+91-9876543210",
            "primary_email": "rajan@apexpharma.com",
            "preferred_currency": "INR",
            "billing_type": "Monthly",
        }),
        "notes": "Long-term client since 2019. Prefers monthly billing cycles.",
    },
    {
        "name": "NovaTech Solutions",
        "alias": "NovaTech",
        "region": "Bangalore, India",
        "business_sector": "Technology",
        "address": "Electronic City Phase 1, Bangalore 560100",
        "contacts": json.dumps({
            "client_type": "Company",
            "company_size": "Medium (11-50 members)",
            "contact_person_name": "Priya Sharma",
            "contact_person_role": "CTO",
            "primary_phone": "+91-9123456789",
            "primary_email": "priya@novatech.io",
            "preferred_currency": "USD",
            "billing_type": "Hourly",
        }),
        "notes": "Fast-growing SaaS startup. Requires agile delivery.",
    },
    {
        "name": "Greenfield Retail Co.",
        "alias": "Greenfield",
        "region": "Delhi, India",
        "business_sector": "Retail",
        "address": "Connaught Place, New Delhi 110001",
        "contacts": json.dumps({
            "client_type": "Company",
            "company_size": "Enterprise (200+)",
            "contact_person_name": "Amit Gupta",
            "contact_person_role": "CEO",
            "primary_phone": "+91-9988776655",
            "primary_email": "amit@greenfield.in",
            "preferred_currency": "INR",
            "billing_type": "Fixed",
        }),
        "notes": "Retail chain with 50+ stores across North India.",
    },
    {
        "name": "Horizon Healthcare",
        "alias": "HorizonHC",
        "region": "Chennai, India",
        "business_sector": "Healthcare",
        "address": "Anna Salai, Chennai 600002",
        "contacts": json.dumps({
            "client_type": "Company",
            "company_size": "Large (51-200 members)",
            "contact_person_name": "Dr. Sunita Rao",
            "contact_person_role": "CFO",
            "primary_phone": "+91-9345678901",
            "primary_email": "sunita@horizonhc.com",
            "preferred_currency": "INR",
            "billing_type": "Milestone",
        }),
        "notes": "Hospital chain. Requires HIPAA-compliant data handling.",
    },
    {
        "name": "Stellar Finance Group",
        "alias": "StellarFin",
        "region": "Hyderabad, India",
        "business_sector": "Finance",
        "address": "HITEC City, Hyderabad 500081",
        "contacts": json.dumps({
            "client_type": "Company",
            "company_size": "Medium (11-50 members)",
            "contact_person_name": "Vikram Nair",
            "contact_person_role": "Manager",
            "primary_phone": "+91-9654321098",
            "primary_email": "vikram@stellarfin.com",
            "preferred_currency": "USD",
            "billing_type": "Monthly",
        }),
        "notes": "Investment firm. Quarterly reporting required.",
    },
    {
        "name": "EduSpark Learning",
        "alias": "EduSpark",
        "region": "Pune, India",
        "business_sector": "Education",
        "address": "Hinjewadi IT Park, Pune 411057",
        "contacts": json.dumps({
            "client_type": "Company",
            "company_size": "Medium (11-50 members)",
            "contact_person_name": "Neha Joshi",
            "contact_person_role": "Director",
            "primary_phone": "+91-9765432109",
            "primary_email": "neha@eduspark.in",
            "preferred_currency": "INR",
            "billing_type": "Fixed",
        }),
        "notes": "EdTech company with 200k+ active learners.",
    },
    {
        "name": "Ironclad Manufacturing",
        "alias": "Ironclad",
        "region": "Kanpur, India",
        "business_sector": "Manufacturing",
        "address": "Industrial Area, Kanpur 208001",
        "contacts": json.dumps({
            "client_type": "Company",
            "company_size": "Enterprise (200+)",
            "contact_person_name": "Suresh Patel",
            "contact_person_role": "CEO",
            "primary_phone": "+91-9876012345",
            "primary_email": "suresh@ironclad.in",
            "preferred_currency": "INR",
            "billing_type": "Milestone",
        }),
        "notes": "Heavy machinery manufacturer. Large project volumes.",
    },
    {
        "name": "CloudNine Technologies",
        "alias": "CloudNine",
        "region": "Bangalore, India",
        "business_sector": "Technology",
        "address": "Whitefield, Bangalore 560066",
        "contacts": json.dumps({
            "client_type": "Company",
            "company_size": "Medium (11-50 members)",
            "contact_person_name": "Ananya Singh",
            "contact_person_role": "CTO",
            "primary_phone": "+91-9234567890",
            "primary_email": "ananya@cloudnine.tech",
            "preferred_currency": "USD",
            "billing_type": "Hourly",
        }),
        "notes": "Cloud infrastructure provider. AWS & GCP partner.",
    },
]

# ── Departments ────────────────────────────────────────────────────────────────
DEPARTMENTS = [
    {"name": "Engineering", "notes": "Core software development and architecture team responsible for building and maintaining all products."},
    {"name": "Product Management", "notes": "Defines product roadmap, prioritizes features, and bridges engineering with business goals."},
    {"name": "Design & UX", "notes": "Creates user interfaces, design systems, and ensures a seamless user experience across all platforms."},
    {"name": "Human Resources", "notes": "Manages recruitment, onboarding, employee relations, and organizational culture."},
    {"name": "Finance & Accounting", "notes": "Handles budgeting, payroll, financial reporting, and compliance."},
    {"name": "Sales & Business Development", "notes": "Drives revenue growth through client acquisition, partnerships, and market expansion."},
    {"name": "Marketing", "notes": "Manages brand identity, campaigns, content strategy, and digital presence."},
    {"name": "Customer Success", "notes": "Ensures client satisfaction, manages onboarding, and handles support escalations."},
    {"name": "Data & Analytics", "notes": "Provides data insights, builds dashboards, and supports data-driven decision making."},
    {"name": "DevOps & Infrastructure", "notes": "Manages CI/CD pipelines, cloud infrastructure, and system reliability."},
]


def seed():
    print("\n── Seeding Clients ──────────────────────────────────────────────")
    for c in CLIENTS:
        existing = db.query(Client).filter(Client.name == c["name"]).first()
        if existing:
            print(f"  ~ Already exists: {c['name']}")
            continue
        client = Client(id=str(uuid.uuid4()), **c)
        db.add(client)
        print(f"  ✓ Added: {c['name']}")

    print("\n── Seeding Departments ──────────────────────────────────────────")
    for d in DEPARTMENTS:
        existing = db.query(Department).filter(Department.name == d["name"]).first()
        if existing:
            print(f"  ~ Already exists: {d['name']}")
            continue
        dept = Department(id=str(uuid.uuid4()), **d)
        db.add(dept)
        print(f"  ✓ Added: {d['name']}")

    db.commit()
    print("\nDone! ✓")


if __name__ == "__main__":
    seed()
    db.close()
