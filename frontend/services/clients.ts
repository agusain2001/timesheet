/**
 * Clients API Service
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";
import type { Client, ClientCreate, ClientUpdate, ClientProject } from "@/types/api";

const BASE_URL = "/api/clients";

export interface ClientsParams {
    skip?: number;
    limit?: number;
    region?: string;
    sector?: string;
    search?: string;
    [key: string]: string | number | boolean | undefined;
}

/**
 * Get all clients with optional filters
 */
export async function getClients(params?: ClientsParams): Promise<Client[]> {
    return apiGet<Client[]>(BASE_URL, params);
}

/**
 * Get a single client by ID
 */
export async function getClient(id: string): Promise<Client> {
    return apiGet<Client>(`${BASE_URL}/${id}`);
}

/**
 * Create a new client
 */
export async function createClient(data: ClientCreate): Promise<Client> {
    return apiPost<Client>(BASE_URL, data);
}

/**
 * Update an existing client
 */
export async function updateClient(
    id: string,
    data: ClientUpdate,
): Promise<Client> {
    return apiPut<Client>(`${BASE_URL}/${id}`, data);
}

/**
 * Delete a client
 */
export async function deleteClient(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}

/**
 * Get all projects linked to a client
 */
export async function getClientProjects(clientId: string): Promise<ClientProject[]> {
    return apiGet<ClientProject[]>(`${BASE_URL}/${clientId}/projects`);
}

/**
 * Bulk delete multiple clients
 */
export async function bulkDeleteClients(clientIds: string[]): Promise<{ deleted: number; failed: string[] }> {
    return apiPost<{ deleted: number; failed: string[] }>(`${BASE_URL}/bulk-delete`, { client_ids: clientIds });
}

/**
 * Export selected clients as CSV — triggers a file download
 */
export async function exportClients(clientIds: string[], format: "csv" | "excel" = "csv"): Promise<void> {
    const { getToken } = await import("@/lib/auth");
    const token = getToken();
    const response = await fetch(`/api/clients/export`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ client_ids: clientIds, format }),
    });
    if (!response.ok) throw new Error("Export failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_export.${format === "excel" ? "csv" : "csv"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
