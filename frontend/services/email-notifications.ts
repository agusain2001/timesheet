/**
 * Email Notification Service
 * Handles email notification preferences and sending
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export interface EmailNotificationPreferences {
    taskAssignments: boolean;
    taskComments: boolean;
    taskMentions: boolean;
    taskDueReminders: boolean;
    taskOverdue: boolean;
    projectUpdates: boolean;
    weeklyDigest: boolean;
    dailySummary: boolean;
    approvalRequests: boolean;
    systemAlerts: boolean;
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    variables: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface EmailLog {
    id: string;
    recipientEmail: string;
    recipientName: string;
    subject: string;
    templateId?: string;
    status: "pending" | "sent" | "failed" | "bounced";
    sentAt?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
}

export interface SendEmailRequest {
    to: string | string[];
    subject: string;
    templateId?: string;
    templateData?: Record<string, unknown>;
    htmlContent?: string;
    textContent?: string;
    priority?: "low" | "normal" | "high";
    scheduledFor?: string;
}

export interface ReminderSettings {
    enabled: boolean;
    daysBeforeDue: number[];
    time: string; // HH:mm format
    timezone: string;
}

export interface DigestSettings {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string;
    timezone: string;
    includeOverdue: boolean;
    includeUpcoming: boolean;
    includeCompleted: boolean;
}

// =============== API Functions ===============

/**
 * Get email notification preferences
 */
export async function getEmailPreferences(): Promise<EmailNotificationPreferences> {
    return apiGet<EmailNotificationPreferences>("/api/notifications/email/preferences");
}

/**
 * Update email notification preferences
 */
export async function updateEmailPreferences(
    preferences: Partial<EmailNotificationPreferences>
): Promise<EmailNotificationPreferences> {
    return apiPut<EmailNotificationPreferences>(
        "/api/notifications/email/preferences",
        preferences
    );
}

/**
 * Get reminder settings
 */
export async function getReminderSettings(): Promise<ReminderSettings> {
    return apiGet<ReminderSettings>("/api/notifications/email/reminders");
}

/**
 * Update reminder settings
 */
export async function updateReminderSettings(
    settings: Partial<ReminderSettings>
): Promise<ReminderSettings> {
    return apiPut<ReminderSettings>("/api/notifications/email/reminders", settings);
}

/**
 * Get digest settings
 */
export async function getDigestSettings(): Promise<DigestSettings> {
    return apiGet<DigestSettings>("/api/notifications/email/digest");
}

/**
 * Update digest settings
 */
export async function updateDigestSettings(
    settings: Partial<DigestSettings>
): Promise<DigestSettings> {
    return apiPut<DigestSettings>("/api/notifications/email/digest", settings);
}

/**
 * Send a test email to verify settings
 */
export async function sendTestEmail(): Promise<{ success: boolean; message: string }> {
    return apiPost<{ success: boolean; message: string }>(
        "/api/notifications/email/test",
        {}
    );
}

/**
 * Get email logs for current user
 */
export async function getEmailLogs(
    page: number = 1,
    limit: number = 20
): Promise<{ logs: EmailLog[]; total: number; pages: number }> {
    return apiGet<{ logs: EmailLog[]; total: number; pages: number }>(
        "/api/notifications/email/logs",
        { page, limit }
    );
}

/**
 * Send a custom email (admin only)
 */
export async function sendEmail(
    request: SendEmailRequest
): Promise<{ success: boolean; emailId: string }> {
    return apiPost<{ success: boolean; emailId: string }>(
        "/api/notifications/email/send",
        request
    );
}

/**
 * Get available email templates
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
    return apiGet<EmailTemplate[]>("/api/notifications/email/templates");
}

/**
 * Schedule a reminder for a task
 */
export async function scheduleTaskReminder(
    taskId: string,
    reminderDate: string,
    message?: string
): Promise<{ success: boolean; reminderId: string }> {
    return apiPost<{ success: boolean; reminderId: string }>(
        `/api/tasks/${taskId}/reminders`,
        { reminderDate, message }
    );
}

/**
 * Cancel a scheduled reminder
 */
export async function cancelTaskReminder(
    taskId: string,
    reminderId: string
): Promise<void> {
    return apiDelete(`/api/tasks/${taskId}/reminders/${reminderId}`);
}

/**
 * Unsubscribe from a specific notification type via token
 */
export async function unsubscribeWithToken(
    token: string,
    type: keyof EmailNotificationPreferences
): Promise<{ success: boolean }> {
    return apiPost<{ success: boolean }>(
        "/api/notifications/email/unsubscribe",
        { token, type }
    );
}

// =============== Default Preferences ===============

export const defaultEmailPreferences: EmailNotificationPreferences = {
    taskAssignments: true,
    taskComments: true,
    taskMentions: true,
    taskDueReminders: true,
    taskOverdue: true,
    projectUpdates: false,
    weeklyDigest: true,
    dailySummary: false,
    approvalRequests: true,
    systemAlerts: true,
};

export const defaultReminderSettings: ReminderSettings = {
    enabled: true,
    daysBeforeDue: [1, 3],
    time: "09:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export const defaultDigestSettings: DigestSettings = {
    enabled: true,
    frequency: "weekly",
    dayOfWeek: 1, // Monday
    time: "08:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    includeOverdue: true,
    includeUpcoming: true,
    includeCompleted: false,
};
