/**
 * Dashboards API Service
 * Personal, Manager, and Executive dashboards
 */

import { apiGet } from "./api";

// =============== Types ===============

export interface PersonalDashboard {
    // Task overview
    my_tasks_count: number;
    today_tasks_count: number;
    overdue_tasks_count: number;
    completed_today_count: number;
    // Upcoming
    upcoming_deadlines: Array<{
        task_id: string;
        task_name: string;
        due_date: string;
        priority: string;
        project_name?: string;
    }>;
    // Time
    hours_logged_today: number;
    hours_logged_this_week: number;
    // My tasks by status
    tasks_by_status: Record<string, number>;
    // Recent activity
    recent_activity: Array<{
        id: string;
        type: string;
        message: string;
        timestamp: string;
        link?: string;
    }>;
}

export interface ManagerDashboard {
    // Team overview
    team_members_count: number;
    active_members_count: number;
    // Team tasks
    team_tasks_total: number;
    team_tasks_in_progress: number;
    team_tasks_blocked: number;
    team_tasks_completed_this_week: number;
    // Performance
    team_velocity: number;
    velocity_trend: "up" | "down" | "stable";
    // Bottlenecks
    bottlenecks: Array<{
        type: "blocked_task" | "overdue" | "overloaded" | "idle";
        severity: "low" | "medium" | "high";
        message: string;
        related_id?: string;
        related_name?: string;
    }>;
    // SLA
    sla_breaches: Array<{
        task_id: string;
        task_name: string;
        breach_type: string;
        breached_at: string;
    }>;
    // Workload distribution
    workload_distribution: Array<{
        user_id: string;
        user_name: string;
        avatar_url?: string;
        task_count: number;
        allocated_hours: number;
        capacity_hours: number;
        utilization: number;
    }>;
}

export interface ExecutiveDashboard {
    // Projects overview
    total_projects: number;
    active_projects: number;
    projects_on_track: number;
    projects_at_risk: number;
    projects_delayed: number;
    // Project health
    projects_health: Array<{
        project_id: string;
        project_name: string;
        status: string;
        health_score: number;
        progress: number;
        end_date?: string;
        is_overdue: boolean;
    }>;
    // Delivery trends
    delivery_trends: Array<{
        period: string;
        planned: number;
        completed: number;
        on_time_percentage: number;
    }>;
    // Risk indicators
    risk_indicators: Array<{
        type: string;
        count: number;
        severity: "low" | "medium" | "high" | "critical";
        items: Array<{
            id: string;
            name: string;
            description: string;
        }>;
    }>;
    // Resource utilization
    overall_utilization: number;
    departments_utilization: Array<{
        department_id: string;
        department_name: string;
        member_count: number;
        utilization: number;
    }>;
    // Budget overview
    total_budget: number;
    total_spent: number;
    budget_utilization: number;
}

export interface DashboardWidgetData {
    widget_id: string;
    widget_type: string;
    data: unknown;
    last_updated: string;
}

// =============== API Functions ===============

const BASE_URL = "/dashboard";

/**
 * Get personal dashboard data
 */
export async function getPersonalDashboard(): Promise<PersonalDashboard> {
    return apiGet<PersonalDashboard>(`${BASE_URL}/personal`);
}

/**
 * Get manager dashboard data
 */
export async function getManagerDashboard(teamId?: string): Promise<ManagerDashboard> {
    const params: Record<string, string | undefined> = { team_id: teamId };
    return apiGet<ManagerDashboard>(`${BASE_URL}/manager`, params);
}

/**
 * Get executive dashboard data
 */
export async function getExecutiveDashboard(): Promise<ExecutiveDashboard> {
    return apiGet<ExecutiveDashboard>(`${BASE_URL}/executive`);
}

/**
 * Get specific widget data
 */
export async function getWidgetData(widgetId: string, params?: Record<string, string>): Promise<DashboardWidgetData> {
    return apiGet<DashboardWidgetData>(`${BASE_URL}/widgets/${widgetId}`, params);
}

// =============== Quick Stats ===============

/**
 * Get today's quick stats
 */
export async function getTodayStats(): Promise<{
    tasks_due_today: number;
    tasks_completed_today: number;
    hours_logged_today: number;
    meetings_today: number;
    unread_notifications: number;
}> {
    return apiGet(`${BASE_URL}/today`);
}

/**
 * Get weekly summary
 */
export async function getWeeklySummary(): Promise<{
    week_starting: string;
    tasks_completed: number;
    tasks_created: number;
    hours_logged: number;
    productivity_score: number;
    productivity_trend: "up" | "down" | "stable";
}> {
    return apiGet(`${BASE_URL}/weekly-summary`);
}

// =============== Charts ===============

/**
 * Get task completion trends
 */
export async function getTaskCompletionTrends(days?: number): Promise<Array<{
    date: string;
    created: number;
    completed: number;
}>> {
    return apiGet(`${BASE_URL}/charts/task-completion`, { days });
}

/**
 * Get time logged trends
 */
export async function getTimeLoggedTrends(days?: number): Promise<Array<{
    date: string;
    hours: number;
}>> {
    return apiGet(`${BASE_URL}/charts/time-logged`, { days });
}

/**
 * Get tasks by priority distribution
 */
export async function getTasksByPriorityDistribution(): Promise<Record<string, number>> {
    return apiGet(`${BASE_URL}/charts/priority-distribution`);
}

/**
 * Get tasks by status distribution
 */
export async function getTasksByStatusDistribution(): Promise<Record<string, number>> {
    return apiGet(`${BASE_URL}/charts/status-distribution`);
}

// =============== Performance Metrics ===============

/**
 * Get team performance metrics
 */
export async function getTeamPerformance(teamId: string, period?: string): Promise<{
    team_id: string;
    period: string;
    tasks_completed: number;
    avg_completion_time: number;
    on_time_completion_rate: number;
    velocity: number;
    top_performers: Array<{
        user_id: string;
        user_name: string;
        tasks_completed: number;
        hours_logged: number;
    }>;
}> {
    return apiGet(`${BASE_URL}/performance/team/${teamId}`, { period });
}

/**
 * Get project performance metrics
 */
export async function getProjectPerformance(projectId: string): Promise<{
    project_id: string;
    on_time_percentage: number;
    budget_utilization: number;
    team_utilization: number;
    risk_score: number;
    milestones_completed: number;
    milestones_total: number;
}> {
    return apiGet(`${BASE_URL}/performance/project/${projectId}`);
}
