/**
 * Time Tracking API Service
 * Timer-based and manual time logging with capacity planning
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export interface TimeLog {
    id: string;
    task_id?: string;
    project_id?: string;
    user_id: string;
    date: string;
    hours: number;
    started_at?: string;
    ended_at?: string;
    notes?: string;
    is_billable: boolean;
    created_at: string;
    // Relationships
    task?: { id: string; name: string };
    project?: { id: string; name: string };
    user?: { id: string; full_name: string };
}

export interface ActiveTimer {
    id: string;
    task_id?: string;
    project_id?: string;
    user_id: string;
    started_at: string;
    notes?: string;
    elapsed_seconds: number;
    task?: { id: string; name: string };
    project?: { id: string; name: string };
}

export interface TimeLogCreate {
    task_id?: string;
    project_id?: string;
    date: string;
    hours: number;
    notes?: string;
    is_billable?: boolean;
}

export interface TimeLogUpdate {
    date?: string;
    hours?: number;
    notes?: string;
    is_billable?: boolean;
}

export interface Capacity {
    id: string;
    user_id: string;
    week_starting: string;
    available_hours: number;
    allocated_hours: number;
    logged_hours: number;
    utilization_percentage: number;
}

export interface CapacityPlan {
    user_id: string;
    week_starting: string;
    available_hours: number;
}

export interface UserWorkload {
    user_id: string;
    user_name: string;
    capacity_hours: number;
    allocated_hours: number;
    logged_hours: number;
    utilization_percentage: number;
    is_over_allocated: boolean;
    tasks: Array<{
        task_id: string;
        task_name: string;
        estimated_hours: number;
        logged_hours: number;
        status: string;
    }>;
}

export interface BurndownData {
    date: string;
    ideal_remaining: number;
    actual_remaining: number;
    completed_hours: number;
}

export interface BurnupData {
    date: string;
    total_scope: number;
    completed: number;
}

// Timer session is an alias for ActiveTimer for backwards compatibility
export type TimerSession = {
    id: string;
    task_id?: string;
    project_id?: string;
    start_time: string;
    notes?: string;
};

export interface WeeklyTimeSheet {
    week_start: string;
    week_end: string;
    total_hours: number;
    expected_hours: number;
    days: Array<{
        date: string;
        day_name: string;
        total_hours: number;
        entries: Array<{
            task_id?: string;
            task_name?: string;
            project_name?: string;
            hours: number;
            description?: string;
        }>;
    }>;
}

export interface TimeLogsParams {
    skip?: number;
    limit?: number;
    user_id?: string;
    task_id?: string;
    project_id?: string;
    date_from?: string;
    date_to?: string;
    is_billable?: boolean;
    [key: string]: string | number | boolean | undefined;
}

const BASE_URL = "/time-tracking";

// =============== Time Logs CRUD ===============

/**
 * Get time logs with filters
 */
export async function getTimeLogs(params?: TimeLogsParams): Promise<TimeLog[]> {
    return apiGet<TimeLog[]>(`${BASE_URL}/logs`, params);
}

/**
 * Get time log by ID
 */
export async function getTimeLog(id: string): Promise<TimeLog> {
    return apiGet<TimeLog>(`${BASE_URL}/logs/${id}`);
}

/**
 * Create manual time log
 */
export async function createTimeLog(data: TimeLogCreate): Promise<TimeLog> {
    return apiPost<TimeLog>(`${BASE_URL}/logs`, data);
}

/**
 * Update time log
 */
export async function updateTimeLog(id: string, data: TimeLogUpdate): Promise<TimeLog> {
    return apiPut<TimeLog>(`${BASE_URL}/logs/${id}`, data);
}

/**
 * Delete time log
 */
