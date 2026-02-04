/**
 * Notifications API Service
 */

import { apiGet, apiPut, apiPost, apiDelete } from "./api";

const BASE_URL = "/notifications";

// =============== Types ===============

export type NotificationType = "task" | "mention" | "comment" | "system" | "reminder" | "approval" | "task_assigned" | "due_soon" | "overdue";

export interface Notification {
    id: string;
    type: NotificationType | string;
    title: string;
    message?: string;
    link?: string;
    is_read: boolean;
    created_at: string;
    read_at?: string;
    data?: Record<string, unknown>;
}

export interface NotificationsResponse {
    items: Notification[];
    total: number;
    unread_count: number;
}

// =============== API Functions ===============

/**
 * Get all notifications for current user
 */
export async function getNotifications(params?: {
    skip?: number;
    limit?: number;
    unread_only?: boolean;
}): Promise<NotificationsResponse> {
    return apiGet<NotificationsResponse>(BASE_URL, params);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
    const response = await apiGet<{ unread_count: number }>(`${BASE_URL}/unread-count`);
    return response.unread_count;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(id: string): Promise<{ message: string }> {
    return apiPut<{ message: string }>(`${BASE_URL}/${id}/read`, {});
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
    await apiPut(`${BASE_URL}/mark-all-read`, {});
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}

/**
 * Create sample notifications for testing
 */
export async function createSampleNotifications(): Promise<{ message: string; count: number }> {
    return apiPost<{ message: string; count: number }>(`${BASE_URL}/sample`, {});
}

