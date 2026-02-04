/**
 * Dashboard API Service
 */

import { apiGet } from "./api";

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

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    return apiGet<DashboardStats>("/dashboard/stats");
}

/**
 * Get expense dashboard statistics
 */
export async function getExpenseDashboardStats(): Promise<ExpenseDashboardStats> {
    return apiGet<ExpenseDashboardStats>("/expenses/dashboard/stats");
}
