/**
 * View Customization Service
 * Handles saving, loading, and sharing custom views
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export interface ViewColumn {
    id: string;
    label: string;
    visible: boolean;
    width?: number;
    order: number;
}

export interface ViewFilter {
    field: string;
    operator: "equals" | "contains" | "gt" | "lt" | "gte" | "lte" | "in" | "not_in";
    value: string | number | boolean | string[];
}

export interface ViewSort {
    field: string;
    direction: "asc" | "desc";
}

export interface ViewGrouping {
    field: string;
    collapsed?: string[];
}

export interface SavedView {
    id: string;
    name: string;
    description?: string;
    type: "list" | "kanban" | "timeline" | "calendar" | "swimlane";
    isDefault: boolean;
    isShared: boolean;
    ownerId: string;
    ownerName?: string;
    columns: ViewColumn[];
    filters: ViewFilter[];
    sorts: ViewSort[];
    grouping?: ViewGrouping;
    colorBy?: string;
    createdAt: string;
    updatedAt: string;
    sharedWith?: { userId: string; permission: "view" | "edit" }[];
}

export interface CreateViewRequest {
    name: string;
    description?: string;
    type: SavedView["type"];
    isDefault?: boolean;
    isShared?: boolean;
    columns: ViewColumn[];
    filters: ViewFilter[];
    sorts: ViewSort[];
    grouping?: ViewGrouping;
    colorBy?: string;
}

export interface UpdateViewRequest extends Partial<CreateViewRequest> {
    id: string;
}

export interface ShareViewRequest {
    viewId: string;
    userIds: string[];
    permission: "view" | "edit";
}

// =============== API Functions ===============

/**
 * Get all saved views for current user
 */
export async function getSavedViews(
    type?: SavedView["type"]
): Promise<SavedView[]> {
    return apiGet<SavedView[]>("/api/views", type ? { type } : undefined);
}

/**
 * Get a specific saved view by ID
 */
export async function getViewById(
    viewId: string
): Promise<SavedView> {
    return apiGet<SavedView>(`/api/views/${viewId}`);
}

/**
 * Create a new saved view
 */
export async function createView(
    data: CreateViewRequest
): Promise<SavedView> {
    return apiPost<SavedView>("/api/views", data);
}

/**
 * Update an existing view
 */
export async function updateView(
    data: UpdateViewRequest
): Promise<SavedView> {
    return apiPut<SavedView>(`/api/views/${data.id}`, data);
}

/**
 * Delete a saved view
 */
export async function deleteView(
    viewId: string
): Promise<void> {
    return apiDelete(`/api/views/${viewId}`);
}

/**
 * Set a view as the default for its type
 */
export async function setDefaultView(
    viewId: string
): Promise<SavedView> {
    return apiPost<SavedView>(`/api/views/${viewId}/set-default`, {});
}

/**
 * Share a view with other users
 */
export async function shareView(
    data: ShareViewRequest
): Promise<SavedView> {
    return apiPost<SavedView>(`/api/views/${data.viewId}/share`, {
        userIds: data.userIds,
        permission: data.permission,
    });
}

/**
 * Unshare a view (remove all shares or specific users)
 */
export async function unshareView(
    viewId: string,
    userIds?: string[]
): Promise<SavedView> {
    return apiPost<SavedView>(`/api/views/${viewId}/unshare`, { userIds });
}

/**
 * Duplicate a view
 */
export async function duplicateView(
    viewId: string,
    newName?: string
): Promise<SavedView> {
    return apiPost<SavedView>(`/api/views/${viewId}/duplicate`, { name: newName });
}

/**
 * Get shared views available to current user
 */
export async function getSharedViews(
    type?: SavedView["type"]
): Promise<SavedView[]> {
    return apiGet<SavedView[]>("/api/views/shared", type ? { type } : undefined);
}

// =============== Local Storage Helpers ===============

const VIEWS_STORAGE_KEY = "savedViews";
const ACTIVE_VIEW_KEY = "activeView";

/**
 * Save views to local storage (for offline support)
 */
export function cacheViewsLocally(views: SavedView[]): void {
    if (typeof window !== "undefined") {
        localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(views));
    }
}

/**
 * Get cached views from local storage
 */
export function getCachedViews(): SavedView[] {
    if (typeof window === "undefined") return [];
    const cached = localStorage.getItem(VIEWS_STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
}

/**
 * Save active view ID to local storage
 */
export function setActiveViewId(type: SavedView["type"], viewId: string): void {
    if (typeof window !== "undefined") {
        const activeViews = JSON.parse(localStorage.getItem(ACTIVE_VIEW_KEY) || "{}");
        activeViews[type] = viewId;
        localStorage.setItem(ACTIVE_VIEW_KEY, JSON.stringify(activeViews));
    }
}

/**
 * Get active view ID from local storage
 */
export function getActiveViewId(type: SavedView["type"]): string | null {
    if (typeof window === "undefined") return null;
    const activeViews = JSON.parse(localStorage.getItem(ACTIVE_VIEW_KEY) || "{}");
    return activeViews[type] || null;
}

// =============== Default View Configurations ===============

export const defaultListColumns: ViewColumn[] = [
    { id: "name", label: "Task Name", visible: true, order: 0 },
    { id: "status", label: "Status", visible: true, order: 1 },
    { id: "priority", label: "Priority", visible: true, order: 2 },
    { id: "dueDate", label: "Due Date", visible: true, order: 3 },
    { id: "assignee", label: "Assignee", visible: true, order: 4 },
    { id: "project", label: "Project", visible: true, order: 5 },
    { id: "estimatedHours", label: "Est. Hours", visible: false, order: 6 },
    { id: "tags", label: "Tags", visible: false, order: 7 },
    { id: "createdAt", label: "Created", visible: false, order: 8 },
];

export const defaultKanbanColumns: ViewColumn[] = [
    { id: "priority", label: "Priority Badge", visible: true, order: 0 },
    { id: "dueDate", label: "Due Date", visible: true, order: 1 },
    { id: "assignee", label: "Assignee Avatar", visible: true, order: 2 },
    { id: "tags", label: "Tags", visible: false, order: 3 },
    { id: "estimatedHours", label: "Est. Hours", visible: false, order: 4 },
];

export function getDefaultView(type: SavedView["type"]): Omit<SavedView, "id" | "ownerId" | "createdAt" | "updatedAt"> {
    return {
        name: `Default ${type.charAt(0).toUpperCase() + type.slice(1)} View`,
        type,
        isDefault: true,
        isShared: false,
        columns: type === "list" ? defaultListColumns : defaultKanbanColumns,
        filters: [],
        sorts: [{ field: "dueDate", direction: "asc" }],
    };
}
