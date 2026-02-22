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

export interface GDPRConsent {
    marketing_emails: boolean;
    analytics_tracking: boolean;
}

export interface GDPRExportData {
    user: Record<string, unknown>;
    tasks?: unknown[];
    timesheets?: unknown[];
    comments?: unknown[];
    [key: string]: unknown;
}

// ─── GDPR Endpoints ───────────────────────────────────────────────────────────

export async function exportMyData(format: "json" | "zip" = "json"): Promise<GDPRExportData> {
    return apiFetch(`/gdpr/my-data?format=${format}`);
}

export async function deleteMyData(confirm: boolean, keepAnonymized = true): Promise<{ success: boolean; message?: string }> {
    return apiFetch("/gdpr/my-data", {
        method: "DELETE",
        body: JSON.stringify({ confirm, keep_anonymized: keepAnonymized }),
    });
}

export async function getConsent(): Promise<GDPRConsent> {
    return apiFetch("/gdpr/consent");
}

export async function updateConsent(data: Partial<GDPRConsent>): Promise<GDPRConsent> {
    return apiFetch("/gdpr/consent", { method: "PUT", body: JSON.stringify(data) });
}

export async function getAccessLog(limit = 50): Promise<unknown[]> {
    const data = await apiFetch(`/gdpr/access-log?limit=${limit}`);
    return Array.isArray(data) ? data : (data?.items ?? []);
}
