"""
pytest configuration and shared fixtures.
Uses SQLite in-memory database to avoid affecting production data.
"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import httpx

from app.main import app
from app.database import Base, get_db
from app.models import User, Task, Project

# ─── Test Database ────────────────────────────────────────────────────────────

SQLALCHEMY_TEST_URL = "sqlite:///./test.db"

test_engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables before tests and drop after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def db():
    """Fresh DB session for each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def client():
    """Test client for the FastAPI app."""
    with TestClient(app) as c:
        yield c


# ─── Auth Fixtures ────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def auth_headers(client: TestClient):
    """Login and return auth headers for a test user."""
    # Register a test user
    register_resp = client.post("/api/auth/register", json={
        "email": "test@lightidea.dev",
        "password": "TestPassword123!",
        "full_name": "Test User",
        "role": "admin",
    })

    # Login to get token
    login_resp = client.post("/api/auth/login", data={
        "username": "test@lightidea.dev",
        "password": "TestPassword123!",
    })

    token = ""
    if login_resp.status_code == 200:
        token = login_resp.json().get("access_token", "")

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def manager_headers(client: TestClient):
    """Login and return auth headers for a manager user."""
    client.post("/api/auth/register", json={
        "email": "manager@lightidea.dev",
        "password": "ManagerPass123!",
        "full_name": "Manager User",
        "role": "manager",
    })
    login_resp = client.post("/api/auth/login", data={
        "username": "manager@lightidea.dev",
        "password": "ManagerPass123!",
    })
    token = login_resp.json().get("access_token", "") if login_resp.status_code == 200 else ""
    return {"Authorization": f"Bearer {token}"}
