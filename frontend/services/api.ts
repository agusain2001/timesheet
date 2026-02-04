/**
 * Base API service with auth token handling
 */

import { fetchData } from "@/lib/fetcher";
import { getToken } from "@/lib/auth";

export interface PaginationParams {
    skip?: number;
    limit?: number;
    [key: string]: string | number | boolean | undefined;
}

export interface ApiResponse<T> {
    data: T;
    total?: number;
}

/**
 * Authenticated fetch wrapper
 */
export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit & { token?: string | null } = {},
): Promise<T> {
    const token = options.token ?? getToken();
    return fetchData<T>(endpoint, {
        ...options,
        token,
    });
}

/**
 * GET request with auth
 */
export async function apiGet<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
    let url = endpoint;
    if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                searchParams.append(key, String(value));
            }
        });
        const queryString = searchParams.toString();
        if (queryString) {
            url = `${endpoint}?${queryString}`;
        }
    }
    return apiFetch<T>(url, { method: "GET" });
}

/**
 * POST request with auth
 */
export async function apiPost<T>(
    endpoint: string,
    data?: unknown,
): Promise<T> {
    return apiFetch<T>(endpoint, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * PUT request with auth
 */
export async function apiPut<T>(
    endpoint: string,
    data?: unknown,
): Promise<T> {
    return apiFetch<T>(endpoint, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * DELETE request with auth
 */
export async function apiDelete(endpoint: string): Promise<void> {
    await apiFetch<void>(endpoint, { method: "DELETE" });
}
