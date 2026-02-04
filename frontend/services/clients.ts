/**
 * Clients API Service
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";
import type { Client, ClientCreate, ClientUpdate } from "@/types/api";

const BASE_URL = "/clients";

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
