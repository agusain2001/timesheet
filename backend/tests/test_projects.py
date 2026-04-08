"""
Tests for project CRUD operations.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def sample_project_data():
    return {
        "name": "Test Project",
        "status": "active",
        "description": "A test project",
    }


def test_list_projects(client: TestClient, auth_headers: dict):
    """Test listing projects."""
    response = client.get("/api/projects/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_project(client: TestClient, auth_headers: dict, sample_project_data: dict):
    """Test creating a project."""
    response = client.post("/api/projects/", json=sample_project_data, headers=auth_headers)
    assert response.status_code in (200, 201)
    data = response.json()
    assert data["name"] == sample_project_data["name"]
    assert "id" in data


def test_get_project_by_id(client: TestClient, auth_headers: dict, sample_project_data: dict):
    """Test getting a project by ID."""
    create_resp = client.post("/api/projects/", json=sample_project_data, headers=auth_headers)
    if create_resp.status_code not in (200, 201):
        pytest.skip("Project creation failed")
    project_id = create_resp.json()["id"]

    response = client.get(f"/api/projects/{project_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == project_id


def test_update_project(client: TestClient, auth_headers: dict, sample_project_data: dict):
    """Test updating a project."""
    create_resp = client.post("/api/projects/", json=sample_project_data, headers=auth_headers)
    if create_resp.status_code not in (200, 201):
        pytest.skip("Project creation failed")
    project_id = create_resp.json()["id"]

    update_resp = client.put(f"/api/projects/{project_id}", json={"name": "Updated Project"}, headers=auth_headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Updated Project"


def test_delete_project(client: TestClient, auth_headers: dict, sample_project_data: dict):
    """Test deleting a project."""
    create_resp = client.post("/api/projects/", json=sample_project_data, headers=auth_headers)
    if create_resp.status_code not in (200, 201):
        pytest.skip("Project creation failed")
    project_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/api/projects/{project_id}", headers=auth_headers)
    assert delete_resp.status_code in (200, 204)


def test_project_not_found(client: TestClient, auth_headers: dict):
    """Test 404 for non-existent project."""
    response = client.get("/api/projects/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert response.status_code == 404


def test_project_phases(client: TestClient, auth_headers: dict, sample_project_data: dict):
    """Test project phases endpoint."""
    create_resp = client.post("/api/projects/", json=sample_project_data, headers=auth_headers)
    if create_resp.status_code not in (200, 201):
        pytest.skip("Project creation failed")
    project_id = create_resp.json()["id"]

    response = client.get(f"/api/project-structure/projects/{project_id}/phases", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
