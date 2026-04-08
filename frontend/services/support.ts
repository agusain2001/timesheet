/**
 * Support API Service
 * For managing support requests
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export interface SupportUser {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
}

export interface SupportRequest {
    id: string;
    user_id: string;
    subject?: string;
    message: string;
    priority: "urgent" | "high" | "normal" | "low";
    related_module?: string;
    image_url?: string;
    is_draft: boolean;
    recipient_ids?: string[];
    status: "open" | "in_progress" | "resolved" | "closed";
    created_at: string;
    updated_at?: string;
    resolved_at?: string;
    user?: SupportUser;
}

export interface SupportRequestCreate {
    message: string;
    subject?: string;
    priority?: string;
    related_module?: string;
    image_url?: string;
    is_draft?: boolean;
    recipient_ids?: string[];
}

export interface SupportRequestUpdate {
    message?: string;
    subject?: string;
    priority?: string;
    related_module?: string;
    image_url?: string;
    status?: "open" | "in_progress" | "resolved" | "closed";
    is_draft?: boolean;
    recipient_ids?: string[];
}

// =============== API Functions ===============

const BASE_URL = "/api/support";

/**
 * Get all support requests (admin/manager) or own requests (employee)
 */
export async function getSupportRequests(params?: {
    user_id?: string;
    status_filter?: string;
    priority?: string;
    is_draft?: boolean;
    skip?: number;
    limit?: number;
}): Promise<SupportRequest[]> {
    return apiGet<SupportRequest[]>(`${BASE_URL}/`, params as Record<string, string | number | boolean | undefined>);
}

/**
 * Get current user's support requests
 */
export async function getMySupportRequests(): Promise<SupportRequest[]> {
    return apiGet<SupportRequest[]>(`${BASE_URL}/my`);
}

/**
 * Get available users for recipient picker
 */
export async function getSupportUsers(search?: string): Promise<SupportUser[]> {
    return apiGet<SupportUser[]>(`${BASE_URL}/users-list`, search ? { search } : undefined);
}

/**
 * Get a single support request by ID
 */
export async function getSupportRequest(id: string): Promise<SupportRequest> {
    return apiGet<SupportRequest>(`${BASE_URL}/${id}`);
}

/**
 * Create a new support request
 */
export async function createSupportRequest(data: SupportRequestCreate): Promise<SupportRequest> {
    return apiPost<SupportRequest>(`${BASE_URL}/`, data);
}

/**
 * Update a support request
 */
export async function updateSupportRequest(id: string, data: SupportRequestUpdate): Promise<SupportRequest> {
    return apiPut<SupportRequest>(`${BASE_URL}/${id}`, data);
}

/**
 * Delete a support request
 */
export async function deleteSupportRequest(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}
