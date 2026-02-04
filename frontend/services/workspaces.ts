/**
 * Workspaces API Service
 * Multi-tenant workspace/organization management
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export interface Workspace {
    id: string;
    name: string;
    slug: string;
    description?: string;
    owner_id?: string;
    logo_url?: string;
    settings?: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    members?: WorkspaceMember[];
}

export interface WorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: "admin" | "member" | "viewer";
    permissions?: Record<string, boolean>;
    is_active: boolean;
    joined_at: string;
    user?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
    };
}

export interface WorkspaceCreate {
    name: string;
    slug?: string;
    description?: string;
    logo_url?: string;
    settings?: Record<string, unknown>;
}

export interface WorkspaceUpdate {
    name?: string;
    slug?: string;
    description?: string;
    logo_url?: string;
    settings?: Record<string, unknown>;
    is_active?: boolean;
}

export interface WorkspaceInvite {
    email: string;
    role?: "admin" | "member" | "viewer";
    message?: string;
}

export interface BulkInviteResult {
    successful: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
}

export interface WorkspacesParams {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    [key: string]: string | number | boolean | undefined;
}

const BASE_URL = "/workspaces";

// =============== Workspace CRUD ===============

/**
 * Get all workspaces for current user
 */
export async function getWorkspaces(params?: WorkspacesParams): Promise<Workspace[]> {
    return apiGet<Workspace[]>(BASE_URL, params);
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspace(id: string): Promise<Workspace> {
    return apiGet<Workspace>(`${BASE_URL}/${id}`);
}

/**
 * Get workspace by slug
 */
export async function getWorkspaceBySlug(slug: string): Promise<Workspace> {
    return apiGet<Workspace>(`${BASE_URL}/slug/${slug}`);
}

/**
 * Create a new workspace
 */
export async function createWorkspace(data: WorkspaceCreate): Promise<Workspace> {
    return apiPost<Workspace>(BASE_URL, data);
}

/**
 * Update a workspace
 */
export async function updateWorkspace(id: string, data: WorkspaceUpdate): Promise<Workspace> {
    return apiPut<Workspace>(`${BASE_URL}/${id}`, data);
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}

// =============== Member Management ===============

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return apiGet<WorkspaceMember[]>(`${BASE_URL}/${workspaceId}/members`);
}

/**
 * Invite a user to workspace
 */
export async function inviteToWorkspace(
    workspaceId: string,
    invite: WorkspaceInvite
): Promise<{ message: string; invite_id: string }> {
    return apiPost(`${BASE_URL}/${workspaceId}/invite`, invite);
}

/**
 * Bulk invite users via emails or CSV
 */
export async function bulkInviteToWorkspace(
    workspaceId: string,
    emails: string[],
    role?: "admin" | "member" | "viewer"
): Promise<BulkInviteResult> {
    return apiPost(`${BASE_URL}/${workspaceId}/bulk-invite`, { emails, role });
}

/**
 * Update member role
 */
export async function updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: "admin" | "member" | "viewer"
): Promise<WorkspaceMember> {
    return apiPut<WorkspaceMember>(`${BASE_URL}/${workspaceId}/members/${memberId}`, { role });
}

/**
 * Remove member from workspace
 */
export async function removeMember(workspaceId: string, memberId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${workspaceId}/members/${memberId}`);
}

/**
 * Leave workspace (current user)
 */
export async function leaveWorkspace(workspaceId: string): Promise<void> {
    return apiPost(`${BASE_URL}/${workspaceId}/leave`, {});
}
