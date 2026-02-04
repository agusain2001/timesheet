/**
 * Automation & Rules Engine API Service
 * If-this-then-that rules, reminders, escalations
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export type TriggerEvent =
    | "task_created"
    | "task_updated"
    | "task_status_changed"
    | "task_assigned"
    | "task_due_soon"
    | "task_overdue"
    | "task_completed"
    | "comment_added"
    | "attachment_added"
    | "project_status_changed"
    | "expense_submitted"
    | "expense_approved"
    | "timesheet_submitted";

export type ActionType =
    | "send_notification"
    | "send_email"
    | "assign_task"
    | "change_status"
    | "change_priority"
    | "add_label"
    | "create_subtask"
    | "notify_manager"
    | "escalate"
    | "webhook";

export interface AutomationCondition {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
    value: string | number | boolean | null;
}

export interface AutomationAction {
    type: ActionType;
    params: Record<string, unknown>;
}

export interface AutomationRule {
    id: string;
    name: string;
    description?: string;
    trigger_event: TriggerEvent;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    is_active: boolean;
    project_id?: string;
    organization_id?: string;
    created_by_id: string;
    created_at: string;
    updated_at: string;
    last_triggered_at?: string;
    trigger_count: number;
}

export interface AutomationRuleCreate {
    name: string;
    description?: string;
    trigger_event: TriggerEvent;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    project_id?: string;
    is_active?: boolean;
}

export interface AutomationRuleUpdate extends Partial<AutomationRuleCreate> {
    is_active?: boolean;
}

export interface AutomationLog {
    id: string;
    rule_id: string;
    rule_name: string;
    trigger_event: TriggerEvent;
    entity_type: string;
    entity_id: string;
    actions_executed: string[];
    status: "success" | "failed" | "partial";
    error_message?: string;
    executed_at: string;
}

export interface ReminderRule {
    id: string;
    entity_type: "task" | "project" | "milestone";
    trigger_type: "before_due" | "on_due" | "after_due" | "before_start";
    hours_offset: number;
    notify_assignee: boolean;
    notify_owner: boolean;
    notify_manager: boolean;
    notification_message?: string;
    is_active: boolean;
    project_id?: string;
    created_at: string;
}

export interface ReminderRuleCreate {
    entity_type: "task" | "project" | "milestone";
    trigger_type: "before_due" | "on_due" | "after_due" | "before_start";
    hours_offset: number;
    notify_assignee?: boolean;
    notify_owner?: boolean;
    notify_manager?: boolean;
    notification_message?: string;
    project_id?: string;
}

export interface EscalationRule {
    id: string;
    name: string;
    entity_type: "task" | "expense" | "timesheet";
    condition_type: "overdue_hours" | "blocked_hours" | "pending_approval_hours";
    threshold_hours: number;
    escalate_to: "team_lead" | "project_manager" | "department_manager" | "specific_user";
    escalate_to_user_id?: string;
    notification_message?: string;
    is_active: boolean;
    project_id?: string;
    created_at: string;
}

export interface EscalationRuleCreate {
    name: string;
    entity_type: "task" | "expense" | "timesheet";
    condition_type: "overdue_hours" | "blocked_hours" | "pending_approval_hours";
    threshold_hours: number;
    escalate_to: "team_lead" | "project_manager" | "department_manager" | "specific_user";
    escalate_to_user_id?: string;
    notification_message?: string;
    project_id?: string;
}

export interface AutomationRulesParams {
    skip?: number;
    limit?: number;
    project_id?: string;
    trigger_event?: TriggerEvent;
    is_active?: boolean;
    [key: string]: string | number | boolean | undefined;
}

const BASE_URL = "/automation";

// =============== Automation Rules ===============

/**
 * Get all automation rules
 */
export async function getAutomationRules(params?: AutomationRulesParams): Promise<AutomationRule[]> {
    return apiGet<AutomationRule[]>(`${BASE_URL}/rules`, params);
}

/**
 * Get automation rule by ID
 */
export async function getAutomationRule(id: string): Promise<AutomationRule> {
    return apiGet<AutomationRule>(`${BASE_URL}/rules/${id}`);
}

