/**
 * Enhanced Projects API Service
 * Comprehensive project management with phases, epics, milestones
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "critical";

export interface ProjectManager {
    id: string;
    project_id: string;
    user_id: string;
    role: string;
    start_date: string;
    end_date?: string;
    user?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
    };
}

export interface ProjectPhase {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    order: number;
    start_date?: string;
    end_date?: string;
    status: string;
    progress_percentage: number;
    created_at: string;
}

export interface Epic {
    id: string;
    project_id: string;
    phase_id?: string;
    name: string;
    description?: string;
    status: string;
    priority: string;
    order: number;
    start_date?: string;
    end_date?: string;
    progress_percentage: number;
    task_count?: number;
    completed_task_count?: number;
    created_at: string;
}

export interface Milestone {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    target_date: string;
    completed_date?: string;
    status: "pending" | "completed" | "overdue";
    created_at: string;
}

export interface Project {
    id: string;
    name: string;
    code?: string;
    description?: string;
    client_id?: string;
    department_id?: string;
    team_id?: string;
    business_owner_id?: string;
    priority: ProjectPriority;
    status: ProjectStatus;
    budget?: number;
    budget_currency: string;
    actual_cost: number;
    start_date?: string;
    end_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    progress_percentage: number;
    contacts?: Array<{
        name: string;
        phone: string;
        type: string;
        is_primary: boolean;
    }>;
    notes?: string;
    settings?: Record<string, unknown>;
    custom_fields?: Record<string, unknown>;
    ai_health_score?: number;
    ai_risk_factors?: string[];
    created_at: string;
    updated_at: string;
    // Relationships
    client?: { id: string; name: string };
    department?: { id: string; name: string };
    team?: { id: string; name: string };
    business_owner?: { id: string; full_name: string; avatar_url?: string };
    project_managers?: ProjectManager[];
    phases?: ProjectPhase[];
    epics?: Epic[];
    milestones?: Milestone[];
    task_count?: number;
    completed_task_count?: number;
}

export interface ProjectCreate {
    name: string;
    code?: string;
    description?: string;
    client_id?: string;
    department_id?: string;
    team_id?: string;
    business_owner_id?: string;
    priority?: ProjectPriority;
    status?: ProjectStatus;
    budget?: number;
    budget_currency?: string;
    start_date?: string;
    end_date?: string;
    contacts?: Array<{
        name: string;
        phone: string;
        type: string;
        is_primary: boolean;
    }>;
    notes?: string;
    managers?: Array<{ user_id: string; role?: string }>;
}

export interface ProjectUpdate extends Partial<ProjectCreate> {
    actual_start_date?: string;
    actual_end_date?: string;
    progress_percentage?: number;
    actual_cost?: number;
    custom_fields?: Record<string, unknown>;
}

export interface PhaseCreate {
    name: string;
    description?: string;
    order?: number;
    start_date?: string;
    end_date?: string;
}

export interface EpicCreate {
    name: string;
    description?: string;
    phase_id?: string;
    status?: string;
    priority?: string;
    order?: number;
    start_date?: string;
    end_date?: string;
}

export interface MilestoneCreate {
    name: string;
    description?: string;
    target_date: string;
}

export interface ProjectsParams {
    skip?: number;
    limit?: number;
    client_id?: string;
    department_id?: string;
    team_id?: string;
    status?: ProjectStatus;
    priority?: ProjectPriority;
    search?: string;
    include_structure?: boolean;
    [key: string]: string | number | boolean | undefined;
}

const BASE_URL = "/projects";

// =============== Project CRUD ===============

/**
 * Get all projects with optional filters
 */
export async function getProjects(params?: ProjectsParams): Promise<Project[]> {
    return apiGet<Project[]>(BASE_URL, params);
}

/**
 * Get a single project by ID
 */
export async function getProject(id: string, includeStructure = true): Promise<Project> {
    return apiGet<Project>(`${BASE_URL}/${id}`, { include_structure: includeStructure });
}

/**
 * Create a new project
 */
export async function createProject(data: ProjectCreate): Promise<Project> {
    return apiPost<Project>(BASE_URL, data);
}

/**
 * Update a project
 */
export async function updateProject(id: string, data: ProjectUpdate): Promise<Project> {
    return apiPut<Project>(`${BASE_URL}/${id}`, data);
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}

/**
 * Change project status (lifecycle transition)
 */
