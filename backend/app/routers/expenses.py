"""Expenses Router - CRUD and workflow operations for expenses."""
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Expense, ExpenseItem, ExpenseApproval, ExpenseAuditLog, 
    User, ExpenseStatus, ApprovalStatus
)
from app.schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    ExpenseRejectAction, ExpenseReturnAction, ExpenseApprovalResponse,
    ExpenseAuditLogResponse
)
from app.utils import get_current_active_user
from app.services.file_upload import save_receipt
from app.services.notification_service import NotificationService

router = APIRouter()


def create_audit_log(
    db: Session,
    expense_id: str,
    user_id: str,
    action: str,
    old_values: dict = None,
    new_values: dict = None
):
    """Create an audit log entry."""
    log = ExpenseAuditLog(
        expense_id=expense_id,
        user_id=user_id,
        action=action,
        old_values=old_values,
        new_values=new_values
    )
    db.add(log)


@router.get("/", response_model=List[ExpenseResponse])
def get_all_expenses(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    project_id: Optional[str] = None,
    cost_center_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all expenses with optional filters."""
    query = db.query(Expense)
    
    # Non-admins see their own or pending for approval
    if current_user.role not in ["admin", "manager"]:
        query = query.filter(Expense.user_id == current_user.id)
    elif user_id:
        query = query.filter(Expense.user_id == user_id)
    
    if status_filter:
        query = query.filter(Expense.status == status_filter)
    if project_id:
        query = query.filter(Expense.project_id == project_id)
    if cost_center_id:
        query = query.filter(Expense.cost_center_id == cost_center_id)
    
    expenses = query.order_by(Expense.created_at.desc()).offset(skip).limit(limit).all()
    
    # Populate user info for each expense
    for expense in expenses:
        expense.user = db.query(User).filter(User.id == expense.user_id).first()
    
    return expenses


@router.get("/my", response_model=List[ExpenseResponse])
def get_my_expenses(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's expenses."""
    query = db.query(Expense).filter(Expense.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Expense.status == status_filter)
    
    return query.order_by(Expense.created_at.desc()).all()


@router.get("/pending", response_model=List[ExpenseResponse])
def get_pending_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get pending expenses for approval (managers only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    expenses = db.query(Expense).filter(
        Expense.status.in_([ExpenseStatus.PENDING.value, ExpenseStatus.SUBMITTED.value])
    ).order_by(Expense.created_at.desc()).all()
    
    # Populate user info
    for expense in expenses:
        expense.user = db.query(User).filter(User.id == expense.user_id).first()
    
    return expenses


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new expense."""
    db_expense = Expense(
        user_id=current_user.id,
        title=expense_data.title,
        description=expense_data.description,
        project_id=expense_data.project_id,
        cost_center_id=expense_data.cost_center_id,
        currency=expense_data.currency,
        vendor=expense_data.vendor,
        payment_method=expense_data.payment_method
    )
    
    db.add(db_expense)
    db.flush()
    
    # Add items if provided
    total_amount = Decimal("0.00")
    if expense_data.items:
        for item_data in expense_data.items:
            item = ExpenseItem(
                expense_id=db_expense.id,
                **item_data.model_dump()
            )
            db.add(item)
            # Calculate with currency rate
            total_amount += Decimal(str(item_data.amount)) * Decimal(str(item_data.currency_rate))
    
    db_expense.total_amount = total_amount
    
    # Create audit log
    create_audit_log(
        db, db_expense.id, current_user.id, "created",
        new_values={"title": expense_data.title, "total_amount": float(total_amount)}
    )
    
    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific expense by ID."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Check access
    if current_user.role not in ["admin", "manager"] and expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    expense.user = db.query(User).filter(User.id == expense.user_id).first()
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an expense."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Check authorization
    if expense.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Store old values for audit
    old_values = {"status": expense.status, "total_amount": float(expense.total_amount or 0)}
    
    # Update fields
    update_data = expense_data.model_dump(exclude_unset=True, exclude={"items", "status"})
    for key, value in update_data.items():
        setattr(expense, key, value)
    
    if expense_data.status is not None:
        if expense_data.status == "approved":
            expense.approved_at = datetime.utcnow()
        elif expense_data.status == "pending":
            expense.submitted_at = datetime.utcnow()
        elif expense_data.status == "rejected":
            expense.rejected_at = datetime.utcnow()
        elif expense_data.status == "paid":
            expense.paid_at = datetime.utcnow()
        expense.status = expense_data.status
    
    # Update items if provided
    if expense_data.items is not None:
        db.query(ExpenseItem).filter(ExpenseItem.expense_id == expense_id).delete()
        
        total_amount = Decimal("0.00")
        for item_data in expense_data.items:
            item = ExpenseItem(
                expense_id=expense.id,
                **item_data.model_dump()
            )
            db.add(item)
            total_amount += Decimal(str(item_data.amount)) * Decimal(str(item_data.currency_rate))
        
        expense.total_amount = total_amount
    
    # Create audit log
    create_audit_log(
        db, expense.id, current_user.id, "updated",
        old_values=old_values,
        new_values={"status": expense.status, "total_amount": float(expense.total_amount or 0)}
    )
    
    db.commit()
    db.refresh(expense)
    return expense


@router.post("/{expense_id}/submit", response_model=ExpenseResponse)
def submit_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit an expense for approval."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if expense.status not in [ExpenseStatus.DRAFT.value, ExpenseStatus.RETURNED.value]:
        raise HTTPException(status_code=400, detail="Can only submit draft or returned expenses")
    
    old_status = expense.status
    expense.status = ExpenseStatus.SUBMITTED.value
    expense.submitted_at = datetime.utcnow()
    expense.current_approval_level = 1
    
    # Create audit log
    create_audit_log(
        db, expense.id, current_user.id, "submitted",
        old_values={"status": old_status},
        new_values={"status": expense.status}
    )
    
    db.commit()
    db.refresh(expense)
    return expense


@router.post("/{expense_id}/approve", response_model=ExpenseResponse)
def approve_expense(
    expense_id: str,
    comments: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Approve an expense (managers only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.status not in [ExpenseStatus.SUBMITTED.value, ExpenseStatus.PENDING.value]:
        raise HTTPException(status_code=400, detail="Expense is not pending approval")
    
    # Create approval record
    approval = ExpenseApproval(
        expense_id=expense.id,
        approver_id=current_user.id,
        level=expense.current_approval_level,
        status=ApprovalStatus.APPROVED.value,
        decision_at=datetime.utcnow(),
        comments=comments
    )
    db.add(approval)
    
    # Check if more approvals needed
    if expense.current_approval_level >= expense.required_approval_levels:
        expense.status = ExpenseStatus.APPROVED.value
        expense.approved_at = datetime.utcnow()
    else:
        expense.current_approval_level += 1
        expense.status = ExpenseStatus.PENDING.value
    
    # Create audit log
    create_audit_log(
        db, expense.id, current_user.id, "approved",
        new_values={"status": expense.status, "level": expense.current_approval_level}
    )
    
    db.commit()
    db.refresh(expense)
    return expense


@router.post("/{expense_id}/reject", response_model=ExpenseResponse)
def reject_expense(
    expense_id: str,
    rejection: ExpenseRejectAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reject an expense with reason (managers only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    old_status = expense.status
    expense.status = ExpenseStatus.REJECTED.value
    expense.rejection_reason = rejection.reason
    expense.rejected_at = datetime.utcnow()
    
    # Create approval record
    approval = ExpenseApproval(
        expense_id=expense.id,
        approver_id=current_user.id,
        level=expense.current_approval_level,
        status=ApprovalStatus.REJECTED.value,
        decision_at=datetime.utcnow(),
        comments=rejection.comments or rejection.reason
    )
    db.add(approval)
    
    reject_audit = create_audit_log(
        db=db,
        expense_id=expense.id,
        user_id=current_user.id,
        action="rejected",
        new_values={"status": ExpenseStatus.REJECTED.value, "rejection_reason": rejection.reason}
    )
    db.add(reject_audit)
    
    db.commit()
    db.refresh(expense)
    
    # Notify the user
    NotificationService.notify_expense_status(
        db=db,
        user_id=expense.user_id,
        expense_title=expense.description or "Expense",
        status="rejected",
        expense_id=expense.id
    )
    
    return expense


@router.post("/{expense_id}/return", response_model=ExpenseResponse)
def return_expense(
    expense_id: str,
    return_data: ExpenseReturnAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Return an expense for revision (managers only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    old_status = expense.status
    expense.status = ExpenseStatus.RETURNED.value
    expense.return_reason = return_data.reason
    
    # Create audit log
    create_audit_log(
        db, expense.id, current_user.id, "returned",
        old_values={"status": old_status},
        new_values={"status": expense.status, "reason": return_data.reason}
    )
    
    db.commit()
    db.refresh(expense)
    return expense


@router.post("/{expense_id}/mark-paid", response_model=ExpenseResponse)
def mark_expense_paid(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark an approved expense as paid (managers only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.status != ExpenseStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="Only approved expenses can be marked as paid")
    
    old_status = expense.status
    expense.status = ExpenseStatus.PAID.value
    expense.paid_at = datetime.utcnow()
    
    # Create audit log
    create_audit_log(
        db, expense.id, current_user.id, "paid",
        old_values={"status": old_status},
        new_values={"status": expense.status}
    )
    
    db.commit()
    db.refresh(expense)
    return expense


@router.post("/{expense_id}/upload-receipt")
async def upload_receipt(
    expense_id: str,
    file: UploadFile = File(...),
    item_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a receipt for an expense item."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Save the file
    file_path = await save_receipt(file, expense_id, item_id)
    
    # Update expense item if specified
    if item_id:
        item = db.query(ExpenseItem).filter(
            ExpenseItem.id == item_id,
            ExpenseItem.expense_id == expense_id
        ).first()
        if item:
            item.receipt_path = file_path
            db.commit()
    
    return {"message": "Receipt uploaded successfully", "path": file_path}


@router.get("/{expense_id}/approvals", response_model=List[ExpenseApprovalResponse])
def get_expense_approvals(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get approval history for an expense."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if current_user.role not in ["admin", "manager"] and expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    approvals = db.query(ExpenseApproval).filter(
        ExpenseApproval.expense_id == expense_id
    ).order_by(ExpenseApproval.level).all()
    
    result = []
    for approval in approvals:
        approver = db.query(User).filter(User.id == approval.approver_id).first()
        result.append(ExpenseApprovalResponse(
            id=approval.id,
            expense_id=approval.expense_id,
            approver_id=approval.approver_id,
            approver_name=approver.full_name if approver else None,
            level=approval.level,
            status=approval.status,
            decision_at=approval.decision_at,
            comments=approval.comments,
            created_at=approval.created_at
        ))
    
    return result


@router.get("/{expense_id}/audit-log", response_model=List[ExpenseAuditLogResponse])
def get_expense_audit_log(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get audit log for an expense."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if current_user.role not in ["admin", "manager"] and expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    logs = db.query(ExpenseAuditLog).filter(
        ExpenseAuditLog.expense_id == expense_id
    ).order_by(ExpenseAuditLog.created_at.desc()).all()
    
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


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an expense (draft only)."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if expense.status != ExpenseStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Can only delete draft expenses")
    
    db.delete(expense)
    db.commit()
    return None
