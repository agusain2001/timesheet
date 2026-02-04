/**
 * Reports API Service
 * Comprehensive reporting with export capabilities
 */

import { apiGet, apiPost } from "./api";

// =============== Types ===============

export type ReportType =
    | "task_aging"
    | "task_completion"
    | "team_velocity"
    | "project_variance"
    | "workload_distribution"
    | "time_tracking"
    | "expense_summary"
    | "resource_utilization";

export type ExportFormat = "pdf" | "excel" | "csv";

export interface ReportFilters {
    date_from?: string;
    date_to?: string;
    project_ids?: string[];
    team_ids?: string[];
    user_ids?: string[];
    department_ids?: string[];
    status?: string[];
    priority?: string[];
}

export interface ReportResult {
    report_type: ReportType;
    generated_at: string;
    filters_applied: ReportFilters;
    summary: Record<string, number | string>;
    data: Array<Record<string, unknown>>;
    charts?: Array<{
        chart_type: string;
        title: string;
        data: Array<Record<string, unknown>>;
    }>;
}

export interface ScheduledReport {
    id: string;
    name: string;
    report_type: ReportType;
    filters: ReportFilters;
    schedule: "daily" | "weekly" | "monthly";
    schedule_day?: number;
    schedule_time: string;
    export_format: ExportFormat;
    recipients: string[];
    is_active: boolean;
    last_run_at?: string;
    next_run_at?: string;
    created_by_id: string;
    created_at: string;
}

export interface ScheduledReportCreate {
    name: string;
    report_type: ReportType;
    filters: ReportFilters;
    schedule: "daily" | "weekly" | "monthly";
    schedule_day?: number;
    schedule_time: string;
    export_format: ExportFormat;
    recipients: string[];
}

const BASE_URL = "/reports";

// =============== Standard Reports ===============

/**
 * Get task aging report
 */
export async function getTaskAgingReport(filters?: ReportFilters): Promise<ReportResult> {
    return apiGet<ReportResult>(`${BASE_URL}/task-aging`, filters as Record<string, string | number | boolean | undefined>);
}

/**
 * Get task completion trends report
 */
export async function getTaskCompletionReport(filters?: ReportFilters): Promise<ReportResult> {
    return apiGet<ReportResult>(`${BASE_URL}/task-completion`, filters as Record<string, string | number | boolean | undefined>);
}

/**
 * Get team velocity report
 */
export async function getTeamVelocityReport(
    teamId: string,
    filters?: ReportFilters
): Promise<ReportResult> {
    return apiGet<ReportResult>(`${BASE_URL}/team-velocity/${teamId}`, filters as Record<string, string | number | boolean | undefined>);
}

/**
 * Get project variance report (planned vs actual)
 */
export async function getProjectVarianceReport(
    projectId: string,
    filters?: ReportFilters
): Promise<ReportResult> {
    return apiGet<ReportResult>(`${BASE_URL}/project-variance/${projectId}`, filters as Record<string, string | number | boolean | undefined>);
}

/**
 * Get workload distribution report
 */
export async function getWorkloadDistributionReport(filters?: ReportFilters): Promise<ReportResult> {
    return apiGet<ReportResult>(`${BASE_URL}/workload-distribution`, filters as Record<string, string | number | boolean | undefined>);
}

/**
 * Get time tracking report
 */
export async function getTimeTrackingReport(filters?: ReportFilters): Promise<ReportResult> {
    return apiGet<ReportResult>(`${BASE_URL}/time-tracking`, filters as Record<string, string | number | boolean | undefined>);
}

/**
 * Get expense summary report
 */
export async function getExpenseSummaryReport(filters?: ReportFilters): Promise<ReportResult> {
    return apiGet<ReportResult>(`${BASE_URL}/expense-summary`, filters as Record<string, string | number | boolean | undefined>);
}

/**
 * Get resource utilization report
 */
export async function getResourceUtilizationReport(filters?: ReportFilters): Promise<ReportResult> {
    return apiGet<ReportResult>(`${BASE_URL}/resource-utilization`, filters as Record<string, string | number | boolean | undefined>);
}

// =============== Custom Reports ===============

/**
 * Generate custom report
 */
export async function generateCustomReport(params: {
    report_type: ReportType;
    filters: ReportFilters;
    group_by?: string[];
    metrics?: string[];
}): Promise<ReportResult> {
    return apiPost<ReportResult>(`${BASE_URL}/generate`, params);
}

// =============== Export ===============

/**
 * Export report to file
 */
export async function exportReport(
    reportType: ReportType,
    format: ExportFormat,
    filters?: ReportFilters
): Promise<Blob> {
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${BASE_URL}/export/${reportType}?format=${format}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filters || {}),
            credentials: "include",
        }
    );

    if (!response.ok) {
        throw new Error("Failed to export report");
    }

    return response.blob();
}

/**
 * Download report file
 */
export async function downloadReport(
    reportType: ReportType,
    format: ExportFormat,
    filters?: ReportFilters,
    filename?: string
): Promise<void> {
    const blob = await exportReport(reportType, format, filters);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `${reportType}_report.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// =============== Scheduled Reports ===============

/**
 * Get scheduled reports
 */
export async function getScheduledReports(): Promise<ScheduledReport[]> {
    return apiGet<ScheduledReport[]>(`${BASE_URL}/scheduled`);
}

/**
 * Create scheduled report
 */
export async function createScheduledReport(data: ScheduledReportCreate): Promise<ScheduledReport> {
    return apiPost<ScheduledReport>(`${BASE_URL}/scheduled`, data);
}

/**
 * Update scheduled report
 */
export async function updateScheduledReport(
    id: string,
    data: Partial<ScheduledReportCreate>
): Promise<ScheduledReport> {
    return apiPost<ScheduledReport>(`${BASE_URL}/scheduled/${id}`, data);
}

/**
 * Delete scheduled report
 */
export async function deleteScheduledReport(id: string): Promise<void> {
    return apiPost(`${BASE_URL}/scheduled/${id}/delete`, {});
}

/**
 * Run scheduled report now
 */
export async function runScheduledReportNow(id: string): Promise<ReportResult> {
    return apiPost<ReportResult>(`${BASE_URL}/scheduled/${id}/run-now`, {});
}

// =============== Drill-down ===============

/**
 * Drill down into report data
 */
export async function drillDown(params: {
    report_type: ReportType;
    dimension: string;
    dimension_value: string;
    filters?: ReportFilters;
}): Promise<ReportResult> {
    return apiPost<ReportResult>(`${BASE_URL}/drill-down`, params);
}

// =============== Saved Reports ===============

/**
 * Save report configuration
 */
export async function saveReportConfig(params: {
    name: string;
    report_type: ReportType;
    filters: ReportFilters;
    group_by?: string[];
    is_public?: boolean;
}): Promise<{ id: string; name: string }> {
    return apiPost(`${BASE_URL}/saved`, params);
}

/**
 * Get saved report configurations
 */
export async function getSavedReports(): Promise<Array<{
    id: string;
    name: string;
    report_type: ReportType;
    filters: ReportFilters;
    is_public: boolean;
    created_at: string;
}>> {
    return apiGet(`${BASE_URL}/saved`);
}

/**
 * Load saved report
 */
export async function loadSavedReport(id: string): Promise<ReportResult> {
    return apiGet<ReportResult>(`${BASE_URL}/saved/${id}/run`);
}
