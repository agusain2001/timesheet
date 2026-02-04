/**
 * Search API Service
 * Global search, saved filters, and knowledge management
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export type EntityType = "task" | "project" | "user" | "client" | "team" | "expense" | "comment";

export interface SearchResult {
    id: string;
    entity_type: EntityType;
    title: string;
    description?: string;
    highlight?: string;
    score: number;
    metadata: Record<string, unknown>;
    url: string;
}

export interface SearchResponse {
    query: string;
    total: number;
    results: SearchResult[];
    facets: Record<string, Array<{ value: string; count: number }>>;
    took_ms: number;
}

export interface SavedFilter {
    id: string;
    name: string;
    entity_type: EntityType;
    filters: Record<string, unknown>;
    is_default: boolean;
    is_public: boolean;
    created_by_id: string;
    created_at: string;
}

export interface SavedFilterCreate {
    name: string;
    entity_type: EntityType;
    filters: Record<string, unknown>;
    is_default?: boolean;
    is_public?: boolean;
}

export interface TaskTemplate {
    id: string;
    name: string;
    description?: string;
    template_data: {
        name_template?: string;
        description?: string;
        task_type?: string;
        priority?: string;
        estimated_hours?: number;
        tags?: string[];
        subtasks?: Array<{
            name: string;
            estimated_hours?: number;
        }>;
        custom_fields?: Record<string, unknown>;
    };
    category?: string;
    is_public: boolean;
    use_count: number;
    created_by_id: string;
    created_at: string;
}

export interface TaskTemplateCreate {
    name: string;
    description?: string;
    template_data: TaskTemplate["template_data"];
    category?: string;
    is_public?: boolean;
}

export interface ProjectTemplate {
    id: string;
    name: string;
    description?: string;
    template_data: {
        description?: string;
        priority?: string;
        phases?: Array<{
            name: string;
            order: number;
            epics?: Array<{
                name: string;
                tasks?: Array<{
                    name: string;
                    estimated_hours?: number;
                }>;
            }>;
        }>;
        milestones?: Array<{
            name: string;
            relative_days: number;
        }>;
        settings?: Record<string, unknown>;
    };
    category?: string;
    is_public: boolean;
    use_count: number;
    created_by_id: string;
    created_at: string;
}

export interface ProjectTemplateCreate {
    name: string;
    description?: string;
    template_data: ProjectTemplate["template_data"];
    category?: string;
    is_public?: boolean;
}

const BASE_URL = "/search";

// =============== Global Search ===============

/**
 * Global search across all entities
 */
export async function globalSearch(
    query: string,
    params?: {
        entity_types?: EntityType[];
        project_id?: string;
        limit?: number;
    }
): Promise<SearchResponse> {
    const searchParams: Record<string, string | number | boolean | undefined> = {
        q: query,
        entity_types: params?.entity_types?.join(","),
        project_id: params?.project_id,
        limit: params?.limit,
    };
    return apiGet<SearchResponse>(BASE_URL, searchParams);
}

/**
 * Search within specific entity type
 */
