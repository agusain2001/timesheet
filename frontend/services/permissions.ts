import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}): Promise<any> {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(opts.headers || {}),
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Request failed");
    }
    return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Permission {
    name: string;
    display_name?: string;
    description?: string;
    category?: string;
}

export interface Role {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    level: string;
    permissions?: Permission[];
}

export interface MyPermissions {
    user_id: string;
    permissions: string[];
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export async function getMyPermissions(scopeType?: string, scopeId?: string): Promise<MyPermissions> {
    let qs = "";
    if (scopeType) qs += `?scope_type=${scopeType}`;
    if (scopeId) qs += `${qs ? "&" : "?"}scope_id=${scopeId}`;
    return apiFetch(`/permissions/my-permissions${qs}`);
}

export async function checkPermission(permission: string, resourceType?: string, resourceId?: string): Promise<{ permission: string; granted: boolean }> {
    let qs = `?resource_type=${resourceType || ""}&resource_id=${resourceId || ""}`;
    return apiFetch(`/permissions/check/${permission}${qs}`);
}

export async function getAllPermissions(): Promise<Permission[]> {
    const data = await apiFetch("/api/permissions/");
    return Array.isArray(data) ? data : (data?.permissions ?? []);
}

export async function getRoles(workspaceId?: string): Promise<Role[]> {
    const qs = workspaceId ? `?workspace_id=${workspaceId}` : "";
    const data = await apiFetch(`/permissions/roles${qs}`);
    return Array.isArray(data) ? data : (data?.roles ?? []);
}

export async function getMyRoles(): Promise<Role[]> {
    const data = await apiFetch("/api/permissions/roles/my-roles");
    return Array.isArray(data) ? data : (data?.roles ?? []);
}

export async function createRole(data: {
    name: string;
    display_name: string;
    description: string;
    level: string;
    permission_names: string[];
}): Promise<{ success: boolean }> {
    return apiFetch("/api/permissions/roles", { method: "POST", body: JSON.stringify(data) });
}

export async function assignRole(data: {
    user_id: string;
    role_id: string;
    scope_type?: string;
    scope_id?: string;
}): Promise<{ success: boolean }> {
    return apiFetch("/api/permissions/roles/assign", { method: "POST", body: JSON.stringify(data) });
}

export async function revokeRole(data: {
    user_id: string;
    role_id: string;
    scope_type?: string;
    scope_id?: string;
}): Promise<{ success: boolean }> {
    return apiFetch("/api/permissions/roles/revoke", { method: "DELETE", body: JSON.stringify(data) });
}
