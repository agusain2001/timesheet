"""
Seed script: adds random clients and departments to the database via the API.
Usage: python seed_data.py
"""
import requests
import json

BASE = "http://localhost:8000/api"

# ── 1. Login to get token ──────────────────────────────────────────────────────
def get_token():
    # Try to get credentials from the first user in the DB via the JSON login endpoint
    # Default credentials — update if different
    for creds in [
        {"email": "admin@example.com", "password": "admin123"},
        {"email": "admin@timesheet.com", "password": "admin123"},
        {"email": "test@test.com", "password": "test123"},
    ]:
        resp = requests.post(f"{BASE}/auth/login/json", json=creds)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("access_token") or data.get("token")
    print("All default credentials failed. Trying form-based login...")
    resp = requests.post(f"{BASE}/auth/login", data={"username": "admin@example.com", "password": "admin123"})
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None

# ── 2. Seed Clients ────────────────────────────────────────────────────────────
CLIENTS = [
    {"name": "Apex Pharmaceuticals", "alias": "ApexPharma", "region": "Mumbai, India", "business_sector": "Pharmacy",
     "contacts": json.dumps({"contact_person_name": "Rajan Mehta", "contact_person_role": "Director",
                              "primary_phone": "+91-9876543210", "primary_email": "rajan@apexpharma.com",
                              "preferred_currency": "INR", "billing_type": "Monthly"}),
     "notes": "Long-term client since 2019. Prefers monthly billing."},

    {"name": "NovaTech Solutions", "alias": "NovaTech", "region": "Bangalore, India", "business_sector": "Technology",
     "contacts": json.dumps({"contact_person_name": "Priya Sharma", "contact_person_role": "CTO",
                              "primary_phone": "+91-9123456789", "primary_email": "priya@novatech.io",
                              "preferred_currency": "USD", "billing_type": "Hourly"}),
     "notes": "Startup client. Fast-growing SaaS company."},

    {"name": "Greenfield Retail Co.", "alias": "Greenfield", "region": "Delhi, India", "business_sector": "Retail",
     "contacts": json.dumps({"contact_person_name": "Amit Gupta", "contact_person_role": "CEO",
                              "primary_phone": "+91-9988776655", "primary_email": "amit@greenfield.in",
                              "preferred_currency": "INR", "billing_type": "Fixed"}),
     "notes": "Retail chain with 50+ stores across North India."},

    {"name": "Horizon Healthcare", "alias": "HorizonHC", "region": "Chennai, India", "business_sector": "Healthcare",
     "contacts": json.dumps({"contact_person_name": "Dr. Sunita Rao", "contact_person_role": "CFO",
                              "primary_phone": "+91-9345678901", "primary_email": "sunita@horizonhc.com",
                              "preferred_currency": "INR", "billing_type": "Milestone"}),
     "notes": "Hospital chain. Requires HIPAA-compliant data handling."},

    {"name": "Stellar Finance Group", "alias": "StellarFin", "region": "Hyderabad, India", "business_sector": "Finance",
     "contacts": json.dumps({"contact_person_name": "Vikram Nair", "contact_person_role": "Manager",
                              "primary_phone": "+91-9654321098", "primary_email": "vikram@stellarfin.com",
                              "preferred_currency": "USD", "billing_type": "Monthly"}),
     "notes": "Investment firm. Quarterly reporting required."},

    {"name": "EduSpark Learning", "alias": "EduSpark", "region": "Pune, India", "business_sector": "Education",
     "contacts": json.dumps({"contact_person_name": "Neha Joshi", "contact_person_role": "Director",
                              "primary_phone": "+91-9765432109", "primary_email": "neha@eduspark.in",
                              "preferred_currency": "INR", "billing_type": "Fixed"}),
     "notes": "EdTech company. 200k+ active learners."},

    {"name": "Ironclad Manufacturing", "alias": "Ironclad", "region": "Kanpur, India", "business_sector": "Manufacturing",
     "contacts": json.dumps({"contact_person_name": "Suresh Patel", "contact_person_role": "CEO",
                              "primary_phone": "+91-9876012345", "primary_email": "suresh@ironclad.in",
                              "preferred_currency": "INR", "billing_type": "Milestone"}),
     "notes": "Heavy machinery manufacturer. Large project volumes."},

    {"name": "CloudNine Technologies", "alias": "CloudNine", "region": "Bangalore, India", "business_sector": "Technology",
     "contacts": json.dumps({"contact_person_name": "Ananya Singh", "contact_person_role": "CTO",
                              "primary_phone": "+91-9234567890", "primary_email": "ananya@cloudnine.tech",
                              "preferred_currency": "USD", "billing_type": "Hourly"}),
     "notes": "Cloud infrastructure provider. AWS & GCP partner."},
]

# ── 3. Seed Departments ────────────────────────────────────────────────────────
DEPARTMENTS = [
    {"name": "Engineering", "description": "Core software development and architecture team responsible for building and maintaining all products."},
    {"name": "Product Management", "description": "Defines product roadmap, prioritizes features, and bridges engineering with business goals."},
    {"name": "Design & UX", "description": "Creates user interfaces, design systems, and ensures a seamless user experience across all platforms."},
    {"name": "Human Resources", "description": "Manages recruitment, onboarding, employee relations, and organizational culture."},
    {"name": "Finance & Accounting", "description": "Handles budgeting, payroll, financial reporting, and compliance."},
    {"name": "Sales & Business Development", "description": "Drives revenue growth through client acquisition, partnerships, and market expansion."},
    {"name": "Marketing", "description": "Manages brand identity, campaigns, content strategy, and digital presence."},
    {"name": "Customer Success", "description": "Ensures client satisfaction, manages onboarding, and handles support escalations."},
    {"name": "Data & Analytics", "description": "Provides data insights, builds dashboards, and supports data-driven decision making."},
    {"name": "DevOps & Infrastructure", "description": "Manages CI/CD pipelines, cloud infrastructure, and system reliability."},
]


def seed(token: str):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    print("\n── Seeding Clients ──────────────────────────────────────────────")
    for c in CLIENTS:
        resp = requests.post(f"{BASE}/clients/", json=c, headers=headers)
        if resp.status_code in (200, 201):
            print(f"  ✓ Created client: {c['name']}")
        elif resp.status_code == 307:
            # Follow redirect
            resp = requests.post(resp.headers["Location"], json=c, headers=headers)
            if resp.status_code in (200, 201):
                print(f"  ✓ Created client: {c['name']}")
            else:
                print(f"  ✗ Failed ({resp.status_code}): {c['name']} — {resp.text[:80]}")
        else:
            print(f"  ✗ Failed ({resp.status_code}): {c['name']} — {resp.text[:80]}")

    print("\n── Seeding Departments ──────────────────────────────────────────")
    for d in DEPARTMENTS:
        resp = requests.post(f"{BASE}/departments/", json=d, headers=headers)
        if resp.status_code in (200, 201):
            print(f"  ✓ Created department: {d['name']}")
        elif resp.status_code == 307:
            resp = requests.post(resp.headers["Location"], json=d, headers=headers)
            if resp.status_code in (200, 201):
                print(f"  ✓ Created department: {d['name']}")
            else:
                print(f"  ✗ Failed ({resp.status_code}): {d['name']} — {resp.text[:80]}")
        else:
            print(f"  ✗ Failed ({resp.status_code}): {d['name']} — {resp.text[:80]}")

    print("\nDone! ✓")


if __name__ == "__main__":
    print("Logging in...")
    token = get_token()
    if not token:
        print("Could not get auth token. Check credentials or server status.")
        exit(1)
    print(f"Token obtained ✓")
    seed(token)
