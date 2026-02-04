"use client";

import { useState, useEffect } from "react";
import { getTeams, getTeamWorkload, Team, TeamWorkload } from "@/services/teams";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Icons ===============

const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const ChartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const AlertIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

// =============== Components ===============

interface TeamCardProps {
    team: Team;
    onClick: (team: Team) => void;
}

function TeamCard({ team, onClick }: TeamCardProps) {
    const memberCount = team.member_count || team.members?.length || 0;

    return (
        <div
            onClick={() => onClick(team)}
            className="group bg-background border border-foreground/10 rounded-xl p-5 cursor-pointer
                       hover:border-foreground/20 hover:shadow-lg hover:shadow-black/20
                       transition-all duration-200"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: team.color || "#6366f1" }}
                    >
                        {team.icon || team.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                            {team.name}
                        </h3>
                    </div>
                </div>
                {team.parent_team && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-foreground/10 text-foreground/50">
                        Sub-team
                    </span>
                )}
            </div>

            {/* Description */}
            {team.description && (
                <p className="text-sm text-foreground/60 mb-4 line-clamp-2">{team.description}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-2 rounded-lg bg-foreground/5">
                    <p className="text-xs text-foreground/50">Members</p>
                    <p className="text-lg font-semibold text-foreground">{memberCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-foreground/5">
                    <p className="text-xs text-foreground/50">Capacity</p>
                    <p className="text-lg font-semibold text-foreground">{team.capacity_hours_week}h/w</p>
                </div>
            </div>

            {/* Lead */}
            {team.lead && (
                <div className="flex items-center gap-2 pt-3 border-t border-foreground/10">
                    {team.lead.avatar_url ? (
                        <img
                            src={team.lead.avatar_url}
                            alt={team.lead.full_name}
                            className="w-6 h-6 rounded-full"
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                            {team.lead.full_name.charAt(0)}
                        </div>
                    )}
                    <span className="text-xs text-foreground/60">
                        Lead: <span className="text-foreground/80">{team.lead.full_name}</span>
                    </span>
                </div>
            )}

            {/* Sub-teams indicator */}
            {team.sub_teams && team.sub_teams.length > 0 && (
                <div className="mt-3 pt-3 border-t border-foreground/10">
                    <p className="text-xs text-foreground/50">
                        {team.sub_teams.length} sub-team{team.sub_teams.length > 1 ? "s" : ""}
                    </p>
                </div>
            )}
        </div>
    );
}

interface WorkloadBarProps {
    member: {
        user_id: string;
        user_name: string;
        capacity_hours: number;
        allocated_hours: number;
        utilization_percentage: number;
        active_tasks: number;
    };
}

function WorkloadBar({ member }: WorkloadBarProps) {
    const getUtilizationColor = (utilization: number) => {
        if (utilization > 100) return "bg-red-500";
        if (utilization > 80) return "bg-amber-500";
        if (utilization > 50) return "bg-blue-500";
        return "bg-emerald-500";
    };

    const isOverAllocated = member.utilization_percentage > 100;

    return (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                {member.user_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{member.user_name}</p>
                    <span className={`text-xs ${isOverAllocated ? "text-red-400" : "text-foreground/60"}`}>
                        {member.utilization_percentage}%
                    </span>
                </div>
                <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${getUtilizationColor(member.utilization_percentage)}`}
                        style={{ width: `${Math.min(member.utilization_percentage, 100)}%` }}
                    />
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-foreground/40">
                        {member.allocated_hours}h / {member.capacity_hours}h
                    </span>
                    <span className="text-xs text-foreground/40">
                        {member.active_tasks} tasks
                    </span>
                </div>
            </div>
            {isOverAllocated && (
                <div className="text-red-400">
                    <AlertIcon />
                </div>
            )}
        </div>
    );
}

interface TeamDetailPanelProps {
    team: Team;
    workload: TeamWorkload | null;
    onClose: () => void;
}

function TeamDetailPanel({ team, workload, onClose }: TeamDetailPanelProps) {
    return (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-background border-l border-foreground/10 shadow-2xl overflow-y-auto z-50">
            {/* Header */}
            <div className="sticky top-0 bg-background border-b border-foreground/10 p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                            style={{ backgroundColor: team.color || "#6366f1" }}
                        >
                            {team.icon || team.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{team.name}</h2>
                            <p className="text-sm text-foreground/50">{team.description || "No description"}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Quick Stats */}
                {workload && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-foreground/5 text-center">
                            <p className="text-2xl font-bold text-foreground">{workload.total_capacity_hours}h</p>
                            <p className="text-xs text-foreground/50">Total Capacity</p>
                        </div>
                        <div className="p-3 rounded-lg bg-foreground/5 text-center">
                            <p className="text-2xl font-bold text-foreground">{workload.allocated_hours}h</p>
                            <p className="text-xs text-foreground/50">Allocated</p>
                        </div>
                        <div className="p-3 rounded-lg bg-foreground/5 text-center">
                            <p className={`text-2xl font-bold ${workload.utilization_percentage > 100 ? "text-red-400" : "text-emerald-400"}`}>
                                {workload.utilization_percentage}%
                            </p>
                            <p className="text-xs text-foreground/50">Utilization</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5 space-y-6">
                {/* Team Workload */}
                <div>
                    <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-3">
                        Member Workload
                    </h3>
                    <div className="space-y-2">
                        {workload?.members.map((member) => (
                            <WorkloadBar key={member.user_id} member={member} />
                        ))}
                        {(!workload || workload.members.length === 0) && (
                            <p className="text-foreground/50 text-center py-4">No members in this team</p>
                        )}
                    </div>
                </div>

                {/* Sub-teams */}
                {team.sub_teams && team.sub_teams.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-3">
                            Sub-teams
                        </h3>
                        <div className="space-y-2">
                            {team.sub_teams.map((subTeam) => (
                                <div
                                    key={subTeam.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-foreground/5 hover:bg-foreground/10 cursor-pointer transition-colors"
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                                        style={{ backgroundColor: subTeam.color || "#6366f1" }}
                                    >
                                        {subTeam.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{subTeam.name}</p>
                                        <p className="text-xs text-foreground/50">{subTeam.member_count || 0} members</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t border-foreground/10 space-y-2">
                    <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        Manage Team
                    </button>
                    <button className="w-full px-4 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg text-sm font-medium transition-colors">
                        View All Tasks
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============== Main Component ===============

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [selectedTeamWorkload, setSelectedTeamWorkload] = useState<TeamWorkload | null>(null);
    const [view, setView] = useState<"grid" | "hierarchy">("grid");

    useEffect(() => {
        async function fetchTeams() {
            try {
                setLoading(true);
                const data = await getTeams({ include_members: true });
                setTeams(data);
            } catch (error) {
                console.error("Failed to fetch teams:", error);
                // Set mock data for demo
                setTeams([
                    {
                        id: "1",
                        name: "Engineering",
                        description: "Core engineering team building the product",
                        color: "#6366f1",
                        capacity_hours_week: 160,
                        is_active: true,
                        member_count: 8,
                        lead: { id: "u1", full_name: "John Doe" },
                        sub_teams: [
                            { id: "1a", name: "Frontend", color: "#3b82f6", capacity_hours_week: 80, is_active: true, member_count: 4 } as Team,
                            { id: "1b", name: "Backend", color: "#10b981", capacity_hours_week: 80, is_active: true, member_count: 4 } as Team,
                        ],
                        created_at: "",
                        updated_at: "",
                    },
                    {
                        id: "2",
                        name: "Design",
                        description: "Product design and user experience",
                        color: "#ec4899",
                        capacity_hours_week: 80,
                        is_active: true,
                        member_count: 4,
                        lead: { id: "u2", full_name: "Jane Smith" },
                        created_at: "",
                        updated_at: "",
                    },
                    {
                        id: "3",
                        name: "Product",
                        description: "Product management and strategy",
                        color: "#f59e0b",
                        capacity_hours_week: 60,
                        is_active: true,
                        member_count: 3,
                        lead: { id: "u3", full_name: "Bob Wilson" },
                        created_at: "",
                        updated_at: "",
                    },
                    {
                        id: "4",
                        name: "QA",
                        description: "Quality assurance and testing",
                        color: "#14b8a6",
                        capacity_hours_week: 40,
                        is_active: true,
                        member_count: 2,
                        created_at: "",
                        updated_at: "",
                    },
                ]);
            } finally {
                setLoading(false);
            }
        }

        fetchTeams();
    }, []);

    const handleTeamClick = async (team: Team) => {
        setSelectedTeam(team);
        try {
            const workload = await getTeamWorkload(team.id);
            setSelectedTeamWorkload(workload);
        } catch (error) {
            console.error("Failed to fetch team workload:", error);
            // Mock workload data
            setSelectedTeamWorkload({
                team_id: team.id,
                team_name: team.name,
                total_capacity_hours: team.capacity_hours_week,
                allocated_hours: Math.round(team.capacity_hours_week * 0.75),
                available_hours: Math.round(team.capacity_hours_week * 0.25),
                utilization_percentage: 75,
                members: [
                    { user_id: "u1", user_name: "John Doe", capacity_hours: 40, allocated_hours: 35, utilization_percentage: 87, active_tasks: 5 },
                    { user_id: "u2", user_name: "Jane Smith", capacity_hours: 40, allocated_hours: 42, utilization_percentage: 105, active_tasks: 7 },
                    { user_id: "u3", user_name: "Bob Wilson", capacity_hours: 40, allocated_hours: 28, utilization_percentage: 70, active_tasks: 3 },
                    { user_id: "u4", user_name: "Alice Brown", capacity_hours: 40, allocated_hours: 15, utilization_percentage: 37, active_tasks: 2 },
                ],
            });
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Teams</h1>
                        <p className="text-foreground/60 mt-1">Manage your teams and view workload distribution</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-foreground/5 rounded-lg p-1">
                            <button
                                onClick={() => setView("grid")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "grid" ? "bg-foreground/10 text-foreground" : "text-foreground/60 hover:text-foreground"
                                    }`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setView("hierarchy")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "hierarchy" ? "bg-foreground/10 text-foreground" : "text-foreground/60 hover:text-foreground"
                                    }`}
                            >
                                Hierarchy
                            </button>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <PlusIcon />
                            Create Team
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                <UsersIcon />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{teams.length}</p>
                                <p className="text-sm text-foreground/50">Total Teams</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                <UsersIcon />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {teams.reduce((acc, t) => acc + (t.member_count || 0), 0)}
                                </p>
                                <p className="text-sm text-foreground/50">Total Members</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                <ClockIcon />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {teams.reduce((acc, t) => acc + t.capacity_hours_week, 0)}h
                                </p>
                                <p className="text-sm text-foreground/50">Weekly Capacity</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                                <ChartIcon />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">72%</p>
                                <p className="text-sm text-foreground/50">Avg. Utilization</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Teams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {teams.map((team) => (
                        <TeamCard key={team.id} team={team} onClick={handleTeamClick} />
                    ))}
                </div>

                {teams.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-foreground/50">
                        <UsersIcon />
                        <p className="mt-2">No teams found</p>
                        <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                            Create your first team
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Panel */}
            {selectedTeam && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setSelectedTeam(null)}
                    />
                    <TeamDetailPanel
                        team={selectedTeam}
                        workload={selectedTeamWorkload}
                        onClose={() => setSelectedTeam(null)}
                    />
                </>
            )}
        </DashboardLayout>
    );
}
