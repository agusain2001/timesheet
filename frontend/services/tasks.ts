/**
 * Enhanced Tasks API Service
 * Comprehensive task management with dependencies, collaboration, and AI features
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export type TaskType = "personal" | "project" | "assigned";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "waiting" | "blocked" | "review" | "completed" | "cancelled" | "open" | "overdue";
export type DependencyType = "finish_to_start" | "start_to_start" | "finish_to_finish";

export interface TaskAssignee {
    id: string;
    task_id: string;
    user_id: string;
    assigned_at: string;
    assigned_by_id?: string;
    user?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
    };
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    parent_id?: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
    reactions?: Array<{
        emoji: string;
        count: number;
        user_ids: string[];
    }>;
    replies?: TaskComment[];
}

export interface TaskAttachment {
    id: string;
    task_id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    version: number;
    uploaded_by_id: string;
    created_at: string;
    uploaded_by?: {
        id: string;
        full_name: string;
    };
}

export interface TaskDependency {
    id: string;
    source_task_id: string;
    target_task_id: string;
    dependency_type: DependencyType;
    created_at: string;
    source_task?: { id: string; name: string; status: string };
    target_task?: { id: string; name: string; status: string };
}

export interface Task {
    id: string;
    name: string;
    description?: string;
    task_type: TaskType;
    project_id?: string;
    epic_id?: string;
    phase_id?: string;
    parent_task_id?: string;
    department_id?: string;
    team_id?: string;
    assignee_id?: string;
    owner_id?: string;
    priority: TaskPriority;
    status: TaskStatus;
    start_date?: string;
    due_date?: string;
    completed_at?: string;
    estimated_hours?: number;
    actual_hours: number;
    custom_fields?: Record<string, unknown>;
    tags?: string[];
    order: number;
    ai_priority_score?: number;
    ai_risk_score?: number;
    ai_suggestions?: string[];
    created_at: string;
    updated_at: string;
    // Relationships
    project?: { id: string; name: string; code?: string };
    epic?: { id: string; name: string };
    phase?: { id: string; name: string };
    assignee?: { id: string; full_name: string; email: string; avatar_url?: string };
    owner?: { id: string; full_name: string; avatar_url?: string };
    team?: { id: string; name: string };
    subtasks?: Task[];
    task_assignees?: TaskAssignee[];
    comments?: TaskComment[];
    attachments?: TaskAttachment[];
    dependencies?: TaskDependency[];
    blocking_tasks?: string[];
    comment_count?: number;
    attachment_count?: number;
    subtask_count?: number;
    completed_subtask_count?: number;
}

export interface TaskCreate {
    name: string;
    description?: string;
    task_type?: TaskType;
    project_id?: string;
    epic_id?: string;
    phase_id?: string;
    parent_task_id?: string;
    department_id?: string;
    team_id?: string;
    assignee_id?: string;
    owner_id?: string;
    priority?: TaskPriority;
    start_date?: string;
    due_date?: string;
    estimated_hours?: number;
    tags?: string[];
    custom_fields?: Record<string, unknown>;
    // Multiple assignees
    assignee_ids?: string[];
}

export interface TaskUpdate extends Partial<TaskCreate> {
    status?: TaskStatus;
    actual_hours?: number;
    order?: number;
}

export interface TasksParams {
    skip?: number;
    limit?: number;
    project_id?: string;
    epic_id?: string;
    phase_id?: string;
    parent_task_id?: string;
    assignee_id?: string;
    owner_id?: string;
    team_id?: string;
    department_id?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    task_type?: TaskType;
    search?: string;
    has_due_date?: boolean;
    overdue_only?: boolean;
    include_subtasks?: boolean;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    [key: string]: string | number | boolean | undefined;
}

const BASE_URL = "/tasks";

// =============== Task CRUD ===============

/**
 * Get all tasks with optional filters
 */
export async function getTasks(params?: TasksParams): Promise<Task[]> {
    return apiGet<Task[]>(BASE_URL, params);
}

/**
 * Get a single task by ID
 */
export async function getTask(id: string): Promise<Task> {
    return apiGet<Task>(`${BASE_URL}/${id}`);
}

/**
 * Create a new task
 */
export async function createTask(data: TaskCreate): Promise<Task> {
    return apiPost<Task>(BASE_URL, data);
}

/**
 * Update a task
 */
export async function updateTask(id: string, data: TaskUpdate): Promise<Task> {
    return apiPut<Task>(`${BASE_URL}/${id}`, data);
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}

/**
 * Complete a task
 */
export async function completeTask(id: string): Promise<Task> {
    return apiPut<Task>(`${BASE_URL}/${id}`, { status: "completed" });
}

/**
 * Reopen a task
 */
export async function reopenTask(id: string): Promise<Task> {
    return apiPut<Task>(`${BASE_URL}/${id}`, { status: "todo" });
}

/**
 * Update task status
 */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return apiPut<Task>(`${BASE_URL}/${id}/status`, { status });
}

/**
 * Reorder tasks (for Kanban/list)
 */
export async function reorderTasks(
    taskIds: string[],
    targetStatus?: TaskStatus
): Promise<void> {
    return apiPut(`${BASE_URL}/reorder`, { task_ids: taskIds, status: targetStatus });
}

// =============== Assignees ===============

/**
 * Add assignee to task (multiple assignees)
 */
export async function addTaskAssignee(taskId: string, userId: string): Promise<TaskAssignee> {
    return apiPost<TaskAssignee>(`${BASE_URL}/${taskId}/assignees`, { user_id: userId });
}

/**
 * Remove assignee from task
 */
