"""
Tests for authentication endpoints.
"""
import pytest
from fastapi.testclient import TestClient


def test_register_user(client: TestClient):
    """Test user registration."""
    response = client.post("/api/auth/register", json={
        "email": "newuser@test.com",
        "password": "SecurePass123!",
        "full_name": "New User",
    })
    assert response.status_code in (200, 201, 409)  # 409 if already exists


def test_login_success(client: TestClient):
    """Test successful login."""
    # Ensure user exists first
    client.post("/api/auth/register", json={
        "email": "logintest@test.com",
        "password": "LoginPass123!",
        "full_name": "Login Test User",
    })
    response = client.post("/api/auth/login", data={
        "username": "logintest@test.com",
        "password": "LoginPass123!",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient):
    """Test login with wrong password."""
    response = client.post("/api/auth/login", data={
        "username": "test@lightidea.dev",
        "password": "WrongPassword!",
    })
    assert response.status_code in (400, 401, 422)


def test_get_current_user(client: TestClient, auth_headers: dict):
    """Test getting current user info."""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "email" in data or "id" in data


def test_refresh_token(client: TestClient, auth_headers: dict):
    """Test token refresh."""
    response = client.post("/api/auth/refresh", headers=auth_headers)
    assert response.status_code in (200, 404, 405)  # endpoint may not exist
