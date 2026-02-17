/**
 * My Time API Service
 * Endpoints for the My Time page — task listing, weekly summary, timer state, duplication
 */

import { apiGet, apiPost, apiPut } from "./api";

// =============== Types ===============

export interface MyTimeTask {
    id: string;
    name: string;
    description?: string;
    task_type: string;
    project_id?: string;
    department_id?: string;
    assignee_id?: string;
    owner_id?: string;
    priority: string;
    status: string;
    estimated_hours?: number;
    actual_hours?: number;
    due_date?: string;
    start_date?: string;
    created_at: string;
    completed_at?: string;
    tags?: string[];
    project?: { id: string; name: string; client_id?: string; status: string } | null;
    client?: { id: string; name: string; alias?: string } | null;
    assignee?: { id: string; full_name: string; email: string; avatar_url?: string | null } | null;
    owner?: { id: string; full_name: string; email: string; avatar_url?: string | null } | null;
    work_state: "working" | "paused";
    elapsed_seconds: number;
}

export interface MyTimeSummary {
    total_hours: number;
    expected_hours: number;
    remaining_hours: number;
    daily_hours: Record<string, number>;
    current_task: {
        id: string;
        name: string;
        elapsed_seconds: number;
    } | null;
}

export interface MyTimeTasksParams {
    task_type?: string;
    project_id?: string;
    priority?: string;
    status_filter?: string;
    assignee_id?: string;
    search?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    [key: string]: string | undefined;
}

// =============== API Functions ===============

const BASE_URL = "/api/my-time";

/** Get current user's tasks with work state */
export async function getMyTimeTasks(params?: MyTimeTasksParams): Promise<MyTimeTask[]> {
    return apiGet<MyTimeTask[]>(`${BASE_URL}/tasks`, params);
}

/** Get weekly progress summary */
export async function getMyTimeSummary(): Promise<MyTimeSummary> {
    return apiGet<MyTimeSummary>(`${BASE_URL}/summary`);
}

/** Update task work state (working/paused) */
export async function updateTaskWorkState(
    taskId: string,
    state: "working" | "paused"
): Promise<{ task_id: string; work_state: string; message: string }> {
    return apiPut(`${BASE_URL}/tasks/${taskId}/state?state=${state}`);
}

/** Duplicate a task */
export async function duplicateMyTimeTask(taskId: string): Promise<MyTimeTask> {
    return apiPost<MyTimeTask>(`${BASE_URL}/tasks/${taskId}/duplicate`);
}

// =============== Comment Types ===============

export interface TaskCommentUser {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    is_edited: boolean;
    created_at: string;
    updated_at?: string | null;
    user?: TaskCommentUser | null;
}

// =============== Comment API Functions ===============

/** Get comments for a task */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
    return apiGet<TaskComment[]>(`${BASE_URL}/tasks/${taskId}/comments`);
}

/** Add a comment to a task */
export async function createTaskComment(taskId: string, content: string): Promise<TaskComment> {
    return apiPost<TaskComment>(`${BASE_URL}/tasks/${taskId}/comments`, { content });
}

