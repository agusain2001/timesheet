/**
 * API Type Definitions
 * Matches backend Pydantic schemas
 */

// =============== User Types ===============
export interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    department_id?: string;
    position?: string;
    avatar_url?: string;
    is_active: boolean;
    created_at: string;
}

export interface UserCreate {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    department_id?: string;
    position?: string;
    avatar_url?: string;
}

export interface UserUpdate {
    full_name?: string;
    role?: string;
    department_id?: string;
    position?: string;
    avatar_url?: string;
    is_active?: boolean;
}

export interface UserBrief {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
}

// =============== Client Types ===============
export interface Client {
    id: string;
    name: string;
    alias?: string;
    region?: string;
    business_sector?: string;
    /** @deprecated Use business_sector instead */
    sector?: string;
    address?: string;
    contact_numbers?: string[];
    contacts?: string;
    notes?: string;
}

export interface ClientCreate {
    name: string;
    alias?: string;
    region?: string;
    business_sector?: string;
    address?: string;
    contact_numbers?: string[];
    contacts?: string;
    notes?: string;
}

export interface ClientUpdate {
    name?: string;
    alias?: string;
    region?: string;
    business_sector?: string;
    address?: string;
    contact_numbers?: string[];
    contacts?: string;
    notes?: string;
}

// =============== Department Types ===============
export interface DepartmentManager {
    id: string;
    employee_id: string;
    employee_name?: string;
    is_primary: boolean;
    start_date?: string;
    end_date?: string;
}

export interface DepartmentManagerInput {
    employee_id: string;
    is_primary?: boolean;
    start_date?: string;
    end_date?: string;
}

export interface Department {
    id: string;
    name: string;
    notes?: string;
    managers: DepartmentManager[];
}

export interface DepartmentCreate {
    name: string;
    notes?: string;
    managers?: DepartmentManagerInput[];
}

export interface DepartmentUpdate {
    name?: string;
    notes?: string;
    managers?: DepartmentManagerInput[];
}

// =============== Project Types ===============
export interface ProjectManager {
    id: string;
    employee_id: string;
    employee_name?: string;
    role: string;
    start_date?: string;
    end_date?: string;
}

export interface ProjectManagerInput {
    employee_id: string;
    role?: string;
    start_date?: string;
    end_date?: string;
}

export interface Project {
    id: string;
    name: string;
    client_id?: string;
    department_id?: string;
    start_date?: string;
    end_date?: string;
    status: string;
    contacts?: string;
    notes?: string;
    created_at: string;
    managers: ProjectManager[];
}

export interface ProjectCreate {
    name: string;
    client_id?: string;
    department_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    contacts?: string;
    notes?: string;
    managers?: ProjectManagerInput[];
}

export interface ProjectUpdate {
    name?: string;
    client_id?: string;
    department_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    contacts?: string;
    notes?: string;
    managers?: ProjectManagerInput[];
}

// =============== Task Types ===============
export interface ProjectBrief {
    id: string;
    name: string;
    client_id?: string;
    status: string;
}

export interface ClientBrief {
    id: string;
    name: string;
    alias?: string;
}

export interface Task {
    id: string;
    name: string;
    description?: string;
    task_type: string;
    project_id?: string;
    department_id?: string;
    assignee_id?: string;
    priority: string;
    estimated_hours?: number;
    due_date?: string;
    status: string;
    created_at: string;
    completed_at?: string;
    project?: ProjectBrief;
    client?: ClientBrief;
    assignee?: UserBrief;
}

export interface TaskCreate {
    name: string;
    description?: string;
    task_type?: string;
    project_id?: string;
    department_id?: string;
    assignee_id?: string;
    priority?: string;
    estimated_hours?: number;
    due_date?: string;
}

export interface TaskUpdate {
    name?: string;
    description?: string;
    task_type?: string;
    project_id?: string;
    department_id?: string;
    assignee_id?: string;
    priority?: string;
    estimated_hours?: number;
    status?: string;
    due_date?: string;
}

