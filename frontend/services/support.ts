/**
 * Support API Service
 * For managing support requests
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export interface SupportRequest {
    id: string;
    user_id: string;
    message: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    created_at: string;
    updated_at?: string;
    resolved_at?: string;
    image_url?: string;
    user?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
    };
}

export interface SupportRequestCreate {
    message: string;
    image_url?: string;
}

export interface SupportRequestUpdate {
    message?: string;
    status?: "open" | "in_progress" | "resolved" | "closed";
}

// =============== API Functions ===============

const BASE_URL = "/support";

/**
 * Get all support requests (admin/manager) or own requests (employee)
 */
export async function getSupportRequests(params?: {
    user_id?: string;
    status_filter?: string;
    skip?: number;
    limit?: number;
}): Promise<SupportRequest[]> {
    return apiGet<SupportRequest[]>(BASE_URL, params);
}

/**
 * Get current user's support requests
 */
export async function getMySupportRequests(): Promise<SupportRequest[]> {
    return apiGet<SupportRequest[]>(`${BASE_URL}/my`);
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
    return apiPost<SupportRequest>(BASE_URL, data);
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
