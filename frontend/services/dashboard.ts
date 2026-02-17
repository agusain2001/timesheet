/**
 * Dashboard API service
 */

import { apiGet } from "./api";

// ============ Types ============

export interface UpcomingDeadline {
    task_id: string;
    task_name: string;
    due_date: string;
    priority: string;
    project_name: string | null;
}

export interface RecentActivity {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    link: string | null;
}

export interface PersonalDashboard {
    my_tasks_count: number;
    today_tasks_count: number;
    due_tasks_count: number;
    overdue_tasks_count: number;
    completed_today_count: number;
    completed_tasks_count: number;
    upcoming_deadlines: UpcomingDeadline[];
    hours_logged_today: number;
    hours_logged_this_week: number;
    tasks_by_status: Record<string, number>;
    recent_activity: RecentActivity[];
}

// ============ API Functions ============

export async function getPersonalDashboard(): Promise<PersonalDashboard> {
    return apiGet<PersonalDashboard>("/api/dashboard/personal");
}