export async function changeProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
    return apiPut<Project>(`${BASE_URL}/${id}/status`, { status });
}

// =============== Project Managers ===============

/**
 * Add project manager
 */
export async function addProjectManager(
    projectId: string,
    userId: string,
    role?: string
): Promise<ProjectManager> {
    return apiPost<ProjectManager>(`${BASE_URL}/${projectId}/managers`, { user_id: userId, role });
}

/**
 * Remove project manager
 */
export async function removeProjectManager(projectId: string, managerId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${projectId}/managers/${managerId}`);
}

// =============== Phases ===============

/**
 * Get project phases
 */
export async function getProjectPhases(projectId: string): Promise<ProjectPhase[]> {
    return apiGet<ProjectPhase[]>(`${BASE_URL}/${projectId}/phases`);
}

/**
 * Create a phase
 */
export async function createPhase(projectId: string, data: PhaseCreate): Promise<ProjectPhase> {
    return apiPost<ProjectPhase>(`${BASE_URL}/${projectId}/phases`, data);
}

/**
 * Update a phase
 */
export async function updatePhase(
    projectId: string,
    phaseId: string,
    data: Partial<PhaseCreate>
): Promise<ProjectPhase> {
    return apiPut<ProjectPhase>(`${BASE_URL}/${projectId}/phases/${phaseId}`, data);
}

/**
 * Delete a phase
 */
export async function deletePhase(projectId: string, phaseId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${projectId}/phases/${phaseId}`);
}

/**
 * Reorder phases
 */
export async function reorderPhases(projectId: string, phaseIds: string[]): Promise<void> {
    return apiPut(`${BASE_URL}/${projectId}/phases/reorder`, { phase_ids: phaseIds });
}

// =============== Epics ===============

/**
 * Get project epics
 */
export async function getProjectEpics(projectId: string, phaseId?: string): Promise<Epic[]> {
    const params: Record<string, string | undefined> = { phase_id: phaseId };
    return apiGet<Epic[]>(`${BASE_URL}/${projectId}/epics`, params);
}

/**
 * Create an epic
 */
export async function createEpic(projectId: string, data: EpicCreate): Promise<Epic> {
    return apiPost<Epic>(`${BASE_URL}/${projectId}/epics`, data);
}

/**
 * Update an epic
 */
export async function updateEpic(
    projectId: string,
    epicId: string,
    data: Partial<EpicCreate>
): Promise<Epic> {
    return apiPut<Epic>(`${BASE_URL}/${projectId}/epics/${epicId}`, data);
}

/**
 * Delete an epic
 */
export async function deleteEpic(projectId: string, epicId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${projectId}/epics/${epicId}`);
}

// =============== Milestones ===============

/**
 * Get project milestones
 */
export async function getProjectMilestones(projectId: string): Promise<Milestone[]> {
    return apiGet<Milestone[]>(`${BASE_URL}/${projectId}/milestones`);
}

/**
 * Create a milestone
 */
export async function createMilestone(projectId: string, data: MilestoneCreate): Promise<Milestone> {
    return apiPost<Milestone>(`${BASE_URL}/${projectId}/milestones`, data);
}

/**
 * Update a milestone
 */
export async function updateMilestone(
    projectId: string,
    milestoneId: string,
    data: Partial<MilestoneCreate & { completed_date?: string }>
): Promise<Milestone> {
    return apiPut<Milestone>(`${BASE_URL}/${projectId}/milestones/${milestoneId}`, data);
}

/**
 * Complete a milestone
 */
export async function completeMilestone(projectId: string, milestoneId: string): Promise<Milestone> {
    return apiPut<Milestone>(`${BASE_URL}/${projectId}/milestones/${milestoneId}/complete`, {});
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${projectId}/milestones/${milestoneId}`);
}

// =============== Analytics ===============

/**
 * Get project progress summary
 */
export async function getProjectProgress(projectId: string): Promise<{
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    blocked_tasks: number;
    overdue_tasks: number;
    progress_percentage: number;
    estimated_completion_date?: string;
}> {
    return apiGet(`${BASE_URL}/${projectId}/progress`);
}

/**
 * Get project health metrics (AI-enhanced)
 */
export async function getProjectHealth(projectId: string): Promise<{
    health_score: number;
    risk_level: "low" | "medium" | "high";
    risk_factors: string[];
    recommendations: string[];
}> {
    return apiGet(`${BASE_URL}/${projectId}/health`);
}
