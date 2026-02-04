from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr


# =============== User Schemas ===============
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "employee"
    department_id: Optional[str] = None
    position: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[str] = None
    position: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserBrief(BaseModel):
    """Brief user info for embedded responses."""
    id: str
    full_name: str
    email: str
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True


# =============== Auth Schemas ===============
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# =============== Client Schemas ===============
class ContactInfo(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    type: Optional[str] = None
    isPrimary: bool = False

class ClientBase(BaseModel):
    name: str
    alias: Optional[str] = None
    region: Optional[str] = None
    business_sector: Optional[str] = None
    address: Optional[str] = None
    contact_numbers: Optional[List[str]] = None
    contacts: Optional[str] = None
    notes: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    alias: Optional[str] = None
    region: Optional[str] = None
    business_sector: Optional[str] = None
    address: Optional[str] = None
    contact_numbers: Optional[List[str]] = None
    contacts: Optional[str] = None
    notes: Optional[str] = None

class ClientResponse(ClientBase):
    id: str
    
    class Config:
        from_attributes = True


# =============== Department Schemas ===============
class DepartmentManagerInput(BaseModel):
    employee_id: str
    is_primary: bool = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class DepartmentManagerResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    is_primary: bool = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    class Config:
        from_attributes = True

class DepartmentBase(BaseModel):
    name: str
    notes: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    managers: Optional[List[DepartmentManagerInput]] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    managers: Optional[List[DepartmentManagerInput]] = None

class DepartmentResponse(DepartmentBase):
    id: str
    managers: List[DepartmentManagerResponse] = []
    
    class Config:
        from_attributes = True


# =============== Project Schemas ===============
class ProjectManagerInput(BaseModel):
    employee_id: str
    role: str = "manager"
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ProjectManagerResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    role: str = "manager"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    class Config:
        from_attributes = True

class ProjectContactInput(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    type: Optional[str] = None
    isPrimary: bool = False

class ProjectBase(BaseModel):
    name: str
    client_id: Optional[str] = None
    department_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = "active"
    contacts: Optional[str] = None
    notes: Optional[str] = None

class ProjectCreate(ProjectBase):
    managers: Optional[List[ProjectManagerInput]] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_id: Optional[str] = None
    department_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    contacts: Optional[str] = None
    notes: Optional[str] = None
    managers: Optional[List[ProjectManagerInput]] = None

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    managers: List[ProjectManagerResponse] = []
    
    class Config:
        from_attributes = True


# =============== Task Schemas ===============
class ProjectBrief(BaseModel):
    """Brief project info for embedded responses."""
    id: str
    name: str
    client_id: Optional[str] = None
    status: str = "active"
    
    class Config:
        from_attributes = True

class ClientBrief(BaseModel):
    """Brief client info for embedded responses."""
    id: str
    name: str
    alias: Optional[str] = None
    
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: str = "personal"
    project_id: Optional[str] = None
    department_id: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: str = "medium"
    estimated_hours: Optional[float] = None
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    project_id: Optional[str] = None
    department_id: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[str] = None
    estimated_hours: Optional[float] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None

class TaskResponse(TaskBase):
    id: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    project: Optional[ProjectBrief] = None
    client: Optional[ClientBrief] = None
    assignee: Optional[UserBrief] = None
    
    class Config:
        from_attributes = True


# =============== Timesheet Schemas ===============
class TimeEntryBase(BaseModel):
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    day: date
    hours: float = 0.0
    notes: Optional[str] = None

class TimeEntryCreate(TimeEntryBase):
    pass

class TimeEntryResponse(TimeEntryBase):
    id: str
    timesheet_id: str
    
    class Config:
        from_attributes = True

class TimesheetBase(BaseModel):
    week_starting: date
    achievement: Optional[str] = None

class TimesheetCreate(TimesheetBase):
    entries: Optional[List[TimeEntryCreate]] = None

class TimesheetUpdate(BaseModel):
    achievement: Optional[str] = None
    status: Optional[str] = None
    entries: Optional[List[TimeEntryCreate]] = None

class TimesheetResponse(TimesheetBase):
    id: str
    user_id: str
    status: str
    total_hours: float
    created_at: datetime
    entries: List[TimeEntryResponse] = []
    
    class Config:
        from_attributes = True


# =============== Cost Center Schemas ===============
class CostCenterBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    department_id: Optional[str] = None
    budget_amount: float = 0.0
    budget_period: str = "monthly"

class CostCenterCreate(CostCenterBase):
    pass

class CostCenterUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[str] = None
    budget_amount: Optional[float] = None
    budget_period: Optional[str] = None
    is_active: Optional[bool] = None

class CostCenterResponse(CostCenterBase):
    id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============== Expense Category Schemas ===============
class ExpenseCategoryBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    default_budget: Optional[float] = None
    requires_receipt: bool = False

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    default_budget: Optional[float] = None
    requires_receipt: Optional[bool] = None
    is_active: Optional[bool] = None

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============== Expense Item Schemas ===============
class ExpenseItemBase(BaseModel):
    date: date
    expense_type: str = "other"
    category_id: Optional[str] = None
    amount: float
    currency: str = "EGP"
    currency_rate: float = 1.0
    description: Optional[str] = None
    vendor: Optional[str] = None
    attachment_url: Optional[str] = None

class ExpenseItemCreate(ExpenseItemBase):
    pass

class ExpenseItemUpdate(BaseModel):
    date: Optional[date] = None
    expense_type: Optional[str] = None
    category_id: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    currency_rate: Optional[float] = None
    description: Optional[str] = None
    vendor: Optional[str] = None
    attachment_url: Optional[str] = None

class ExpenseItemResponse(ExpenseItemBase):
    id: str
    expense_id: str
    receipt_path: Optional[str] = None
    ocr_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============== Expense Schemas ===============
class ExpenseBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    cost_center_id: Optional[str] = None
    currency: str = "EGP"
    vendor: Optional[str] = None
    payment_method: str = "cash"

class ExpenseCreate(ExpenseBase):
    items: Optional[List[ExpenseItemCreate]] = None

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    cost_center_id: Optional[str] = None
    currency: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    items: Optional[List[ExpenseItemCreate]] = None

class ExpenseResponse(ExpenseBase):
    id: str
    user_id: str
    total_amount: float
    status: str
    rejection_reason: Optional[str] = None
    return_reason: Optional[str] = None
    current_approval_level: int = 0
    required_approval_levels: int = 1
    created_at: datetime
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    items: List[ExpenseItemResponse] = []
    user: Optional[UserBrief] = None
    
    class Config:
        from_attributes = True


# =============== Expense Approval Schemas ===============
class ExpenseApprovalAction(BaseModel):
    """Request body for approval actions."""
    comments: Optional[str] = None

class ExpenseRejectAction(BaseModel):
    """Request body for rejection."""
    reason: str
    comments: Optional[str] = None

class ExpenseReturnAction(BaseModel):
    """Request body for return for revision."""
    reason: str
    comments: Optional[str] = None

class ExpenseApprovalResponse(BaseModel):
    id: str
    expense_id: str
    approver_id: str
    approver_name: Optional[str] = None
    level: int
    status: str
    decision_at: Optional[datetime] = None
    comments: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============== Expense Audit Log Schemas ===============
class ExpenseAuditLogResponse(BaseModel):
    id: str
    expense_id: str
    user_id: str
    user_name: Optional[str] = None
    action: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============== Approval Rule Schemas ===============
class ApprovalRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    category: Optional[str] = None
    department_id: Optional[str] = None
    required_levels: int = 1
    auto_approve: bool = False
    priority: int = 0

class ApprovalRuleCreate(ApprovalRuleBase):
    pass

class ApprovalRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    category: Optional[str] = None
    department_id: Optional[str] = None
    required_levels: Optional[int] = None
    auto_approve: Optional[bool] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

class ApprovalRuleResponse(ApprovalRuleBase):
    id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============== Expense Analytics Schemas ===============
class ExpenseStats(BaseModel):
    """Overall expense statistics."""
    total_amount: float = 0.0
    total_count: int = 0
    draft_count: int = 0
    submitted_count: int = 0
    pending_count: int = 0
    approved_count: int = 0
    rejected_count: int = 0
    paid_count: int = 0
    avg_expense_amount: float = 0.0
    avg_approval_time_hours: Optional[float] = None

class MonthlyTrend(BaseModel):
    """Monthly expense trend data."""
    month: str  # YYYY-MM format
    total_amount: float
    count: int
    approved_amount: float
    rejected_amount: float

class CategoryBreakdown(BaseModel):
    """Expense breakdown by category."""
    category: str
    category_id: Optional[str] = None
    total_amount: float
    count: int
    percentage: float

class DepartmentBreakdown(BaseModel):
    """Expense breakdown by department."""
    department_id: Optional[str] = None
    department_name: str
    total_amount: float
    count: int
    percentage: float

class ProjectBreakdown(BaseModel):
    """Expense breakdown by project."""
    project_id: Optional[str] = None
    project_name: str
    total_amount: float
    count: int
    percentage: float

class BudgetComparison(BaseModel):
    """Budget vs actual comparison."""
    cost_center_id: str
    cost_center_name: str
    budget_amount: float
    actual_amount: float
    variance: float
    variance_percentage: float
    period: str

class ExpenseAnalyticsResponse(BaseModel):
    """Complete expense analytics response."""
    stats: ExpenseStats
    monthly_trends: List[MonthlyTrend] = []
    by_category: List[CategoryBreakdown] = []
    by_department: List[DepartmentBreakdown] = []
    by_project: List[ProjectBreakdown] = []
    budget_comparison: List[BudgetComparison] = []


# =============== Expense Reports Schemas ===============
class ExpenseReportFilter(BaseModel):
    """Filters for expense reports."""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    user_id: Optional[str] = None
    department_id: Optional[str] = None
    project_id: Optional[str] = None
    cost_center_id: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None

class ExpenseReportItem(BaseModel):
    """Single item in expense report."""
    expense_id: str
    expense_title: str
    user_name: str
    department_name: Optional[str] = None
    project_name: Optional[str] = None
    cost_center_name: Optional[str] = None
    total_amount: float
    currency: str
    status: str
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None

class ExpenseReportSummary(BaseModel):
    """Summary section in reports."""
    total_amount: float
    total_count: int
    by_status: Dict[str, float] = {}
    by_category: Dict[str, float] = {}
    date_range: str

class TaxReportItem(BaseModel):
    """Tax report line item."""
    expense_id: str
    date: date
    vendor: Optional[str] = None
    description: Optional[str] = None
    amount: float
    tax_amount: float = 0.0
    category: str
    receipt_available: bool = False

class ExpenseReportResponse(BaseModel):
    """Complete expense report response."""
    generated_at: datetime
    filter_applied: ExpenseReportFilter
    summary: ExpenseReportSummary
    items: List[ExpenseReportItem] = []


# =============== Support Schemas ===============
class SupportRequestBase(BaseModel):
    message: str

class SupportRequestCreate(SupportRequestBase):
    pass

class SupportRequestUpdate(BaseModel):
    message: Optional[str] = None
    status: Optional[str] = None

class SupportRequestResponse(SupportRequestBase):
    id: str
    user_id: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# =============== Dashboard Schemas ===============
class DashboardStats(BaseModel):
    total_tasks: int
    completed_today: int
    overdue_tasks: int
    total_hours_this_week: float
    avg_daily_tasks: float
    current_streak: int
    managed_employees: int = 0
    total_assigned: int = 0
    avg_workload: float = 0.0
    departments: int = 0

class ExpenseDashboardStats(BaseModel):
    """Dashboard statistics for expenses."""
    total_expenses: float = 0.0
    pending_count: int = 0
    approved_this_month: float = 0.0
    pending_approval_amount: float = 0.0
    my_expenses_count: int = 0
    my_pending_count: int = 0


# =============== Chatbot Schemas ===============
class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    context_used: Optional[str] = None
