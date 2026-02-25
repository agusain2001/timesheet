"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    Plus,
    Search,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronRight,
    UserPlus,
    X,
    Loader2,
    AlertCircle,
    Building2,
    Clock,
    Shield,
    BarChart2,
} from "lucide-react";
import { getToken } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    role: string;
    allocation_percentage: number;
}

interface Team {
    id: string;
    name: string;
    description?: string;
    department_id?: string;
    department_name?: string;
    lead_id?: string;
    lead_name?: string;
    parent_team_id?: string;
    parent_team_name?: string;
    capacity_hours_week: number;
    color?: string;
    is_active: boolean;
    member_count: number;
    members?: TeamMember[];
    sub_teams?: Team[];
    created_at?: string;
}

interface User {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    position?: string;
}

interface Department {
    id: string;
    name: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
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
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Request failed");
    }
    if (res.status === 204) return null;
    return res.json();
}

// ─── Colour Picker ────────────────────────────────────────────────────────────

const PALETTE = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#0ea5e9", "#3b82f6", "#64748b", "#1e293b",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {PALETTE.map((c) => (
                <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: value === c ? "#fff" : "transparent" }}
                />
            ))}
        </div>
    );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
    member,
    onRemove,
}: {
    member: TeamMember;
    onRemove: (id: string) => void;
}) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.02] dark:bg-foreground/[0.05]/50 border border-foreground/10">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold bg-blue-500/20 text-blue-400">
                    {member.full_name?.charAt(0) || "?"}
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground/90">{member.full_name}</p>
                    <p className="text-xs text-foreground/50">{member.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 capitalize">
                    {member.role}
                </span>
                <span className="text-xs text-foreground/60">{member.allocation_percentage}%</span>
                <button
                    onClick={() => onRemove(member.id)}
                    className="text-foreground/50 hover:text-red-400 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({
    team,
    onEdit,
    onDelete,
    onSelect,
    isSelected,
}: {
    team: Team;
    onEdit: (t: Team) => void;
    onDelete: (t: Team) => void;
    onSelect: (t: Team) => void;
    isSelected: boolean;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`rounded-2xl border transition-all cursor-pointer ${isSelected
                ? "border-blue-500 bg-blue-500/5"
                : "border-foreground/10 bg-foreground/[0.02] hover:border-foreground/20"
                }`}
            onClick={() => onSelect(team)}
        >
            <div className="p-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: team.color || "#6366f1" }}
                        >
                            {team.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground/90">{team.name}</h3>
                            {team.department_name && (
                                <p className="text-xs text-foreground/50 flex items-center gap-1 mt-0.5">
                                    <Building2 size={10} /> {team.department_name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(team); }}
                            className="p-1.5 rounded-lg hover:bg-foreground/[0.05] text-foreground/60 hover:text-foreground/90 transition-colors"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(team); }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground/60 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {team.description && (
                    <p className="text-sm text-foreground/50 mt-2 line-clamp-2">{team.description}</p>
                )}

                <div className="flex items-center gap-4 mt-4 text-xs text-foreground/50">
                    <span className="flex items-center gap-1">
                        <Users size={12} /> {team.member_count} members
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock size={12} /> {team.capacity_hours_week}h/week capacity
                    </span>
                    {team.lead_name && (
                        <span className="flex items-center gap-1">
                            <Shield size={12} /> {team.lead_name}
                        </span>
                    )}
                </div>

                {team.sub_teams && team.sub_teams.length > 0 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-3 transition-colors"
                    >
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {team.sub_teams.length} sub-team{team.sub_teams.length > 1 ? "s" : ""}
                    </button>
                )}
            </div>

            {expanded && team.sub_teams && (
                <div className="border-t border-foreground/10 p-3 space-y-2 bg-foreground/[0.01] rounded-b-2xl">
                    {team.sub_teams.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg text-sm text-foreground/60">
                            <ChevronRight size={12} className="text-foreground/40" />
                            <span
                                className="w-5 h-5 rounded text-white text-xs flex items-center justify-center font-bold"
                                style={{ backgroundColor: sub.color || "#64748b" }}
                            >
                                {sub.name.charAt(0)}
                            </span>
                            {sub.name}
                            <span className="ml-auto text-xs text-foreground/40">{sub.member_count} members</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Team Form Modal ──────────────────────────────────────────────────────────

function TeamFormModal({
    team,
    allTeams,
    users,
    departments,
    onSave,
    onClose,
}: {
    team: Partial<Team> | null;
    allTeams: Team[];
    users: User[];
    departments: Department[];
    onSave: () => void;
    onClose: () => void;
}) {
    const isEdit = !!team?.id;
    const [form, setForm] = useState({
        name: team?.name || "",
        description: team?.description || "",
        department_id: team?.department_id || "",
        lead_id: team?.lead_id || "",
        parent_team_id: team?.parent_team_id || "",
        capacity_hours_week: team?.capacity_hours_week ?? 40,
        color: team?.color || "#6366f1",
        is_active: team?.is_active ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setError("Team name is required"); return; }
        setSaving(true);
        setError("");
        try {
            if (isEdit) {
                await apiFetch(`/teams/${team!.id}`, { method: "PUT", body: JSON.stringify(form) });
            } else {
                await apiFetch("/api/teams", { method: "POST", body: JSON.stringify(form) });
            }
            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-foreground/10">
                    <h2 className="text-lg font-semibold text-foreground/90">
                        {isEdit ? "Edit Team" : "Create New Team"}
                    </h2>
                    <button onClick={onClose} className="text-foreground/50 hover:text-foreground/80 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-foreground/60 mb-1">Team Name *</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground/90 placeholder-foreground/60 focus:outline-none focus:border-blue-500/50 text-sm"
                            placeholder="e.g. Frontend Engineering"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground/60 mb-1">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground/90 placeholder-foreground/60 focus:outline-none focus:border-blue-500/50 text-sm resize-none"
                            placeholder="What does this team do?"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground/60 mb-1">Department</label>
                            <select
                                value={form.department_id}
                                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/90 focus:outline-none focus:border-blue-500/50 text-sm"
                            >
                                <option value="">None</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground/60 mb-1">Capacity (hrs/week)</label>
                            <input
                                type="number"
                                min={1}
                                max={200}
                                value={form.capacity_hours_week}
                                onChange={(e) => setForm({ ...form, capacity_hours_week: Number(e.target.value) })}
                                className="w-full px-3 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground/90 focus:outline-none focus:border-blue-500/50 text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground/60 mb-1">Team Lead</label>
                            <select
                                value={form.lead_id}
                                onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/90 focus:outline-none focus:border-blue-500/50 text-sm"
                            >
                                <option value="">No lead</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground/60 mb-1">Parent Team</label>
                            <select
                                value={form.parent_team_id}
                                onChange={(e) => setForm({ ...form, parent_team_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/90 focus:outline-none focus:border-blue-500/50 text-sm"
                            >
                                <option value="">Root team</option>
                                {allTeams
                                    .filter((t) => t.id !== team?.id)
                                    .map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground/60 mb-2">Team Color</label>
                        <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-foreground/[0.05] peer-checked:bg-blue-500 rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
                        </label>
                        <span className="text-sm text-foreground/60">Active team</span>
                    </div>
                </form>

                <div className="flex justify-end gap-3 p-6 border-t border-foreground/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.02] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {isEdit ? "Save Changes" : "Create Team"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({
    teamId,
    existingMemberIds,
    users,
    onAdded,
    onClose,
}: {
    teamId: string;
    existingMemberIds: string[];
    users: User[];
    onAdded: () => void;
    onClose: () => void;
}) {
    const [userId, setUserId] = useState("");
    const [role, setRole] = useState("member");
    const [allocation, setAllocation] = useState(100);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const available = users.filter((u) => !existingMemberIds.includes(u.id));

    const handleAdd = async () => {
        if (!userId) { setError("Please select a user"); return; }
        setSaving(true);
        setError("");
        try {
            await apiFetch(`/teams/${teamId}/members`, {
                method: "POST",
                body: JSON.stringify({ user_id: userId, role, allocation_percentage: allocation }),
            });
            onAdded();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-semibold text-foreground/90">Add Team Member</h3>
                    <button onClick={onClose} className="text-foreground/50 hover:text-foreground/80">
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground/60 mb-1">User</label>
                        <select
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/90 text-sm"
                        >
                            <option value="">Select user...</option>
                            {available.map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-foreground/60 mb-1">Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/90 text-sm"
                            >
                                <option value="lead">Lead</option>
                                <option value="member">Member</option>
                                <option value="contributor">Contributor</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground/60 mb-1">Allocation %</label>
                            <input
                                type="number" min={10} max={100}
                                value={allocation}
                                onChange={(e) => setAllocation(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground/90 text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-5">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground/90">Cancel</button>
                    <button
                        onClick={handleAdd}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Add Member
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function TeamDetailPanel({
    team,
    users,
    onClose,
    onUpdated,
}: {
    team: Team;
    users: User[];
    onClose: () => void;
    onUpdated: () => void;
}) {
    const [members, setMembers] = useState<TeamMember[]>(team.members || []);
    const [loading, setLoading] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);

    useEffect(() => {
        const fetchMembers = async () => {
            setLoading(true);
            try {
                const data = await apiFetch(`/teams/${team.id}/members`);
                setMembers(data || []);
            } catch {
                setMembers([]);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, [team.id]);

    const handleRemoveMember = async (memberId: string) => {
        try {
            await apiFetch(`/teams/${team.id}/members/${memberId}`, { method: "DELETE" });
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
            onUpdated();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const totalAllocation = members.reduce((sum, m) => sum + m.allocation_percentage, 0);
    const usedCapacity = (totalAllocation / 100) * members.length * 8;

    // ── Skill distribution ──
    const [memberSkills, setMemberSkills] = useState<Record<string, number>>({});
    const [activeCount, setActiveCount] = useState(0);

    useEffect(() => {
        // Fetch user skills for team members
        (async () => {
            const skillMap: Record<string, number> = {};
            try {
                const userList = await apiFetch(`/users?limit=200`);
                const memberIds = new Set(members.map(m => m.user_id));
                (userList.users || userList || []).forEach((u: any) => {
                    if (memberIds.has(u.id) && u.skills) {
                        (u.skills as string[]).forEach(s => { skillMap[s] = (skillMap[s] || 0) + 1; });
                    }
                });
            } catch { }
            setMemberSkills(skillMap);
        })();
        // Fetch active timers
        (async () => {
            try {
                const timers = await apiFetch(`/time-tracking/active`);
                const memberIds = new Set(members.map(m => m.user_id));
                const active = (timers || []).filter((t: any) => memberIds.has(t.user_id));
                setActiveCount(active.length);
            } catch { setActiveCount(0); }
        })();
    }, [members]); // rough estimate

    return (
        <>
            <div className="w-96 border-l border-foreground/10 bg-background/80 backdrop-blur-xl flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-foreground/10">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: team.color || "#6366f1" }}
                        >
                            {team.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="font-semibold text-foreground/90">{team.name}</h2>
                            {team.department_name && (
                                <p className="text-xs text-foreground/50">{team.department_name}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-foreground/50 hover:text-foreground/80">
                        <X size={18} />
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 p-5 border-b border-foreground/10">
                    <div className="rounded-xl bg-foreground/[0.02] p-3">
                        <p className="text-xs text-foreground/50 mb-1">Total Members</p>
                        <p className="text-2xl font-bold text-foreground/90">{members.length}</p>
                    </div>
                    <div className="rounded-xl bg-foreground/[0.02] p-3">
                        <p className="text-xs text-foreground/50 mb-1">Capacity</p>
                        <p className="text-2xl font-bold text-foreground/90">{team.capacity_hours_week}h</p>
                        <p className="text-xs text-foreground/40">per week</p>
                    </div>

                    {team.lead_name && (
                        <div className="col-span-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
                            <p className="text-xs text-foreground/50 mb-1 flex items-center gap-1">
                                <Shield size={10} /> Team Lead
                            </p>
                            <p className="text-sm font-medium text-blue-300">{team.lead_name}</p>
                        </div>
                    )}
                </div>

                {/* Members */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* ── Active vs Idle ── */}
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-medium">{activeCount} Active</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10">
                            <span className="w-2 h-2 rounded-full bg-slate-600" />
                            <span className="text-xs text-foreground/50 font-medium">{Math.max(0, members.length - activeCount)} Idle</span>
                        </div>
                    </div>

                    {/* ── Skill Distribution ── */}
                    {Object.keys(memberSkills).length > 0 && (
                        <div className="mb-5">
                            <h3 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">Skill Distribution</h3>
                            <div className="space-y-1.5">
                                {Object.entries(memberSkills)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 8)
                                    .map(([skill, count]) => {
                                        const pct = Math.round((count / members.length) * 100);
                                        return (
                                            <div key={skill} className="flex items-center gap-2">
                                                <span className="text-[10px] text-foreground/50 w-20 truncate">{skill}</span>
                                                <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.05]">
                                                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-[10px] text-foreground/40 w-5 text-right">{count}</span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground/80">Members</h3>
                        <button
                            onClick={() => setShowAddMember(true)}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <UserPlus size={12} /> Add
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={20} className="animate-spin text-blue-400" />
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-8">
                            <Users size={32} className="text-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-foreground/40">No members yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {members.map((m) => (
                                <MemberRow key={m.id} member={m} onRemove={handleRemoveMember} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Workload bar */}
                {members.length > 0 && (
                    <div className="p-5 border-t border-foreground/10">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-foreground/50 flex items-center gap-1">
                                <BarChart2 size={10} /> Avg Allocation
                            </p>
                            <p className="text-xs text-foreground/60">
                                {members.length > 0
                                    ? Math.round(totalAllocation / members.length)
                                    : 0}%
                            </p>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-foreground/[0.05]">
                            <div
                                className="h-full rounded-full bg-blue-500 transition-all"
                                style={{
                                    width: `${Math.min(100, totalAllocation / members.length)}%`,
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {showAddMember && (
                <AddMemberModal
                    teamId={team.id}
                    existingMemberIds={members.map((m) => m.user_id)}
                    users={users}
                    onAdded={() => {
                        setShowAddMember(false);
                        const refetch = async () => {
                            const data = await apiFetch(`/teams/${team.id}/members`);
                            setMembers(data || []);
                            onUpdated();
                        };
                        refetch();
                    }}
                    onClose={() => setShowAddMember(false)}
                />
            )}
        </>
    );
}

// ─── Hierarchy Tree ───────────────────────────────────────────────────────────

function HierarchyTreeNode({
    team,
    allTeams,
    depth = 0,
    onEdit,
    onDelete,
    onSelect,
}: {
    team: Team;
    allTeams: Team[];
    depth?: number;
    onEdit: (t: Team) => void;
    onDelete: (t: Team) => void;
    onSelect: (t: Team) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const children = allTeams.filter(t => t.parent_team_id === team.id);
    const hue = team.color ? undefined : (team.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360);
    const color = team.color ?? `hsl(${hue}, 60%, 45%)`;

    return (
        <div style={{ marginLeft: depth * 20 }}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${depth === 0 ? "border-foreground/10 bg-foreground/[0.02]" : "border-foreground/5 bg-foreground/[0.01]"
                } hover:bg-white/8 transition group mb-2`}>
                {children.length > 0 && (
                    <button onClick={() => setExpanded(!expanded)} className="text-foreground/50 hover:text-foreground/80 transition shrink-0">
                        {expanded
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />}
                    </button>
                )}
                {children.length === 0 && <span className="w-3.5 shrink-0" />}
                <div className="w-6 h-6 rounded-lg shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground/90 truncate">{team.name}</p>
                    {team.description && <p className="text-xs text-foreground/50 truncate">{team.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-foreground/50 flex items-center gap-1">
                        <Users size={9} /> {team.member_count}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                        <button onClick={() => onEdit(team)} className="p-1 rounded text-foreground/50 hover:text-blue-400">
                            <Edit2 size={11} />
                        </button>
                        <button onClick={() => onDelete(team)} className="p-1 rounded text-foreground/50 hover:text-red-400">
                            <Trash2 size={11} />
                        </button>
                    </div>
                </div>
            </div>
            {expanded && children.map(child => (
                <HierarchyTreeNode key={child.id} team={child} allTeams={allTeams} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} />
            ))}
        </div>
    );
}

function HierarchyTree({
    teams,
    onEdit,
    onDelete,
    onSelect,
}: {
    teams: Team[];
    onEdit: (t: Team) => void;
    onDelete: (t: Team) => void;
    onSelect: (t: Team) => void;
}) {
    const roots = teams.filter(t => !t.parent_team_id);
    if (roots.length === 0) return <p className="text-foreground/40 text-sm text-center py-10">No teams to display</p>;
    return (
        <div className="space-y-1">
            {roots.map(t => (
                <HierarchyTreeNode key={t.id} team={t} allTeams={teams} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} />
            ))}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [editTeam, setEditTeam] = useState<Partial<Team> | null>(null);
    const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [filterDept, setFilterDept] = useState("");
    const [treeView, setTreeView] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [t, u, d] = await Promise.all([
                apiFetch("/api/teams"),
                apiFetch("/api/users"),
                apiFetch("/api/departments"),
            ]);
            setTeams(t || []);
            setUsers(u || []);
            setDepartments(d || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = teams.filter((t) => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            (t.description || "").toLowerCase().includes(search.toLowerCase());
        const matchDept = !filterDept || t.department_id === filterDept;
        return matchSearch && matchDept;
    });

    const handleDelete = async () => {
        if (!deleteTeam) return;
        setDeleting(true);
        try {
            await apiFetch(`/teams/${deleteTeam.id}`, { method: "DELETE" });
            setDeleteTeam(null);
            if (selectedTeam?.id === deleteTeam.id) setSelectedTeam(null);
            fetchAll();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex h-full min-h-screen bg-background text-foreground/90">
            {/* Main content */}
            <div className="flex-1 flex flex-col p-6 gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Teams</h1>
                        <p className="text-sm text-foreground/50 mt-1">
                            {teams.length} team{teams.length !== 1 ? "s" : ""} · {teams.reduce((s, t) => s + t.member_count, 0)} total members
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setTreeView(!treeView)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${treeView
                                ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                                : "bg-foreground/[0.02] border-foreground/10 text-foreground/60 hover:bg-foreground/[0.05]"
                                }`}
                        >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 3h4v4H3zM3 10h4v4H3zM3 17h4v4H3zM9 5h12M9 12h8M9 19h5" /></svg>
                            Tree View
                        </button>
                        <button
                            onClick={() => { setEditTeam({}); setShowForm(true); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                        >
                            <Plus size={16} /> New Team
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search teams..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/90 placeholder-foreground/60 text-sm focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/80 text-sm"
                    >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-blue-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <Users size={48} className="text-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground/60 mb-2">
                            {search ? "No teams match your search" : "No teams yet"}
                        </h3>
                        <p className="text-sm text-foreground/40 mb-6">
                            {!search && "Create your first team to start organizing work."}
                        </p>
                        {!search && (
                            <button
                                onClick={() => { setEditTeam({}); setShowForm(true); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm"
                            >
                                <Plus size={16} /> Create Team
                            </button>
                        )}
                    </div>
                ) : treeView ? (
                    <HierarchyTree
                        teams={filtered}
                        onEdit={(team) => { setEditTeam(team); setShowForm(true); }}
                        onDelete={setDeleteTeam}
                        onSelect={(team) => setSelectedTeam(selectedTeam?.id === team.id ? null : team)}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
                        {filtered.map((t) => (
                            <TeamCard
                                key={t.id}
                                team={t}
                                isSelected={selectedTeam?.id === t.id}
                                onEdit={(team) => { setEditTeam(team); setShowForm(true); }}
                                onDelete={setDeleteTeam}
                                onSelect={(team) => setSelectedTeam(selectedTeam?.id === team.id ? null : team)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Panel */}
            {selectedTeam && (
                <TeamDetailPanel
                    team={selectedTeam}
                    users={users}
                    onClose={() => setSelectedTeam(null)}
                    onUpdated={fetchAll}
                />
            )}

            {/* Team Form Modal */}
            {showForm && (
                <TeamFormModal
                    team={editTeam}
                    allTeams={teams}
                    users={users}
                    departments={departments}
                    onSave={() => { setShowForm(false); setEditTeam(null); fetchAll(); }}
                    onClose={() => { setShowForm(false); setEditTeam(null); }}
                />
            )}

            {/* Delete Confirm */}
            {deleteTeam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <Trash2 size={18} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground/90">Delete Team?</h3>
                                <p className="text-xs text-foreground/50">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-sm text-foreground/60 mb-5">
                            Are you sure you want to delete <strong className="text-foreground/90">{deleteTeam.name}</strong>? All member assignments will be removed.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteTeam(null)}
                                className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground/90"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting && <Loader2 size={14} className="animate-spin" />}
                                Delete Team
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