export async function searchEntity(
    entityType: EntityType,
    query: string,
    filters?: Record<string, unknown>,
    limit?: number
): Promise<SearchResult[]> {
    return apiPost<SearchResult[]>(`${BASE_URL}/${entityType}`, {
        query,
        filters,
        limit,
    });
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(
    query: string,
    entityTypes?: EntityType[]
): Promise<Array<{
    text: string;
    entity_type: EntityType;
    entity_id?: string;
}>> {
    return apiGet(`${BASE_URL}/suggestions`, {
        q: query,
        entity_types: entityTypes?.join(","),
    });
}

/**
 * Get recent searches
 */
export async function getRecentSearches(): Promise<Array<{
    query: string;
    timestamp: string;
    result_count: number;
}>> {
    return apiGet(`${BASE_URL}/recent`);
}

// =============== Saved Filters ===============

/**
 * Get saved filters for an entity type
 */
export async function getSavedFilters(entityType?: EntityType): Promise<SavedFilter[]> {
    const params: Record<string, string | undefined> = { entity_type: entityType };
    return apiGet<SavedFilter[]>(`${BASE_URL}/filters`, params);
}

/**
 * Create saved filter
 */
export async function createSavedFilter(data: SavedFilterCreate): Promise<SavedFilter> {
    return apiPost<SavedFilter>(`${BASE_URL}/filters`, data);
}

/**
 * Update saved filter
 */
export async function updateSavedFilter(
    id: string,
    data: Partial<SavedFilterCreate>
): Promise<SavedFilter> {
    return apiPut<SavedFilter>(`${BASE_URL}/filters/${id}`, data);
}

/**
 * Delete saved filter
 */
export async function deleteSavedFilter(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/filters/${id}`);
}

/**
 * Set filter as default
 */
export async function setDefaultFilter(id: string, entityType: EntityType): Promise<void> {
    return apiPut(`${BASE_URL}/filters/${id}/set-default`, { entity_type: entityType });
}

// =============== Task Templates ===============

/**
 * Get task templates
 */
export async function getTaskTemplates(category?: string): Promise<TaskTemplate[]> {
    const params: Record<string, string | undefined> = { category };
    return apiGet<TaskTemplate[]>(`${BASE_URL}/templates/tasks`, params);
}

/**
 * Get task template by ID
 */
export async function getTaskTemplate(id: string): Promise<TaskTemplate> {
    return apiGet<TaskTemplate>(`${BASE_URL}/templates/tasks/${id}`);
}

/**
 * Create task template
 */
export async function createTaskTemplate(data: TaskTemplateCreate): Promise<TaskTemplate> {
    return apiPost<TaskTemplate>(`${BASE_URL}/templates/tasks`, data);
}

/**
 * Create task template from existing task
 */
export async function createTaskTemplateFromTask(
    taskId: string,
    name: string,
    includeSubtasks?: boolean
): Promise<TaskTemplate> {
    return apiPost<TaskTemplate>(`${BASE_URL}/templates/tasks/from-task`, {
        task_id: taskId,
        name,
        include_subtasks: includeSubtasks,
    });
}

/**
 * Update task template
 */
export async function updateTaskTemplate(
    id: string,
    data: Partial<TaskTemplateCreate>
): Promise<TaskTemplate> {
    return apiPut<TaskTemplate>(`${BASE_URL}/templates/tasks/${id}`, data);
}

/**
 * Delete task template
 */
export async function deleteTaskTemplate(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/templates/tasks/${id}`);
}

// =============== Project Templates ===============

/**
 * Get project templates
 */
export async function getProjectTemplates(category?: string): Promise<ProjectTemplate[]> {
    const params: Record<string, string | undefined> = { category };
    return apiGet<ProjectTemplate[]>(`${BASE_URL}/templates/projects`, params);
}

/**
 * Get project template by ID
 */
export async function getProjectTemplate(id: string): Promise<ProjectTemplate> {
    return apiGet<ProjectTemplate>(`${BASE_URL}/templates/projects/${id}`);
}

/**
 * Create project template
 */
export async function createProjectTemplate(data: ProjectTemplateCreate): Promise<ProjectTemplate> {
    return apiPost<ProjectTemplate>(`${BASE_URL}/templates/projects`, data);
}

/**
 * Create project template from existing project
 */
export async function createProjectTemplateFromProject(
    projectId: string,
    name: string,
    includeStructure?: boolean
): Promise<ProjectTemplate> {
    return apiPost<ProjectTemplate>(`${BASE_URL}/templates/projects/from-project`, {
        project_id: projectId,
        name,
        include_structure: includeStructure,
    });
}

/**
 * Update project template
 */
export async function updateProjectTemplate(
    id: string,
    data: Partial<ProjectTemplateCreate>
): Promise<ProjectTemplate> {
    return apiPut<ProjectTemplate>(`${BASE_URL}/templates/projects/${id}`, data);
}

/**
 * Delete project template
 */
export async function deleteProjectTemplate(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/templates/projects/${id}`);
}

/**
 * Create project from template
 */
export async function createProjectFromTemplate(
    templateId: string,
    projectData: {
        name: string;
        code?: string;
        client_id?: string;
        start_date?: string;
    }
): Promise<{ project_id: string }> {
    return apiPost(`${BASE_URL}/templates/projects/${templateId}/create`, projectData);
}

// =============== Template Categories ===============

/**
 * Get template categories
 */
export async function getTemplateCategories(
    templateType: "task" | "project"
): Promise<Array<{ name: string; count: number }>> {
    return apiGet(`${BASE_URL}/templates/${templateType}s/categories`);
}
