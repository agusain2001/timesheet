"""Expense Reports Router - PDF/Excel exports and audit logs."""
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import io

from app.database import get_db
from app.models import Expense, ExpenseItem, ExpenseAuditLog, User, Department, Project
from app.schemas import (
    ExpenseReportFilter, ExpenseReportResponse, ExpenseReportItem, 
    ExpenseReportSummary, ExpenseAuditLogResponse, TaxReportItem
)
from app.utils import get_current_active_user
from app.services.report_generator import generate_expense_excel, generate_expense_pdf, generate_tax_report_excel

router = APIRouter()


def build_report_data(
    db: Session,
    filters: ExpenseReportFilter,
    current_user: User
) -> tuple:
    """Build report data based on filters."""
    query = db.query(Expense)
    
    # Role-based filtering
    if current_user.role not in ["admin", "manager"]:
        query = query.filter(Expense.user_id == current_user.id)
    elif filters.user_id:
        query = query.filter(Expense.user_id == filters.user_id)
    
    # Apply filters
    if filters.start_date:
        query = query.filter(Expense.created_at >= datetime.combine(filters.start_date, datetime.min.time()))
    if filters.end_date:
        query = query.filter(Expense.created_at <= datetime.combine(filters.end_date, datetime.max.time()))
    if filters.department_id:
        query = query.join(User).filter(User.department_id == filters.department_id)
    if filters.project_id:
        query = query.filter(Expense.project_id == filters.project_id)
    if filters.cost_center_id:
        query = query.filter(Expense.cost_center_id == filters.cost_center_id)
    if filters.status:
        query = query.filter(Expense.status == filters.status)
    if filters.min_amount:
        query = query.filter(Expense.total_amount >= filters.min_amount)
    if filters.max_amount:
        query = query.filter(Expense.total_amount <= filters.max_amount)
    
    expenses = query.order_by(Expense.created_at.desc()).all()
    
    # Build report items
    items = []
    total_amount = 0
    status_breakdown = {}
    
    for exp in expenses:
        user = db.query(User).filter(User.id == exp.user_id).first()
        dept = db.query(Department).filter(Department.id == user.department_id).first() if user and user.department_id else None
        proj = db.query(Project).filter(Project.id == exp.project_id).first() if exp.project_id else None
        
        items.append({
            "expense_id": exp.id,
            "expense_title": exp.title,
            "user_name": user.full_name if user else "Unknown",
            "department_name": dept.name if dept else None,
            "project_name": proj.name if proj else None,
            "cost_center_name": None,
            "total_amount": float(exp.total_amount or 0),
            "currency": exp.currency,
            "status": exp.status,
            "submitted_at": exp.submitted_at,
            "approved_at": exp.approved_at
        })
        
        total_amount += float(exp.total_amount or 0)
        status_breakdown[exp.status] = status_breakdown.get(exp.status, 0) + float(exp.total_amount or 0)
    
    # Build summary
    date_range = "All time"
    if filters.start_date and filters.end_date:
        date_range = f"{filters.start_date} to {filters.end_date}"
    elif filters.start_date:
        date_range = f"From {filters.start_date}"
    elif filters.end_date:
        date_range = f"Until {filters.end_date}"
    
    summary = {
        "total_amount": total_amount,
        "total_count": len(items),
        "by_status": status_breakdown,
        "by_category": {},
        "date_range": date_range
    }
    
    return items, summary