/**
 * Create automation rule
 */
export async function createAutomationRule(data: AutomationRuleCreate): Promise<AutomationRule> {
    return apiPost<AutomationRule>(`${BASE_URL}/rules`, data);
}

/**
 * Update automation rule
 */
export async function updateAutomationRule(id: string, data: AutomationRuleUpdate): Promise<AutomationRule> {
    return apiPut<AutomationRule>(`${BASE_URL}/rules/${id}`, data);
}

/**
 * Delete automation rule
 */
export async function deleteAutomationRule(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/rules/${id}`);
}

/**
 * Toggle rule active status
 */
export async function toggleAutomationRule(id: string, isActive: boolean): Promise<AutomationRule> {
    return apiPut<AutomationRule>(`${BASE_URL}/rules/${id}/toggle`, { is_active: isActive });
}

/**
 * Test automation rule (dry run)
 */
export async function testAutomationRule(
    id: string,
    testData: Record<string, unknown>
): Promise<{
    would_trigger: boolean;
    conditions_matched: boolean[];
    actions_would_execute: string[];
}> {
    return apiPost(`${BASE_URL}/rules/${id}/test`, testData);
}

// =============== Automation Logs ===============

/**
 * Get automation execution logs
 */
export async function getAutomationLogs(params?: {
    rule_id?: string;
    status?: "success" | "failed" | "partial";
    from_date?: string;
    to_date?: string;
    skip?: number;
    limit?: number;
}): Promise<AutomationLog[]> {
    return apiGet<AutomationLog[]>(`${BASE_URL}/logs`, params as Record<string, string | number | boolean | undefined>);
}

// =============== Reminder Rules ===============

/**
 * Get all reminder rules
 */
export async function getReminderRules(projectId?: string): Promise<ReminderRule[]> {
    const params: Record<string, string | undefined> = { project_id: projectId };
    return apiGet<ReminderRule[]>(`${BASE_URL}/reminders`, params);
}

/**
 * Create reminder rule
 */
export async function createReminderRule(data: ReminderRuleCreate): Promise<ReminderRule> {
    return apiPost<ReminderRule>(`${BASE_URL}/reminders`, data);
}

/**
 * Update reminder rule
 */
export async function updateReminderRule(
    id: string,
    data: Partial<ReminderRuleCreate>
): Promise<ReminderRule> {
    return apiPut<ReminderRule>(`${BASE_URL}/reminders/${id}`, data);
}

/**
 * Delete reminder rule
 */
export async function deleteReminderRule(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/reminders/${id}`);
}

// =============== Escalation Rules ===============

/**
 * Get all escalation rules
 */
export async function getEscalationRules(projectId?: string): Promise<EscalationRule[]> {
    const params: Record<string, string | undefined> = { project_id: projectId };
    return apiGet<EscalationRule[]>(`${BASE_URL}/escalations`, params);
}

/**
 * Create escalation rule
 */
export async function createEscalationRule(data: EscalationRuleCreate): Promise<EscalationRule> {
    return apiPost<EscalationRule>(`${BASE_URL}/escalations`, data);
}

/**
 * Update escalation rule
 */
export async function updateEscalationRule(
    id: string,
    data: Partial<EscalationRuleCreate>
): Promise<EscalationRule> {
    return apiPut<EscalationRule>(`${BASE_URL}/escalations/${id}`, data);
}

/**
 * Delete escalation rule
 */
export async function deleteEscalationRule(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/escalations/${id}`);
}

// =============== Templates ===============

/**
 * Get available rule templates
 */
export async function getRuleTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    trigger_event: TriggerEvent;
    category: string;
    template_data: Omit<AutomationRuleCreate, "name">;
}>> {
    return apiGet(`${BASE_URL}/templates`);
}

/**
 * Create rule from template
 */
export async function createRuleFromTemplate(
    templateId: string,
    name: string,
    projectId?: string
): Promise<AutomationRule> {
    return apiPost<AutomationRule>(`${BASE_URL}/templates/${templateId}/create`, {
        name,
        project_id: projectId,
    });
}