export async function deleteTimeLog(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/logs/${id}`);
}

// =============== Timer Operations ===============

/**
 * Start timer for a task
 */
export async function startTimer(taskId?: string, projectId?: string, notes?: string): Promise<ActiveTimer> {
    return apiPost<ActiveTimer>(`${BASE_URL}/timer/start`, {
        task_id: taskId,
        project_id: projectId,
        notes,
    });
}

/**
 * Stop active timer
 */
export async function stopTimer(): Promise<TimeLog> {
    return apiPost<TimeLog>(`${BASE_URL}/timer/stop`, {});
}

/**
 * Get current active timer
 */
export async function getActiveTimer(): Promise<ActiveTimer | null> {
    return apiGet<ActiveTimer | null>(`${BASE_URL}/timer/active`);
}

/**
 * Discard active timer without saving
 */
export async function discardTimer(): Promise<void> {
    return apiDelete(`${BASE_URL}/timer/active`);
}

/**
 * Update timer notes
 */
export async function updateTimerNotes(notes: string): Promise<ActiveTimer> {
    return apiPut<ActiveTimer>(`${BASE_URL}/timer/notes`, { notes });
}

// =============== My Time ===============

/**
 * Get my time logs for current week
 */
export async function getMyTimeThisWeek(): Promise<{
    total_hours: number;
    daily_hours: Record<string, number>;
    logs: TimeLog[];
}> {
    return apiGet(`${BASE_URL}/my-time/this-week`);
}

/**
 * Get my time logs for a date range
 */
export async function getMyTime(dateFrom: string, dateTo: string): Promise<{
    total_hours: number;
    daily_hours: Record<string, number>;
    logs: TimeLog[];
}> {
    return apiGet(`${BASE_URL}/my-time`, { date_from: dateFrom, date_to: dateTo });
}

// =============== Capacity Planning ===============

/**
 * Get user capacity for a week
 */
export async function getUserCapacity(userId: string, weekStarting: string): Promise<Capacity> {
    return apiGet<Capacity>(`${BASE_URL}/capacity/${userId}`, { week_starting: weekStarting });
}

/**
 * Set user capacity plan
 */
export async function setCapacityPlan(data: CapacityPlan): Promise<Capacity> {
    return apiPost<Capacity>(`${BASE_URL}/capacity`, data);
}

/**
 * Get team capacity overview
 */
export async function getTeamCapacity(
    teamId: string,
    weekStarting: string
): Promise<{
    team_id: string;
    week_starting: string;
    total_capacity: number;
    total_allocated: number;
    total_logged: number;
    utilization_percentage: number;
    members: Capacity[];
}> {
    return apiGet(`${BASE_URL}/capacity/team/${teamId}`, { week_starting: weekStarting });
}

// =============== Workload ===============

/**
 * Get user workload
 */
export async function getUserWorkload(userId: string): Promise<UserWorkload> {
    return apiGet<UserWorkload>(`${BASE_URL}/workload/${userId}`);
}

/**
 * Get over-allocation alerts
 */
export async function getOverAllocationAlerts(): Promise<Array<{
    user_id: string;
    user_name: string;
    week_starting: string;
    capacity_hours: number;
    allocated_hours: number;
    over_allocation_hours: number;
}>> {
    return apiGet(`${BASE_URL}/alerts/over-allocation`);
}

// =============== Charts Data ===============

/**
 * Get burndown chart data for a project
 */
export async function getBurndownData(
    projectId: string,
    startDate?: string,
    endDate?: string
): Promise<BurndownData[]> {
    return apiGet<BurndownData[]>(`${BASE_URL}/charts/burndown/${projectId}`, {
        start_date: startDate,
        end_date: endDate,
    });
}

/**
 * Get burnup chart data for a project
 */
export async function getBurnupData(
    projectId: string,
    startDate?: string,
    endDate?: string
): Promise<BurnupData[]> {
    return apiGet<BurnupData[]>(`${BASE_URL}/charts/burnup/${projectId}`, {
        start_date: startDate,
        end_date: endDate,
    });
}

/**
 * Get velocity data for a team
 */
export async function getVelocityData(
    teamId: string,
    weeks?: number
): Promise<Array<{
    week_starting: string;
    completed_tasks: number;
    completed_points: number;
    completed_hours: number;
}>> {
    return apiGet(`${BASE_URL}/charts/velocity/${teamId}`, { weeks });
}

// =============== Reports ===============

/**
 * Get time tracking summary report
 */
export async function getTimeSummaryReport(params: {
    date_from: string;
    date_to: string;
    group_by?: "user" | "project" | "task" | "date";
    user_ids?: string[];
    project_ids?: string[];
}): Promise<{
    total_hours: number;
    billable_hours: number;
    non_billable_hours: number;
    breakdown: Array<{
        key: string;
        label: string;
        hours: number;
        billable_hours: number;
    }>;
}> {
    return apiGet(`${BASE_URL}/reports/summary`, params as unknown as Record<string, string | number | boolean | undefined>);
}

// =============== Capacity & Timesheet Helpers ===============

/**
 * Get capacity data for a date range
 */
export async function getCapacity(weekStarting?: string): Promise<{
    available_hours: number;
    allocated_hours: number;
    logged_hours: number;
    utilization_percentage: number;
}> {
    return apiGet(`${BASE_URL}/capacity/me`, { week_starting: weekStarting });
}

/**
 * Get weekly timesheet for a specific week
 */
export async function getWeeklyTimesheet(weekStarting?: string): Promise<WeeklyTimeSheet> {
    return apiGet<WeeklyTimeSheet>(`${BASE_URL}/timesheet/weekly`, { week_starting: weekStarting });
}

