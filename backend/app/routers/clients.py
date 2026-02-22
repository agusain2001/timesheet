from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Client, User, Project, ProjectManager
from app.schemas import ClientCreate, ClientUpdate, ClientResponse
from app.utils import get_current_active_user
import csv
import io


class ClientProjectResponse(BaseModel):
    id: str
    name: str
    status: str
    business_sector: Optional[str] = None
    managed_by: Optional[str] = None

    class Config:
        from_attributes = True


class BulkDeleteRequest(BaseModel):
    client_ids: List[str]


class BulkDeleteResult(BaseModel):
    deleted: int
    failed: List[str]


class ExportRequest(BaseModel):
    client_ids: List[str]
    format: str = "csv"  # "csv" or "excel"


router = APIRouter()


@router.get("/", response_model=List[ClientResponse])
def get_all_clients(
    skip: int = 0,
    limit: int = 100,
    region: str = None,
    sector: str = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all clients with optional filters."""
    query = db.query(Client)
    
    if region:
        query = query.filter(Client.region == region)
    if sector:
        query = query.filter(Client.business_sector == sector)
    if search:
        query = query.filter(Client.name.ilike(f"%{search}%"))
    
    return query.offset(skip).limit(limit).all()


@router.post("/bulk-delete", response_model=BulkDeleteResult)
def bulk_delete_clients(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete multiple clients by their IDs."""
    deleted = 0
    failed = []
    for client_id in request.client_ids:
        client = db.query(Client).filter(Client.id == client_id).first()
        if client:
            db.delete(client)
            deleted += 1
        else:
            failed.append(client_id)
    db.commit()
    return BulkDeleteResult(deleted=deleted, failed=failed)


@router.post("/export")
def export_clients(
    request: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export selected clients as CSV."""
    clients = db.query(Client).filter(Client.id.in_(request.client_ids)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Client ID", "Name", "Alias", "Region", "Business Sector", "Address", "Notes"])
    for c in clients:
        writer.writerow([
            c.id,
            c.name,
            c.alias or "",
            c.region or "",
            c.business_sector or "",
            c.address or "",
            c.notes or "",
        ])
    output.seek(0)

    filename = "clients_export.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new client."""
    db_client = Client(**client_data.model_dump())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific client by ID."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: str,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    return None


@router.get("/{client_id}/projects", response_model=List[ClientProjectResponse])
def get_client_projects(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all projects linked to a specific client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    projects = db.query(Project).filter(Project.client_id == client_id).all()
    result = []
    for project in projects:
        # Get primary manager name
        primary_pm = db.query(ProjectManager).filter(
            ProjectManager.project_id == project.id
        ).first()
        managed_by = None
        if primary_pm:
            user = db.query(User).filter(User.id == primary_pm.user_id).first()
            if user:
                managed_by = user.full_name
        result.append(ClientProjectResponse(
            id=project.id,
            name=project.name,
            status=project.status,
            business_sector=None,
            managed_by=managed_by
        ))
    return result

