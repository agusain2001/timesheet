/**
 * Teams API Service
 * Hierarchical team management with capacity and workload tracking
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// =============== Types ===============

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    role: "lead" | "member" | "contributor";
    allocation_percentage: number;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    created_at: string;
    user?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
        position?: string;
        skills?: string[];
        availability_status?: string;
    };
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    parent_team_id?: string;
    department_id?: string;
    lead_id?: string;
    capacity_hours_week: number;
    color?: string;
    icon?: string;
    settings?: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Relationships
    lead?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
    parent_team?: {
        id: string;
        name: string;
    };
    sub_teams?: Team[];
    members?: TeamMember[];
    member_count?: number;
}

export interface TeamCreate {
    name: string;
    description?: string;
    parent_team_id?: string;
    department_id?: string;
    lead_id?: string;
    capacity_hours_week?: number;
    color?: string;
    icon?: string;
    settings?: Record<string, unknown>;
}

export interface TeamUpdate {
    name?: string;
    description?: string;
    parent_team_id?: string;
    department_id?: string;
    lead_id?: string;
    capacity_hours_week?: number;
    color?: string;
    icon?: string;
    settings?: Record<string, unknown>;
    is_active?: boolean;
}

export interface TeamMemberAdd {
    user_id: string;
    role?: "lead" | "member" | "contributor";
    allocation_percentage?: number;
    start_date?: string;
}

export interface TeamWorkload {
    team_id: string;
    team_name: string;
    total_capacity_hours: number;
    allocated_hours: number;
    available_hours: number;
    utilization_percentage: number;
    members: Array<{
        user_id: string;
        user_name: string;
        capacity_hours: number;
        allocated_hours: number;
        utilization_percentage: number;
        active_tasks: number;
    }>;
}

export interface TeamSkillDistribution {
    team_id: string;
    skills: Array<{
        skill: string;
        count: number;
        members: Array<{
            user_id: string;
            user_name: string;
            expertise_level?: string;
        }>;
    }>;
}

export interface TeamsParams {
    skip?: number;
    limit?: number;
    department_id?: string;
    parent_team_id?: string;
    search?: string;
    include_members?: boolean;
    is_active?: boolean;
    [key: string]: string | number | boolean | undefined;
}

const BASE_URL = "/teams";

// =============== Team CRUD ===============

/**
 * Get all teams with optional filters
 */
export async function getTeams(params?: TeamsParams): Promise<Team[]> {
    return apiGet<Team[]>(BASE_URL, params);
}

/**
 * Get team hierarchy (tree structure)
 */
export async function getTeamHierarchy(rootTeamId?: string): Promise<Team[]> {
    const params: Record<string, string | undefined> = { root_id: rootTeamId };
    return apiGet<Team[]>(`${BASE_URL}/hierarchy`, params);
}

/**
 * Get a single team by ID
 */
export async function getTeam(id: string, includeMembers = true): Promise<Team> {
    return apiGet<Team>(`${BASE_URL}/${id}`, { include_members: includeMembers });
}

/**
 * Create a new team
 */
export async function createTeam(data: TeamCreate): Promise<Team> {
    return apiPost<Team>(BASE_URL, data);
}

/**
 * Update a team
 */
export async function updateTeam(id: string, data: TeamUpdate): Promise<Team> {
    return apiPut<Team>(`${BASE_URL}/${id}`, data);
}

/**
 * Delete a team
 */
export async function deleteTeam(id: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${id}`);
}

// =============== Member Management ===============

/**
 * Get team members
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return apiGet<TeamMember[]>(`${BASE_URL}/${teamId}/members`);
}

/**
 * Add member to team
 */
export async function addTeamMember(teamId: string, data: TeamMemberAdd): Promise<TeamMember> {
    return apiPost<TeamMember>(`${BASE_URL}/${teamId}/members`, data);
}

/**
 * Update team member
 */
export async function updateTeamMember(
    teamId: string,
    memberId: string,
    data: Partial<TeamMemberAdd>
): Promise<TeamMember> {
    return apiPut<TeamMember>(`${BASE_URL}/${teamId}/members/${memberId}`, data);
}

/**
 * Remove member from team
 */
export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
    return apiDelete(`${BASE_URL}/${teamId}/members/${memberId}`);
}

// =============== Workload & Analytics ===============

/**
 * Get team workload data
 */
export async function getTeamWorkload(teamId: string): Promise<TeamWorkload> {
    return apiGet<TeamWorkload>(`${BASE_URL}/${teamId}/workload`);
}

/**
 * Get skill distribution for a team
 */
export async function getTeamSkills(teamId: string): Promise<TeamSkillDistribution> {
    return apiGet<TeamSkillDistribution>(`${BASE_URL}/${teamId}/skills`);
}

/**
 * Get active vs idle members
 */
export async function getTeamActivity(teamId: string): Promise<{
    active_members: number;
    idle_members: number;
    members: Array<{
        user_id: string;
        user_name: string;
        status: "active" | "idle";
        last_activity?: string;
    }>;
}> {
    return apiGet(`${BASE_URL}/${teamId}/activity`);
}
