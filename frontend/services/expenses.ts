/**
 * Expenses API Service - Complete expense management operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// ============================================
// Types
// ============================================

export type ExpenseStatus = "draft" | "submitted" | "pending" | "approved" | "rejected" | "returned" | "paid";
export type ExpenseType = "meal" | "transport" | "accommodation" | "supplies" | "communication" | "entertainment" | "travel" | "software" | "equipment" | "other";
export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "bank_transfer" | "company_card" | "petty_cash" | "other";

export interface ExpenseItem {
    id: string;
    expense_id: string;
    date: string;
    expense_type: ExpenseType;
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
    updated_at: string;
}

export interface ExpenseApproval {
    id: string;
    expense_id: string;
    approver_id: string;
    approver_name?: string;
    level: number;
    status: "pending" | "approved" | "rejected";
    decision_at?: string;
    comments?: string;
    created_at: string;
}

export interface ExpenseAuditLog {
    id: string;
    expense_id: string;
    user_id: string;
    user_name?: string;
    action: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    created_at: string;
}

export interface Expense {
    id: string;
    user_id: string;
    user_name?: string;
    title: string;
    description?: string;
    project_id?: string;
    project_name?: string;
    cost_center_id?: string;
    cost_center_name?: string;
    total_amount: number;
    currency: string;
    vendor?: string;
    payment_method: PaymentMethod;
    status: ExpenseStatus;
    rejection_reason?: string;
    return_reason?: string;
    current_approval_level: number;
    required_approval_levels: number;
    created_at: string;
    updated_at: string;
    submitted_at?: string;
    approved_at?: string;
    rejected_at?: string;
    paid_at?: string;
    items?: ExpenseItem[];
    approvals?: ExpenseApproval[];
}

export interface ExpenseCreate {
    title: string;
    description?: string;
    project_id?: string;
    cost_center_id?: string;
    currency?: string;
    vendor?: string;
    payment_method?: PaymentMethod;
    items?: ExpenseItemCreate[];
}

export interface ExpenseUpdate {
    title?: string;
    description?: string;
    project_id?: string;
    cost_center_id?: string;
    currency?: string;
    vendor?: string;
    payment_method?: PaymentMethod;
}

export interface ExpenseItemCreate {
    date: string;
    expense_type?: ExpenseType;
    category_id?: string;
    amount: number;
    currency?: string;
    description?: string;
    vendor?: string;
}

// Dashboard types
export interface ExpenseDashboardStats {
    total_expenses: number;
    pending_count: number;
    approved_this_month: number;
    pending_approval_amount: number;
    my_expenses_count: number;
    my_pending_count: number;
}

export interface MonthlyTrend {
    month: string;
    year: number;
    amount: number;
    count: number;
}

export interface CategoryBreakdown {
    category: string;
    amount: number;
    count: number;
    percentage: number;
}

export interface DepartmentBreakdown {
    department: string;
    amount: number;
    count: number;
}

export interface ProjectBreakdown {
    project: string;
    project_id: string;
    amount: number;
    count: number;
}

export interface BudgetComparison {
    cost_center: string;
    budget: number;
    actual: number;
    variance: number;
    variance_percentage: number;
}

export interface ExpenseAnalytics {
    stats: {
        total_amount: number;
        total_count: number;
        pending_count: number;
        approved_count: number;
        rejected_count: number;
        average_amount: number;
    };
    monthly_trends: MonthlyTrend[];
    by_category: CategoryBreakdown[];
    by_department: DepartmentBreakdown[];
    by_project: ProjectBreakdown[];
    budget_comparison: BudgetComparison[];
}

export interface ExpenseCategory {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
}

export interface CostCenter {
    id: string;
    name: string;
    code: string;
    budget?: number;
}

// ============================================
// API Params
// ============================================

export interface ExpensesParams {
    skip?: number;
    limit?: number;
    status?: ExpenseStatus;
    project_id?: string;
    cost_center_id?: string;
    start_date?: string;
    end_date?: string;
    [key: string]: string | number | boolean | undefined;
}

// ============================================
// Expense CRUD API
// ============================================

const BASE_URL = "/expenses";

export async function getExpenses(params?: ExpensesParams): Promise<Expense[]> {
    return apiGet<Expense[]>(BASE_URL, params);
}

export async function getMyExpenses(params?: ExpensesParams): Promise<Expense[]> {
    return apiGet<Expense[]>(`${BASE_URL}/me`, params);
}

export async function getPendingExpenses(): Promise<Expense[]> {
    return apiGet<Expense[]>(`${BASE_URL}/pending`);
}

export async function getExpense(id: string): Promise<Expense> {
    return apiGet<Expense>(`${BASE_URL}/${id}`);
}

export async function createExpense(data: ExpenseCreate): Promise<Expense> {
    return apiPost<Expense>(BASE_URL, data);
}

export async function updateExpense(id: string, data: ExpenseUpdate): Promise<Expense> {
    return apiPut<Expense>(`${BASE_URL}/${id}`, data);
}

export async function deleteExpense(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}

// ============================================
// Expense Workflow API
// ============================================

export async function submitExpense(id: string): Promise<Expense> {
    return apiPost<Expense>(`${BASE_URL}/${id}/submit`, {});
}

export async function approveExpense(id: string, comments?: string): Promise<Expense> {
    return apiPost<Expense>(`${BASE_URL}/${id}/approve`, { comments });
}

export async function rejectExpense(id: string, reason: string, comments?: string): Promise<Expense> {
    return apiPost<Expense>(`${BASE_URL}/${id}/reject`, { reason, comments });
}

export async function returnExpense(id: string, reason: string): Promise<Expense> {
    return apiPost<Expense>(`${BASE_URL}/${id}/return`, { reason });
}

export async function markExpensePaid(id: string): Promise<Expense> {
    return apiPost<Expense>(`${BASE_URL}/${id}/pay`, {});
}

// ============================================
// Expense Items API
// ============================================

export async function addExpenseItem(expenseId: string, item: ExpenseItemCreate): Promise<ExpenseItem> {
    return apiPost<ExpenseItem>(`${BASE_URL}/${expenseId}/items`, item);
}

export async function updateExpenseItem(expenseId: string, itemId: string, item: Partial<ExpenseItemCreate>): Promise<ExpenseItem> {
    return apiPut<ExpenseItem>(`${BASE_URL}/${expenseId}/items/${itemId}`, item);
}

export async function deleteExpenseItem(expenseId: string, itemId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${expenseId}/items/${itemId}`);
}

// ============================================
// Receipt Upload API
// ============================================

export async function uploadReceipt(expenseId: string, file: File, itemId?: string): Promise<{ url: string; ocr_data?: Record<string, unknown> }> {
    const formData = new FormData();
    formData.append("file", file);
    if (itemId) {
        formData.append("item_id", itemId);
    }

    const response = await fetch(`/api${BASE_URL}/${expenseId}/receipt`, {
        method: "POST",
        body: formData,
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Failed to upload receipt");
    }

    return response.json();
}

// ============================================
// Approval & Audit API
// ============================================

export async function getExpenseApprovals(expenseId: string): Promise<ExpenseApproval[]> {
    return apiGet<ExpenseApproval[]>(`${BASE_URL}/${expenseId}/approvals`);
}

export async function getExpenseAuditLog(expenseId: string): Promise<ExpenseAuditLog[]> {
    return apiGet<ExpenseAuditLog[]>(`${BASE_URL}/${expenseId}/audit-log`);
}

// ============================================
// Dashboard & Analytics API
// ============================================

const DASHBOARD_URL = "/expense-dashboard";

export async function getExpenseDashboardStats(): Promise<ExpenseDashboardStats> {
    return apiGet<ExpenseDashboardStats>(`${DASHBOARD_URL}/stats`);
}

export async function getExpenseAnalytics(params?: {
    start_date?: string;
    end_date?: string;
    year?: number;
}): Promise<ExpenseAnalytics> {
    return apiGet<ExpenseAnalytics>(`${DASHBOARD_URL}/analytics`, params);
}

export async function getMonthlyTrends(year?: number): Promise<{ trends: MonthlyTrend[] }> {
    return apiGet<{ trends: MonthlyTrend[] }>(`${DASHBOARD_URL}/monthly-trends`, year ? { year } : undefined);
}

export async function getCategoryBreakdown(params?: {
    start_date?: string;
    end_date?: string;
}): Promise<{ categories: CategoryBreakdown[] }> {
    return apiGet<{ categories: CategoryBreakdown[] }>(`${DASHBOARD_URL}/by-category`, params);
}

export async function getDepartmentBreakdown(params?: {
    start_date?: string;
    end_date?: string;
}): Promise<{ departments: DepartmentBreakdown[] }> {
    return apiGet<{ departments: DepartmentBreakdown[] }>(`${DASHBOARD_URL}/by-department`, params);
}

export async function getProjectBreakdown(params?: {
    start_date?: string;
    end_date?: string;
}): Promise<{ projects: ProjectBreakdown[] }> {
    return apiGet<{ projects: ProjectBreakdown[] }>(`${DASHBOARD_URL}/by-project`, params);
}

export async function getBudgetComparison(period: "monthly" | "quarterly" | "yearly" = "monthly"): Promise<{ comparisons: BudgetComparison[] }> {
    return apiGet<{ comparisons: BudgetComparison[] }>(`${DASHBOARD_URL}/budget-comparison`, { period });
}

// ============================================
// Reports API
// ============================================

const REPORTS_URL = "/expense-reports";

export async function exportExpenseReport(params: {
    format: "pdf" | "excel";
    start_date?: string;
    end_date?: string;
    user_id?: string;
    department_id?: string;
    status?: ExpenseStatus;
}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
    });

    const response = await fetch(`/api${REPORTS_URL}/export?${queryParams}`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Failed to export report");
    }

    return response.blob();
}

export async function getTaxReport(params: {
    year: number;
    quarter?: number;
}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append("year", params.year.toString());
    if (params.quarter) queryParams.append("quarter", params.quarter.toString());

    const response = await fetch(`/api${REPORTS_URL}/tax?${queryParams}`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Failed to generate tax report");
    }

    return response.blob();
}

// ============================================
// Categories & Cost Centers API
// ============================================

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
    return apiGet<ExpenseCategory[]>("/expense-categories");
}

export async function getCostCenters(): Promise<CostCenter[]> {
    return apiGet<CostCenter[]>("/cost-centers");
}

// ============================================
// Helper Functions
// ============================================

export function getStatusColor(status: ExpenseStatus): string {
    const colors: Record<ExpenseStatus, string> = {
        draft: "bg-gray-500/20 text-gray-400",
        submitted: "bg-blue-500/20 text-blue-400",
        pending: "bg-yellow-500/20 text-yellow-400",
        approved: "bg-green-500/20 text-green-400",
        rejected: "bg-red-500/20 text-red-400",
        returned: "bg-orange-500/20 text-orange-400",
        paid: "bg-emerald-500/20 text-emerald-400",
    };
    return colors[status] || "bg-gray-500/20 text-gray-400";
}

export function getStatusLabel(status: ExpenseStatus): string {
    const labels: Record<ExpenseStatus, string> = {
        draft: "Draft",
        submitted: "Submitted",
        pending: "Pending Approval",
        approved: "Approved",
        rejected: "Rejected",
        returned: "Returned",
        paid: "Paid",
    };
    return labels[status] || status;
}

export function formatCurrency(amount: number, currency: string = "EGP"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

export function getExpenseTypeLabel(type: ExpenseType): string {
    const labels: Record<ExpenseType, string> = {
        meal: "Meal",
        transport: "Transport",
        accommodation: "Accommodation",
        supplies: "Supplies",
        communication: "Communication",
        entertainment: "Entertainment",
        travel: "Travel",
        software: "Software",
        equipment: "Equipment",
        other: "Other",
    };
    return labels[type] || type;
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
        cash: "Cash",
        credit_card: "Credit Card",
        debit_card: "Debit Card",
        bank_transfer: "Bank Transfer",
        company_card: "Company Card",
        petty_cash: "Petty Cash",
        other: "Other",
    };
    return labels[method] || method;
}
