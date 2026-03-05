/**
 * Page Access API Service
 * Manages per-user page access grants (admin-controlled).
 */

import { apiGet, apiPut } from "./api";

const BASE_URL = "/api/page-access";

export interface PageAccessResponse {
    user_id: string;
    role: string;
    accessible_pages: string[];
    /** Only present when queried by admin — shows toggle state for restricted pages */
    restricted_pages_status?: Record<string, boolean>;
}

export interface PageAccessUpdate {
    pages: Record<string, boolean>;
}

/**
 * Get the current user's accessible pages.
 */
export async function getMyPageAccess(): Promise<PageAccessResponse> {
    return apiGet<PageAccessResponse>(`${BASE_URL}/me`);
}

/**
 * Get a specific user's page access (admin only).
 */
export async function getUserPageAccess(userId: string): Promise<PageAccessResponse> {
    return apiGet<PageAccessResponse>(`${BASE_URL}/${userId}`);
}

/**
 * Update page access grants for a user (admin only).
 * @param userId - The target user's ID
 * @param pages  - Map of pageKey → granted (true/false)
 */
export async function updateUserPageAccess(
    userId: string,
    pages: Record<string, boolean>
): Promise<PageAccessResponse> {
    return apiPut<PageAccessResponse>(`${BASE_URL}/${userId}`, { pages });
}

/**
 * Update a user's role (admin only).
 * Allowed roles: employee, manager, admin
 */
export async function updateUserRole(
    userId: string,
    newRole: string
): Promise<{ success: boolean; old_role: string; new_role: string }> {
    return apiPut(`/api/users/${userId}/role`, { new_role: newRole });
}
