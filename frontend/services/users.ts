/**
 * Users API Service
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";
import type { User, UserCreate, UserUpdate } from "@/types/api";

const BASE_URL = "/users";

export interface UsersParams {
    skip?: number;
    limit?: number;
    department_id?: string;
    role?: string;
    search?: string;
    [key: string]: string | number | boolean | undefined;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User> {
    return apiGet<User>(`${BASE_URL}/me`);
}

/**
 * Get all users with optional filters
 */
export async function getUsers(params?: UsersParams): Promise<User[]> {
    return apiGet<User[]>(BASE_URL, params);
}

/**
 * Get a single user by ID
 */
export async function getUser(id: string): Promise<User> {
    return apiGet<User>(`${BASE_URL}/${id}`);
}

/**
 * Create a new user (admin only)
 */
export async function createUser(data: UserCreate): Promise<User> {
    return apiPost<User>(BASE_URL, data);
}

/**
 * Update an existing user
 */
export async function updateUser(id: string, data: UserUpdate): Promise<User> {
    return apiPut<User>(`${BASE_URL}/${id}`, data);
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}
