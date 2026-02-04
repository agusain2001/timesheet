/**
 * Departments API Service
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";
import type { Department, DepartmentCreate, DepartmentUpdate } from "@/types/api";

const BASE_URL = "/departments";

export interface DepartmentsParams {
    skip?: number;
    limit?: number;
    search?: string;
    [key: string]: string | number | boolean | undefined;
}

/**
 * Get all departments with optional filters
 */
export async function getDepartments(
    params?: DepartmentsParams,
): Promise<Department[]> {
    return apiGet<Department[]>(BASE_URL, params);
}

/**
 * Get a single department by ID
 */
export async function getDepartment(id: string): Promise<Department> {
    return apiGet<Department>(`${BASE_URL}/${id}`);
}

/**
 * Create a new department
 */
export async function createDepartment(
    data: DepartmentCreate,
): Promise<Department> {
    return apiPost<Department>(BASE_URL, data);
}

/**
 * Update an existing department
 */
export async function updateDepartment(
    id: string,
    data: DepartmentUpdate,
): Promise<Department> {
    return apiPut<Department>(`${BASE_URL}/${id}`, data);
}

/**
 * Delete a department
 */
export async function deleteDepartment(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}
