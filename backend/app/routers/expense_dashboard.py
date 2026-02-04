"""Expense Dashboard Router - Analytics and KPIs for expenses."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import (
    ExpenseStats, MonthlyTrend, CategoryBreakdown, DepartmentBreakdown,
    ProjectBreakdown, BudgetComparison, ExpenseAnalyticsResponse, ExpenseDashboardStats
)
from app.utils import get_current_active_user
from app.services.expense_analytics import (
    get_expense_stats, get_monthly_trends, get_expenses_by_category,
    get_expenses_by_department, get_expenses_by_project, get_budget_comparison
)

router = APIRouter()


@router.get("/stats", response_model=ExpenseDashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get expense dashboard statistics for the current user."""
    # Get user's own stats
    user_stats = get_expense_stats(db, user_id=current_user.id)
    
    # Get pending approval stats for managers
    pending_approval_stats = {}
    if current_user.role in ["admin", "manager"]:
        pending_approval_stats = get_expense_stats(db)
    
    return ExpenseDashboardStats(
        total_expenses=user_stats.get("total_amount", 0),
        pending_count=pending_approval_stats.get("pending_count", 0) if current_user.role in ["admin", "manager"] else 0,
        approved_this_month=user_stats.get("approved_count", 0),
        pending_approval_amount=pending_approval_stats.get("total_amount", 0) if current_user.role in ["admin", "manager"] else 0,
        my_expenses_count=user_stats.get("total_count", 0),
        my_pending_count=user_stats.get("pending_count", 0) + user_stats.get("submitted_count", 0)
    )


@router.get("/analytics", response_model=ExpenseAnalyticsResponse)
def get_expense_analytics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive expense analytics."""
    # Determine scope based on role
    user_id = None if current_user.role in ["admin", "manager"] else current_user.id
    department_id = current_user.department_id if current_user.role == "manager" else None
    
    stats_data = get_expense_stats(
        db, 
        user_id=user_id, 
        department_id=department_id,
        start_date=start_date, 
        end_date=end_date
    )
    
    monthly_trends_data = get_monthly_trends(
        db, 
        year=year, 
        user_id=user_id,
        department_id=department_id
    )
    
    by_category_data = get_expenses_by_category(
        db, 
        start_date=start_date, 
        end_date=end_date,
        user_id=user_id
    )
    
    by_department_data = get_expenses_by_department(
        db, 
        start_date=start_date, 
        end_date=end_date
    ) if current_user.role in ["admin", "manager"] else []
    
    by_project_data = get_expenses_by_project(
        db, 
        start_date=start_date, 
        end_date=end_date,
        user_id=user_id
    )
    
    budget_data = get_budget_comparison(db) if current_user.role in ["admin", "manager"] else []
    
    return ExpenseAnalyticsResponse(
        stats=ExpenseStats(**stats_data),
        monthly_trends=[MonthlyTrend(**t) for t in monthly_trends_data],
        by_category=[CategoryBreakdown(**c) for c in by_category_data],
        by_department=[DepartmentBreakdown(**d) for d in by_department_data],
        by_project=[ProjectBreakdown(**p) for p in by_project_data],
        budget_comparison=[BudgetComparison(**b) for b in budget_data]
    )


@router.get("/monthly-trends")
def get_monthly_expense_trends(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get monthly expense trends."""
    user_id = None if current_user.role in ["admin", "manager"] else current_user.id
    trends = get_monthly_trends(db, year=year, user_id=user_id)
    return {"trends": trends}


@router.get("/by-category")
def get_category_breakdown(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get expense breakdown by category."""
    user_id = None if current_user.role in ["admin", "manager"] else current_user.id
    breakdown = get_expenses_by_category(db, start_date=start_date, end_date=end_date, user_id=user_id)
    return {"categories": breakdown}


@router.get("/by-department")
def get_department_breakdown(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get expense breakdown by department (managers only)."""
    if current_user.role not in ["admin", "manager"]:
        return {"departments": []}
    
    breakdown = get_expenses_by_department(db, start_date=start_date, end_date=end_date)
    return {"departments": breakdown}


@router.get("/by-project")
def get_project_breakdown(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get expense breakdown by project."""
    user_id = None if current_user.role in ["admin", "manager"] else current_user.id
    breakdown = get_expenses_by_project(db, start_date=start_date, end_date=end_date, user_id=user_id)
    return {"projects": breakdown}


@router.get("/budget-comparison")
def get_budget_vs_actual(
    period: str = Query("monthly", regex="^(monthly|quarterly|yearly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get budget vs actual comparison for cost centers."""
    if current_user.role not in ["admin", "manager"]:
        return {"comparisons": []}
    
    comparison = get_budget_comparison(db, period=period)
    return {"comparisons": comparison}
