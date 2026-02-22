"""
Tests for teams and permissions.
"""
import pytest
from fastapi.testclient import TestClient


def test_list_teams(client: TestClient, auth_headers: dict):
    """Test listing teams."""
    response = client.get("/api/teams/", headers=auth_headers)
    assert response.status_code == 200


def test_get_my_permissions(client: TestClient, auth_headers: dict):
    """Test getting current user's permissions."""
    response = client.get("/api/permissions/my-permissions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "permissions" in data


def test_get_my_roles(client: TestClient, auth_headers: dict):
    """Test getting current user's roles."""
    response = client.get("/api/permissions/roles/my-roles", headers=auth_headers)
    assert response.status_code == 200


def test_list_roles(client: TestClient, auth_headers: dict):
    """Test listing all roles."""
    response = client.get("/api/permissions/roles", headers=auth_headers)
    assert response.status_code == 200


def test_check_permission(client: TestClient, auth_headers: dict):
    """Test checking a specific permission."""
    response = client.get("/api/permissions/check/task.read", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "granted" in data
    assert "permission" in data