@router.get("/report", response_model=ExpenseReportResponse)
def get_expense_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get expense report with filters."""
    filters = ExpenseReportFilter(
        start_date=start_date,
        end_date=end_date,
        user_id=user_id,
        department_id=department_id,
        project_id=project_id,
        status=status
    )
    
    items, summary = build_report_data(db, filters, current_user)
    
    return ExpenseReportResponse(
        generated_at=datetime.utcnow(),
        filter_applied=filters,
        summary=ExpenseReportSummary(**summary),
        items=[ExpenseReportItem(**item) for item in items]
    )


@router.get("/export/excel")
def export_expenses_excel(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export expenses as Excel file."""
    filters = ExpenseReportFilter(
        start_date=start_date,
        end_date=end_date,
        user_id=user_id,
        department_id=department_id,
        status=status
    )
    
    items, summary = build_report_data(db, filters, current_user)
    
    try:
        excel_bytes = generate_expense_excel(items, summary, "Expense Report")
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    filename = f"expense_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/pdf")
def export_expenses_pdf(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export expenses as PDF file."""
    filters = ExpenseReportFilter(
        start_date=start_date,
        end_date=end_date,
        user_id=user_id,
        department_id=department_id,
        status=status
    )
    
    items, summary = build_report_data(db, filters, current_user)
    
    try:
        pdf_bytes = generate_expense_pdf(items, summary, "Expense Report")
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    filename = f"expense_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/tax-report")
def get_tax_report(
    year: int = Query(..., description="Tax year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get tax-related expense report."""
    # Only approved/paid expenses count for tax purposes
    query = db.query(ExpenseItem).join(Expense).filter(
        Expense.status.in_(["approved", "paid"]),
        func.extract('year', ExpenseItem.date) == year
    )
    
    if current_user.role not in ["admin", "manager"]:
        query = query.filter(Expense.user_id == current_user.id)
    
    items = query.all()
    
    tax_items = []
    for item in items:
        tax_items.append(TaxReportItem(
            expense_id=item.expense_id,
            date=item.date,
            vendor=item.vendor,
            description=item.description,
            amount=float(item.amount or 0),
            tax_amount=0,  # Would need tax calculation logic
            category=item.expense_type,
            receipt_available=bool(item.receipt_path or item.attachment_url)
        ))
    
    return {
        "year": year,
        "items": [item.model_dump() for item in tax_items],
        "total_amount": sum(item.amount for item in tax_items),
        "items_with_receipts": sum(1 for item in tax_items if item.receipt_available)
    }


@router.get("/tax-report/export")
def export_tax_report_excel(
    year: int = Query(..., description="Tax year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export tax report as Excel file."""
    # Get tax items
    query = db.query(ExpenseItem).join(Expense).filter(
        Expense.status.in_(["approved", "paid"]),
        func.extract('year', ExpenseItem.date) == year
    )
    
    if current_user.role not in ["admin", "manager"]:
        query = query.filter(Expense.user_id == current_user.id)
    
    items = query.all()
    
    tax_items = []
    for item in items:
        tax_items.append({
            "expense_id": item.expense_id,
            "date": item.date,
            "vendor": item.vendor,
            "description": item.description,
            "amount": float(item.amount or 0),
            "tax_amount": 0,
            "category": item.expense_type,
            "receipt_available": bool(item.receipt_path or item.attachment_url)
        })
    
    try:
        excel_bytes = generate_tax_report_excel(tax_items, year)
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    filename = f"tax_report_{year}.xlsx"
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/audit-logs", response_model=List[ExpenseAuditLogResponse])
def get_audit_logs(
    expense_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get expense audit logs."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin/Manager access required")
    
    query = db.query(ExpenseAuditLog)
    
    if expense_id:
        query = query.filter(ExpenseAuditLog.expense_id == expense_id)
    if user_id:
        query = query.filter(ExpenseAuditLog.user_id == user_id)
    if action:
        query = query.filter(ExpenseAuditLog.action == action)
    if start_date:
        query = query.filter(ExpenseAuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(ExpenseAuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    logs = query.order_by(ExpenseAuditLog.created_at.desc()).limit(limit).all()
    
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append(ExpenseAuditLogResponse(
            id=log.id,
            expense_id=log.expense_id,
            user_id=log.user_id,
            user_name=user.full_name if user else None,
            action=log.action,
            old_values=log.old_values,
            new_values=log.new_values,
            created_at=log.created_at
        ))
    
    return result
