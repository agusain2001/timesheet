/**
 * AI Features API Service
 * Smart prioritization, risk prediction, workload optimization, NL task creation
 */

import { apiGet, apiPost } from "./api";

// =============== Types ===============

export interface AIPrioritySuggestion {
    task_id: string;
    current_priority: string;
    suggested_priority: string;
    confidence: number;
    reasoning: string;
    factors: Array<{
        factor: string;
        impact: "positive" | "negative" | "neutral";
        weight: number;
    }>;
}

export interface AIRiskPrediction {
    entity_type: "task" | "project";
    entity_id: string;
    entity_name: string;
    risk_score: number;
    risk_level: "low" | "medium" | "high" | "critical";
    risk_factors: Array<{
        factor: string;
        severity: "low" | "medium" | "high";
        description: string;
    }>;
    recommendations: string[];
    predicted_completion_date?: string;
    delay_probability?: number;
}

export interface AIWorkloadSuggestion {
    type: "reassign" | "reschedule" | "split";
    task_id: string;
    task_name: string;
    current_assignee_id?: string;
    suggested_assignee_id?: string;
    suggested_assignee_name?: string;
    suggested_due_date?: string;
    reasoning: string;
    impact: {
        before: { user_id: string; utilization: number }[];
        after: { user_id: string; utilization: number }[];
    };
}

export interface AITaskParsed {
    name: string;
    description?: string;
    priority?: string;
    due_date?: string;
    estimated_hours?: number;
    tags?: string[];
    assignee_hint?: string;
    project_hint?: string;
    confidence: number;
}

export interface AIInsight {
    id: string;
    type: "risk" | "opportunity" | "recommendation" | "trend";
    title: string;
    description: string;
    severity: "info" | "warning" | "critical";
    entity_type?: string;
    entity_id?: string;
    actions?: Array<{
        label: string;
        action_type: string;
        params: Record<string, unknown>;
    }>;
    created_at: string;
}

export interface AIConversation {
    id: string;
    messages: Array<{
        role: "user" | "assistant";
        content: string;
        timestamp: string;
        actions_taken?: Array<{
            type: string;
            entity_id: string;
            description: string;
        }>;
    }>;
}

const BASE_URL = "/ai";

// =============== Priority Optimization ===============

/**
 * Get AI priority suggestions for tasks
 */
export async function getAIPrioritySuggestions(params?: {
    project_id?: string;
    user_id?: string;
    limit?: number;
}): Promise<AIPrioritySuggestion[]> {
    return apiGet<AIPrioritySuggestion[]>(`${BASE_URL}/priorities`, params as Record<string, string | number | boolean | undefined>);
}

/**
 * Get priority suggestion for a specific task
 */
export async function getTaskPrioritySuggestion(taskId: string): Promise<AIPrioritySuggestion> {
    return apiGet<AIPrioritySuggestion>(`${BASE_URL}/priorities/${taskId}`);
}

/**
 * Apply AI priority suggestion
 */
export async function applyPrioritySuggestion(taskId: string): Promise<{ updated: boolean }> {
    return apiPost(`${BASE_URL}/priorities/${taskId}/apply`, {});
}

/**
 * Bulk apply priority suggestions
 */
export async function bulkApplyPrioritySuggestions(taskIds: string[]): Promise<{ updated: number }> {
    return apiPost(`${BASE_URL}/priorities/bulk-apply`, { task_ids: taskIds });
}

// =============== Risk Prediction ===============

/**
 * Get risk predictions for tasks
 */
export async function getTaskRiskPredictions(params?: {
    project_id?: string;
    min_risk_score?: number;
    limit?: number;
}): Promise<AIRiskPrediction[]> {
    return apiGet<AIRiskPrediction[]>(`${BASE_URL}/risks/tasks`, params as Record<string, string | number | boolean | undefined>);
}

/**
 * Get risk prediction for a specific task
 */
export async function getTaskRiskPrediction(taskId: string): Promise<AIRiskPrediction> {
    return apiGet<AIRiskPrediction>(`${BASE_URL}/risks/tasks/${taskId}`);
}

/**
 * Get risk predictions for projects
 */
export async function getProjectRiskPredictions(params?: {
    min_risk_score?: number;
    limit?: number;
}): Promise<AIRiskPrediction[]> {
    return apiGet<AIRiskPrediction[]>(`${BASE_URL}/risks/projects`, params as Record<string, string | number | boolean | undefined>);
}

/**
 * Get risk prediction for a specific project
 */
export async function getProjectRiskPrediction(projectId: string): Promise<AIRiskPrediction> {
    return apiGet<AIRiskPrediction>(`${BASE_URL}/risks/projects/${projectId}`);
}

// =============== Workload Optimization ===============

/**
 * Get workload optimization suggestions
 */
export async function getWorkloadOptimizations(params?: {
    team_id?: string;
    project_id?: string;
}): Promise<AIWorkloadSuggestion[]> {
    return apiGet<AIWorkloadSuggestion[]>(`${BASE_URL}/workload/optimize`, params as Record<string, string | number | boolean | undefined>);
}