export async function removeTaskAssignee(taskId: string, assigneeId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${taskId}/assignees/${assigneeId}`);
}

// =============== Dependencies ===============

/**
 * Get task dependencies
 */
export async function getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
    return apiGet<TaskDependency[]>(`${BASE_URL}/${taskId}/dependencies`);
}

/**
 * Add dependency
 */
export async function addTaskDependency(
    sourceTaskId: string,
    targetTaskId: string,
    dependencyType: DependencyType = "finish_to_start"
): Promise<TaskDependency> {
    return apiPost<TaskDependency>(`${BASE_URL}/${sourceTaskId}/dependencies`, {
        target_task_id: targetTaskId,
        dependency_type: dependencyType,
    });
}

/**
 * Remove dependency
 */
export async function removeTaskDependency(taskId: string, dependencyId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${taskId}/dependencies/${dependencyId}`);
}

/**
 * Check if task can start (based on dependencies)
 */
export async function canTaskStart(taskId: string): Promise<{
    can_start: boolean;
    blocking_tasks: Array<{ id: string; name: string; status: string }>;
}> {
    return apiGet(`${BASE_URL}/${taskId}/can-start`);
}

// =============== Comments ===============

/**
 * Get task comments
 */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
    return apiGet<TaskComment[]>(`${BASE_URL}/${taskId}/comments`);
}

/**
 * Add comment to task
 */
export async function addTaskComment(
    taskId: string,
    content: string,
    parentId?: string
): Promise<TaskComment> {
    return apiPost<TaskComment>(`${BASE_URL}/${taskId}/comments`, { content, parent_id: parentId });
}

/**
 * Update comment
 */
export async function updateTaskComment(
    taskId: string,
    commentId: string,
    content: string
): Promise<TaskComment> {
    return apiPut<TaskComment>(`${BASE_URL}/${taskId}/comments/${commentId}`, { content });
}

/**
 * Delete comment
 */
export async function deleteTaskComment(taskId: string, commentId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${taskId}/comments/${commentId}`);
}

/**
 * Add reaction to comment
 */
export async function addCommentReaction(
    taskId: string,
    commentId: string,
    emoji: string
): Promise<void> {
    return apiPost(`${BASE_URL}/${taskId}/comments/${commentId}/reactions`, { emoji });
}

// =============== Attachments ===============

/**
 * Get task attachments
 */
export async function getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    return apiGet<TaskAttachment[]>(`${BASE_URL}/${taskId}/attachments`);
}

/**
 * Upload attachment to task
 */
export async function uploadTaskAttachment(
    taskId: string,
    file: File
): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${BASE_URL}/${taskId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Failed to upload attachment");
    }

    return response.json();
}

/**
 * Delete attachment
 */
export async function deleteTaskAttachment(taskId: string, attachmentId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${taskId}/attachments/${attachmentId}`);
}

// =============== Subtasks ===============

/**
 * Get subtasks
 */
export async function getSubtasks(taskId: string): Promise<Task[]> {
    return apiGet<Task[]>(`${BASE_URL}/${taskId}/subtasks`);
}

/**
 * Create subtask
 */
export async function createSubtask(parentTaskId: string, data: TaskCreate): Promise<Task> {
    return apiPost<Task>(`${BASE_URL}/${parentTaskId}/subtasks`, data);
}

// =============== Time Tracking ===============

/**
 * Log time on task
 */
export async function logTaskTime(
    taskId: string,
    hours: number,
    date?: string,
    notes?: string
): Promise<{
    id: string;
    task_id: string;
    hours: number;
    date: string;
    notes?: string;
}> {
    return apiPost(`${BASE_URL}/${taskId}/time-logs`, { hours, date, notes });
}

/**
 * Get task time logs
 */
export async function getTaskTimeLogs(taskId: string): Promise<Array<{
    id: string;
    user_id: string;
    hours: number;
    date: string;
    notes?: string;
    user?: { id: string; full_name: string };
}>> {
    return apiGet(`${BASE_URL}/${taskId}/time-logs`);
}

// =============== AI Features ===============

/**
 * Get AI priority suggestion
 */
export async function getAIPrioritySuggestion(taskId: string): Promise<{
    suggested_priority: TaskPriority;
    confidence: number;
    reasoning: string;
}> {
    return apiGet(`${BASE_URL}/${taskId}/ai/priority`);
}

/**
 * Get AI risk assessment
 */
export async function getAIRiskAssessment(taskId: string): Promise<{
    risk_score: number;
    risk_level: "low" | "medium" | "high";
    risk_factors: string[];
    recommendations: string[];
}> {
    return apiGet(`${BASE_URL}/${taskId}/ai/risk`);
}

/**
 * Parse task from natural language
 */
export async function parseTaskFromText(text: string): Promise<TaskCreate> {
    return apiPost<TaskCreate>(`${BASE_URL}/ai/parse`, { text });
}

// =============== Bulk Operations ===============

/**
 * Bulk update tasks
 */
export async function bulkUpdateTasks(
    taskIds: string[],
    updates: Partial<TaskUpdate>
): Promise<{ updated: number }> {
    return apiPut(`${BASE_URL}/bulk`, { task_ids: taskIds, updates });
}

/**
 * Bulk delete tasks
 */
export async function bulkDeleteTasks(taskIds: string[]): Promise<{ deleted: number }> {
    return apiPost(`${BASE_URL}/bulk-delete`, { task_ids: taskIds });
}

// =============== Audit Log ===============

/**
 * Get task audit log
 */
export async function getTaskAuditLog(taskId: string): Promise<Array<{
    id: string;
    user_id: string;
    action: string;
    changes: Record<string, { old: unknown; new: unknown }>;
    timestamp: string;
    user?: { id: string; full_name: string };
}>> {
    return apiGet(`${BASE_URL}/${taskId}/audit-log`);
}
