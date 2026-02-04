/**
 * Timesheets API Service
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";
import type { Timesheet, TimesheetCreate, TimesheetUpdate } from "@/types/api";

const BASE_URL = "/timesheets";

export interface TimesheetsParams {
    skip?: number;
    limit?: number;
    status?: string;
    week_starting?: string;
    [key: string]: string | number | boolean | undefined;
}

/**
 * Get all timesheets for current user
 */
export async function getTimesheets(
    params?: TimesheetsParams,
): Promise<Timesheet[]> {
    return apiGet<Timesheet[]>(BASE_URL, params);
}

/**
 * Get a single timesheet by ID
 */
export async function getTimesheet(id: string): Promise<Timesheet> {
    return apiGet<Timesheet>(`${BASE_URL}/${id}`);
}

/**
 * Create a new timesheet
 */
export async function createTimesheet(
    data: TimesheetCreate,
): Promise<Timesheet> {
    return apiPost<Timesheet>(BASE_URL, data);
}

/**
 * Update an existing timesheet
 */
export async function updateTimesheet(
    id: string,
    data: TimesheetUpdate,
): Promise<Timesheet> {
    return apiPut<Timesheet>(`${BASE_URL}/${id}`, data);
}

/**
 * Delete a timesheet
 */
export async function deleteTimesheet(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}

/**
 * Submit a timesheet for approval
 */
export async function submitTimesheet(id: string): Promise<Timesheet> {
    return apiPut<Timesheet>(`${BASE_URL}/${id}`, { status: "submitted" });
}
