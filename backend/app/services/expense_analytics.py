"""Expense analytics service for dashboard and reports."""
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from decimal import Decimal
from sqlalchemy import func, extract, case
from sqlalchemy.orm import Session
from app.models import Expense, ExpenseItem, ExpenseStatus, User, Department, Project, CostCenter


def get_expense_stats(
    db: Session,
    user_id: Optional[str] = None,
    department_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    """Get overall expense statistics."""
    query = db.query(Expense)
    
    if user_id:
        query = query.filter(Expense.user_id == user_id)
    if department_id:
        query = query.join(User).filter(User.department_id == department_id)
    if start_date:
        query = query.filter(Expense.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Expense.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    expenses = query.all()
    
    # Calculate statistics
    total_amount = sum(float(e.total_amount or 0) for e in expenses)
    total_count = len(expenses)
    
    status_counts = {}
    for status in ExpenseStatus:
        status_counts[status.value] = len([e for e in expenses if e.status == status.value])
    
    # Calculate average approval time
    approved_expenses = [e for e in expenses if e.approved_at and e.submitted_at]
    if approved_expenses:
        total_hours = sum(
            (e.approved_at - e.submitted_at).total_seconds() / 3600 
            for e in approved_expenses
        )
        avg_approval_time = total_hours / len(approved_expenses)
    else:
        avg_approval_time = None
    
    return {
        "total_amount": total_amount,
        "total_count": total_count,
        "draft_count": status_counts.get("draft", 0),
        "submitted_count": status_counts.get("submitted", 0),
        "pending_count": status_counts.get("pending", 0),
        "approved_count": status_counts.get("approved", 0),
        "rejected_count": status_counts.get("rejected", 0),
        "paid_count": status_counts.get("paid", 0),
        "avg_expense_amount": total_amount / total_count if total_count > 0 else 0,
        "avg_approval_time_hours": avg_approval_time
    }


def get_monthly_trends(
    db: Session,
    year: int = None,
    user_id: Optional[str] = None,
    department_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get monthly expense trends."""
    if not year:
        year = datetime.now().year
    
    query = db.query(
        extract('month', Expense.created_at).label('month'),
        func.sum(Expense.total_amount).label('total'),
        func.count(Expense.id).label('count'),
        func.sum(case((Expense.status == 'approved', Expense.total_amount), else_=0)).label('approved'),
        func.sum(case((Expense.status == 'rejected', Expense.total_amount), else_=0)).label('rejected')
    ).filter(
        extract('year', Expense.created_at) == year
    )
    
    if user_id:
        query = query.filter(Expense.user_id == user_id)
    if department_id:
        query = query.join(User).filter(User.department_id == department_id)
    
    results = query.group_by(extract('month', Expense.created_at)).all()
    
    trends = []
    for r in results:
        trends.append({
            "month": f"{year}-{int(r.month):02d}",
            "total_amount": float(r.total or 0),
            "count": r.count,
            "approved_amount": float(r.approved or 0),
            "rejected_amount": float(r.rejected or 0)
        })
    
    return sorted(trends, key=lambda x: x["month"])


def get_expenses_by_category(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get expense breakdown by category/type."""
    query = db.query(
        ExpenseItem.expense_type,
        func.sum(ExpenseItem.amount * ExpenseItem.currency_rate).label('total'),
        func.count(ExpenseItem.id).label('count')
    ).join(Expense)
    
    if user_id:
        query = query.filter(Expense.user_id == user_id)
    if start_date:
        query = query.filter(ExpenseItem.date >= start_date)
    if end_date:
        query = query.filter(ExpenseItem.date <= end_date)
    
    results = query.group_by(ExpenseItem.expense_type).all()
    
    total = sum(float(r.total or 0) for r in results)
    
    breakdown = []
    for r in results:
        amount = float(r.total or 0)
        breakdown.append({
            "category": r.expense_type or "other",
            "category_id": None,
            "total_amount": amount,
            "count": r.count,
            "percentage": (amount / total * 100) if total > 0 else 0
        })
    
    return sorted(breakdown, key=lambda x: x["total_amount"], reverse=True)


def get_expenses_by_department(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[Dict[str, Any]]:
    """Get expense breakdown by department."""
    query = db.query(
        Department.id,
        Department.name,
        func.sum(Expense.total_amount).label('total'),
        func.count(Expense.id).label('count')
    ).join(User, User.id == Expense.user_id).join(
        Department, Department.id == User.department_id
    )
    
    if start_date:
        query = query.filter(Expense.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Expense.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    results = query.group_by(Department.id, Department.name).all()
    
    total = sum(float(r.total or 0) for r in results)
    
    breakdown = []
    for r in results:
        amount = float(r.total or 0)
        breakdown.append({
            "department_id": r.id,
            "department_name": r.name,
            "total_amount": amount,
            "count": r.count,
            "percentage": (amount / total * 100) if total > 0 else 0
        })
    
    return sorted(breakdown, key=lambda x: x["total_amount"], reverse=True)


def get_expenses_by_project(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get expense breakdown by project."""
    query = db.query(
        Project.id,
        Project.name,
        func.sum(Expense.total_amount).label('total'),
        func.count(Expense.id).label('count')
    ).join(Project, Project.id == Expense.project_id)
    
    if user_id:
        query = query.filter(Expense.user_id == user_id)
    if start_date:
        query = query.filter(Expense.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Expense.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    results = query.group_by(Project.id, Project.name).all()
    
    total = sum(float(r.total or 0) for r in results)
    
    breakdown = []
    for r in results:
        amount = float(r.total or 0)
        breakdown.append({
            "project_id": r.id,
            "project_name": r.name,
            "total_amount": amount,
            "count": r.count,
            "percentage": (amount / total * 100) if total > 0 else 0
        })
    
    return sorted(breakdown, key=lambda x: x["total_amount"], reverse=True)


def get_budget_comparison(
    db: Session,
    period: str = "monthly"
) -> List[Dict[str, Any]]:
    """Get budget vs actual comparison for cost centers."""
    cost_centers = db.query(CostCenter).filter(CostCenter.is_active == True).all()
    
    # Get current period dates
    today = date.today()
    if period == "monthly":
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    elif period == "quarterly":
        quarter = (today.month - 1) // 3
        start = today.replace(month=quarter * 3 + 1, day=1)
        end_month = quarter * 3 + 3
        if end_month > 12:
            end = today.replace(year=today.year + 1, month=end_month - 12, day=1) - timedelta(days=1)
        else:
            end = today.replace(month=end_month + 1, day=1) - timedelta(days=1)
    else:  # yearly
        start = today.replace(month=1, day=1)
        end = today.replace(month=12, day=31)
    
    comparisons = []
    for cc in cost_centers:
        # Get actual expenses for this cost center in the period
        actual = db.query(func.sum(Expense.total_amount)).filter(
            Expense.cost_center_id == cc.id,
            Expense.status.in_(['approved', 'paid']),
            Expense.created_at >= datetime.combine(start, datetime.min.time()),
            Expense.created_at <= datetime.combine(end, datetime.max.time())
        ).scalar() or 0
        
        budget = float(cc.budget_amount or 0)
        actual = float(actual)
        variance = budget - actual
        variance_pct = (variance / budget * 100) if budget > 0 else 0
        
        comparisons.append({
            "cost_center_id": cc.id,
            "cost_center_name": cc.name,
            "budget_amount": budget,
            "actual_amount": actual,
            "variance": variance,
            "variance_percentage": variance_pct,
            "period": period
        })
    
    return comparisons
