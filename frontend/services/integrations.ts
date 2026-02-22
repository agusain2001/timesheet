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
    if (res.status === 204) return null;
    return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Webhook {
    id: string;
    name: string;
    url: string;
    events: string[];
    is_active: boolean;
    last_triggered_at?: string;
    failure_count: number;
    created_at: string;
}

export interface WebhookCreate {
    name: string;
    url: string;
    events: string[];
    secret?: string;
    project_id?: string;
}

export interface WebhookLog {
    id: string;
    event_type: string;
    status_code?: number;
    is_success: boolean;
    response_time_ms?: number;
    error_message?: string;
    created_at: string;
}

export interface Integration {
    id: string;
    name: string;
    type: string;
    provider: string;
    is_active: boolean;
    last_sync_at?: string;
    created_at: string;
}

export interface IntegrationCreate {
    name: string;
    type: string;
    provider: string;
    config?: Record<string, unknown>;
}

// ─── Webhook Endpoints ────────────────────────────────────────────────────────

export async function listWebhooks(projectId?: string): Promise<Webhook[]> {
    const qs = projectId ? `?project_id=${projectId}` : "";
    const data = await apiFetch(`/integrations/webhooks${qs}`);
    return Array.isArray(data) ? data : [];
}

export async function createWebhook(data: WebhookCreate): Promise<Webhook> {
    return apiFetch("/integrations/webhooks", { method: "POST", body: JSON.stringify(data) });
}

export async function updateWebhook(id: string, data: Partial<WebhookCreate & { is_active: boolean }>): Promise<Webhook> {
    return apiFetch(`/integrations/webhooks/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteWebhook(id: string): Promise<void> {
    return apiFetch(`/integrations/webhooks/${id}`, { method: "DELETE" });
}

export async function testWebhook(id: string): Promise<{ message: string }> {
    return apiFetch(`/integrations/webhooks/${id}/test`, { method: "POST" });
}

export async function getWebhookLogs(id: string, limit = 20): Promise<WebhookLog[]> {
    const data = await apiFetch(`/integrations/webhooks/${id}/logs?limit=${limit}`);
    return Array.isArray(data) ? data : [];
}

// ─── Integration Endpoints ────────────────────────────────────────────────────

export async function listIntegrations(type?: string): Promise<Integration[]> {
    const qs = type ? `?type_filter=${type}` : "";
    const data = await apiFetch(`/integrations/integrations${qs}`);
    return Array.isArray(data) ? data : [];
}

export async function createIntegration(data: IntegrationCreate): Promise<Integration> {
    return apiFetch("/integrations/integrations", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteIntegration(id: string): Promise<void> {
    return apiFetch(`/integrations/integrations/${id}`, { method: "DELETE" });
}