// =============== Timesheet Types ===============
export interface TimeEntry {
    id: string;
    timesheet_id: string;
    project_id?: string;
    task_id?: string;
    day: string;
    hours: number;
    notes?: string;
}

export interface TimeEntryCreate {
    project_id?: string;
    task_id?: string;
    day: string;
    hours: number;
    notes?: string;
}

export interface Timesheet {
    id: string;
    user_id: string;
    week_starting: string;
    achievement?: string;
    status: string;
    total_hours: number;
    created_at: string;
    entries: TimeEntry[];
}

export interface TimesheetCreate {
    week_starting: string;
    achievement?: string;
    entries?: TimeEntryCreate[];
}

export interface TimesheetUpdate {
    achievement?: string;
    status?: string;
    entries?: TimeEntryCreate[];
}

// =============== Expense Types ===============
export interface ExpenseItem {
    id: string;
    expense_id: string;
    date: string;
    expense_type: string;
    category_id?: string;
    amount: number;
    currency: string;
    currency_rate: number;
    description?: string;
    vendor?: string;
    attachment_url?: string;
    receipt_path?: string;
    ocr_data?: Record<string, unknown>;
    created_at: string;
}

export interface ExpenseItemCreate {
    date: string;
    expense_type?: string;
    category_id?: string;
    amount: number;
    currency?: string;
    currency_rate?: number;
    description?: string;
    vendor?: string;
    attachment_url?: string;
}

export interface Expense {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    project_id?: string;
    cost_center_id?: string;
    currency: string;
    vendor?: string;
    payment_method: string;
    total_amount: number;
    status: string;
    rejection_reason?: string;
    return_reason?: string;
    current_approval_level: number;
    required_approval_levels: number;
    created_at: string;
    submitted_at?: string;
    approved_at?: string;
    rejected_at?: string;
    paid_at?: string;
    items: ExpenseItem[];
    user?: UserBrief;
}

export interface ExpenseCreate {
    title: string;
    description?: string;
    project_id?: string;
    cost_center_id?: string;
    currency?: string;
    vendor?: string;
    payment_method?: string;
    items?: ExpenseItemCreate[];
}

export interface ExpenseUpdate {
    title?: string;
    description?: string;
    project_id?: string;
    cost_center_id?: string;
    currency?: string;
    vendor?: string;
    payment_method?: string;
    status?: string;
    items?: ExpenseItemCreate[];
}

// =============== Cost Center Types ===============
export interface CostCenter {
    id: string;
    name: string;
    code: string;
    description?: string;
    department_id?: string;
    budget_amount: number;
    budget_period: string;
    is_active: boolean;
    created_at: string;
}

export interface CostCenterCreate {
    name: string;
    code: string;
    description?: string;
    department_id?: string;
    budget_amount?: number;
    budget_period?: string;
}

export interface CostCenterUpdate {
    name?: string;
    code?: string;
    description?: string;
    department_id?: string;
    budget_amount?: number;
    budget_period?: string;
    is_active?: boolean;
}

// =============== Support Types ===============
export interface SupportRequest {
    id: string;
    user_id: string;
    message: string;
    status: string;
    created_at: string;
    resolved_at?: string;
}

export interface SupportRequestCreate {
    message: string;
}

// =============== Dashboard Types ===============
export interface DashboardStats {
    total_tasks: number;
    completed_today: number;
    overdue_tasks: number;
    total_hours_this_week: number;
    avg_daily_tasks: number;
    current_streak: number;
    managed_employees: number;
    total_assigned: number;
    avg_workload: number;
    departments: number;
}

export interface ExpenseDashboardStats {
    total_expenses: number;
    pending_count: number;
    approved_this_month: number;
    pending_approval_amount: number;
    my_expenses_count: number;
    my_pending_count: number;
}

// =============== Notification Types ===============
export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    link?: string;
    created_at: string;
}

// =============== Chatbot Types ===============
export interface ChatMessage {
    message: string;
}

export interface ChatResponse {
    response: string;
    context_used?: string;
}