/**
 * Apply workload suggestion
 */
export async function applyWorkloadSuggestion(
    taskId: string,
    suggestion: AIWorkloadSuggestion
): Promise<{ applied: boolean; message: string }> {
    return apiPost(`${BASE_URL}/workload/apply/${taskId}`, suggestion);
}

/**
 * Get team balance analysis
 */
export async function getTeamBalanceAnalysis(teamId: string): Promise<{
    team_id: string;
    balance_score: number;
    issues: Array<{
        type: "overloaded" | "underutilized" | "skill_mismatch";
        user_id: string;
        user_name: string;
        details: string;
    }>;
    suggestions: AIWorkloadSuggestion[];
}> {
    return apiGet(`${BASE_URL}/workload/team/${teamId}/balance`);
}

// =============== Natural Language Processing ===============

/**
 * Parse task from natural language
 */
export async function parseTaskFromNL(text: string): Promise<AITaskParsed> {
    return apiPost<AITaskParsed>(`${BASE_URL}/parse/task`, { text });
}

/**
 * Create task from natural language
 */
export async function createTaskFromNL(
    text: string,
    projectId?: string
): Promise<{
    task_id: string;
    parsed: AITaskParsed;
    created: boolean;
}> {
    return apiPost(`${BASE_URL}/create/task`, { text, project_id: projectId });
}

/**
 * Parse multiple tasks from text
 */
export async function parseMultipleTasksFromNL(text: string): Promise<AITaskParsed[]> {
    return apiPost<AITaskParsed[]>(`${BASE_URL}/parse/tasks`, { text });
}

// =============== AI Insights ===============

/**
 * Get AI insights for dashboard
 */
export async function getAIInsights(params?: {
    type?: "risk" | "opportunity" | "recommendation" | "trend";
    severity?: "info" | "warning" | "critical";
    limit?: number;
}): Promise<AIInsight[]> {
    return apiGet<AIInsight[]>(`${BASE_URL}/insights`, params as Record<string, string | number | boolean | undefined>);
}

/**
 * Dismiss an insight
 */
export async function dismissInsight(insightId: string): Promise<void> {
    return apiPost(`${BASE_URL}/insights/${insightId}/dismiss`, {});
}

/**
 * Take action on an insight
 */
export async function takeInsightAction(
    insightId: string,
    actionType: string,
    params: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
    return apiPost(`${BASE_URL}/insights/${insightId}/action`, { action_type: actionType, params });
}

// =============== AI Project Assistant ===============

/**
 * Start or continue AI conversation
 */
export async function chatWithAI(
    message: string,
    conversationId?: string,
    context?: {
        project_id?: string;
        task_id?: string;
    }
): Promise<{
    conversation_id: string;
    response: string;
    actions_taken?: Array<{
        type: string;
        entity_id: string;
        description: string;
    }>;
    suggestions?: string[];
}> {
    return apiPost(`${BASE_URL}/chat`, {
        message,
        conversation_id: conversationId,
        context,
    });
}

/**
 * Get conversation history
 */
export async function getAIConversation(conversationId: string): Promise<AIConversation> {
    return apiGet<AIConversation>(`${BASE_URL}/chat/${conversationId}`);
}

/**
 * Get AI-generated project summary
 */
export async function getProjectSummary(projectId: string): Promise<{
    summary: string;
    highlights: string[];
    concerns: string[];
    next_steps: string[];
}> {
    return apiGet(`${BASE_URL}/summary/project/${projectId}`);
}

/**
 * Get AI-generated status update
 */
export async function generateStatusUpdate(params: {
    project_id?: string;
    team_id?: string;
    period?: "daily" | "weekly";
}): Promise<{
    update_text: string;
    key_accomplishments: string[];
    upcoming_items: string[];
    blockers: string[];
}> {
    return apiPost(`${BASE_URL}/generate/status-update`, params);
}

// =============== Smart Scheduling ===============

/**
 * Get smart scheduling suggestions
 */
export async function getSchedulingSuggestions(taskId: string): Promise<{
    current_due_date?: string;
    suggested_dates: Array<{
        date: string;
        score: number;
        reasoning: string;
    }>;
    dependencies_considered: string[];
    workload_considered: boolean;
}> {
    return apiGet(`${BASE_URL}/schedule/${taskId}`);
}

/**
 * Auto-schedule tasks in a project
 */
export async function autoScheduleProject(
    projectId: string,
    options?: {
        respect_dependencies?: boolean;
        balance_workload?: boolean;
        start_date?: string;
    }
): Promise<{
    scheduled_tasks: number;
    schedule: Array<{
        task_id: string;
        task_name: string;
        assigned_to: string;
        start_date: string;
        end_date: string;
    }>;
}> {
    return apiPost(`${BASE_URL}/schedule/project/${projectId}`, options || {});
}
