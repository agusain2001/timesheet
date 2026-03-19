"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Building2, Search, RefreshCw, Users, FolderKanban,
    CheckCircle, XCircle, Clock, Shield, Globe, BarChart3,
    AlertCircle, Crown, Plus, MoreVertical, Ban, Check,
    Activity, TrendingUp, Settings, ChevronRight,
    UserCheck, UserX, Layers, ArrowUpRight, Database,
    Timer, Lock, Unlock
} from "lucide-react";

import { apiFetch, apiPut, apiPost, apiGet } from "@/services/api";
import { CreateOrgModal } from "@/components/CreateOrgModal";

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrgStats {
    user_count: number;
    project_count: number;
}

interface OrgCard extends OrgStats {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    is_active: boolean;
    subscription_plan: string;
    max_users: number;
    max_projects: number;
    industry: string | null;
    country: string | null;
    email: string | null;
    created_at: string;
}

interface SystemStats {
    organizations: { total: number; active: number; inactive: number; verified: number };
    users: { total: number; active: number; pending: number; suspended: number };
    projects: { total: number; active: number; completed: number };
    tasks: { total: number; completed: number; in_progress: number };
    active_timers: number;
}

interface SystemUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    user_status: string;
    is_active: boolean;
    organization_id: string | null;
    organization_name: string | null;
    avatar_url: string | null;
    position: string | null;
    last_login_at: string | null;
    created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<string, { label: string; color: string }> = {
    free: { label: "Free", color: "bg-foreground/5 text-foreground/50 border-foreground/10" },
    starter: { label: "Starter", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    pro: { label: "Pro", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    enterprise: { label: "Enterprise", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

const STATUS_COLORS: Record<string, string> = {
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    suspended: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ROLE_COLORS: Record<string, string> = {
    system_admin: "bg-amber-500/10 text-amber-400",
    org_admin: "bg-purple-500/10 text-purple-400",
    admin: "bg-purple-500/10 text-purple-400",
    manager: "bg-blue-500/10 text-blue-400",
    employee: "bg-foreground/5 text-foreground/60",
};

function OrgInitial({ name, logoUrl }: { name: string; logoUrl: string | null }) {
    const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden"
            style={{ background: logoUrl ? undefined : color }}>
            {logoUrl ? <img src={logoUrl} alt={name} className="w-full h-full object-cover" /> : name[0]?.toUpperCase()}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, color, trend }: {
    icon: React.ElementType; label: string; value: number | string;
    sub?: string; color: string; trend?: string;
}) {
    return (
        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center`} style={{ background: `${color}18` }}>
                    <Icon size={18} style={{ color }} />
                </div>
                {trend && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <TrendingUp size={12} />{trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-foreground/50 mt-0.5">{label}</p>
                {sub && <p className="text-xs text-foreground/30 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"overview" | "organizations" | "users">("overview");

    // Org state
    const [orgs, setOrgs] = useState<OrgCard[]>([]);
    const [filtered, setFiltered] = useState<OrgCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

    // System stats
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Users
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersTotal, setUsersTotal] = useState(0);
    const [userSearch, setUserSearch] = useState("");
    const [userRoleFilter, setUserRoleFilter] = useState("");
    const [userStatusFilter, setUserStatusFilter] = useState("");
    const [userActionMenu, setUserActionMenu] = useState<string | null>(null);

    // ─── Fetch orgs ──────────────────────────────────────────────────────────
    const fetchOrgs = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data: OrgCard[] = await apiFetch("/api/organizations");
            setOrgs(data);
        } catch (e: any) {
            setError(e.message || "Unable to connect to the server");
        } finally {
            setLoading(false);
        }
    }, []);

    // ─── Fetch system stats ───────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const data = await apiGet<SystemStats>("/api/system/stats");
            setStats(data);
        } catch {
            // silently fail
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // ─── Fetch users ──────────────────────────────────────────────────────────
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const params: Record<string, string> = {};
            if (userSearch) params.search = userSearch;
            if (userRoleFilter) params.role = userRoleFilter;
            if (userStatusFilter) params.status = userStatusFilter;
            const data = await apiGet<{ users: SystemUser[]; total: number }>("/api/system/users", params);
            setUsers(data.users);
            setUsersTotal(data.total);
        } catch {
            // silently fail
        } finally {
            setUsersLoading(false);
        }
    }, [userSearch, userRoleFilter, userStatusFilter]);

    useEffect(() => { fetchOrgs(); fetchStats(); }, [fetchOrgs, fetchStats]);
    useEffect(() => { if (activeTab === "users") fetchUsers(); }, [activeTab, fetchUsers]);

    // ─── Filter orgs ─────────────────────────────────────────────────────────
    useEffect(() => {
        const q = search.toLowerCase();
        let result = orgs.filter(o =>
            o.name.toLowerCase().includes(q) ||
            (o.slug || "").toLowerCase().includes(q) ||
            (o.industry || "").toLowerCase().includes(q) ||
            (o.country || "").toLowerCase().includes(q)
        );
        if (filterActive === "active") result = result.filter(o => o.is_active);
        if (filterActive === "inactive") result = result.filter(o => !o.is_active);
        setFiltered(result);
    }, [search, orgs, filterActive]);

    // ─── Org actions ─────────────────────────────────────────────────────────
    const handleOrgSelect = (org: OrgCard) => {
        if (typeof window !== "undefined") {
            localStorage.setItem("superadmin_selected_org_id", org.id);
            localStorage.setItem("superadmin_selected_org_name", org.name);
            localStorage.setItem("superadmin_selected_org_logo", org.logo_url || "");
        }
        router.push("/home");
    };

    const toggleOrgStatus = async (orgId: string, current: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try { await apiPut(`/api/organizations/${orgId}`, { is_active: !current }); fetchOrgs(); }
        catch (err: any) { setError(err.message || "Failed to update status"); }
        setActionMenuOpen(null);
    };

    const toggleOrgVerification = async (orgId: string, current: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try { await apiPut(`/api/organizations/${orgId}`, { is_verified: !current }); fetchOrgs(); }
        catch (err: any) { setError(err.message || "Failed to update verification"); }
        setActionMenuOpen(null);
    };

    // ─── User actions ─────────────────────────────────────────────────────────
    const updateUserStatus = async (userId: string, newStatus: string) => {
        try {
            await apiPut(`/api/system/users/${userId}/status`, { user_status: newStatus });
            fetchUsers();
        } catch (err: any) {
            setError(err.message || "Failed to update user");
        }
        setUserActionMenu(null);
    };

    // ─── Overview ─────────────────────────────────────────────────────────────
    const renderOverview = () => (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Building2} label="Total Organisations" value={stats?.organizations.total ?? "—"}
                    sub={`${stats?.organizations.active ?? 0} active`} color="#3b82f6" />
                <StatCard icon={Users} label="Total Users" value={stats?.users.total ?? "—"}
                    sub={`${stats?.users.pending ?? 0} pending approval`} color="#8b5cf6" />
                <StatCard icon={FolderKanban} label="Total Projects" value={stats?.projects.total ?? "—"}
                    sub={`${stats?.projects.active ?? 0} active`} color="#06b6d4" />
                <StatCard icon={Layers} label="Total Tasks" value={stats?.tasks.total ?? "—"}
                    sub={`${stats?.tasks.in_progress ?? 0} in progress`} color="#10b981" />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={CheckCircle} label="Verified Orgs" value={stats?.organizations.verified ?? "—"} color="#22c55e" />
                <StatCard icon={UserCheck} label="Active Users" value={stats?.users.active ?? "—"} color="#22c55e" />
                <StatCard icon={UserX} label="Suspended Users" value={stats?.users.suspended ?? "—"} color="#ef4444" />
                <StatCard icon={Timer} label="Active Timers" value={stats?.active_timers ?? "—"} color="#f59e0b" />
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6">
                <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                    <Shield size={16} className="text-blue-400" />
                    Admin Quick Actions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Manage Organisations", icon: Building2, color: "#3b82f6", action: () => setActiveTab("organizations") },
                        { label: "Manage Users", icon: Users, color: "#8b5cf6", action: () => setActiveTab("users") },
                        { label: "Dynamic Settings", icon: Settings, color: "#06b6d4", action: () => router.push("/super-admin/settings") },
                        { label: "Add Organisation", icon: Plus, color: "#10b981", action: () => { setActiveTab("organizations"); setShowCreateModal(true); } },
                    ].map(({ label, icon: Icon, color, action }) => (
                        <button key={label} onClick={action}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-foreground/8 bg-foreground/[0.01] hover:bg-foreground/5 hover:border-foreground/15 transition-all text-center group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110" style={{ background: `${color}15` }}>
                                <Icon size={18} style={{ color }} />
                            </div>
                            <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors leading-tight">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Org summary table */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                <div className="px-6 py-4 border-b border-foreground/5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Recent Organisations</h3>
                    <button onClick={() => setActiveTab("organizations")} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                        View all <ArrowUpRight size={12} />
                    </button>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-foreground/30">
                        <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
                    </div>
                ) : orgs.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-foreground/30 text-sm">No organisations yet</div>
                ) : (
                    <div className="divide-y divide-foreground/5">
                        {orgs.slice(0, 6).map(org => (
                            <div key={org.id} className="flex items-center gap-3 px-6 py-3 hover:bg-foreground/[0.02] transition-colors">
                                <OrgInitial name={org.name} logoUrl={org.logo_url} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                                    <p className="text-xs text-foreground/40">/{org.slug}</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-foreground/40">
                                    <Users size={12} />{org.user_count}
                                    <FolderKanban size={12} className="ml-2" />{org.project_count}
                                </div>
                                {org.is_verified && <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />}
                                {!org.is_active && <XCircle size={14} className="text-red-400 flex-shrink-0" />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // ─── Organizations tab ────────────────────────────────────────────────────
    const renderOrganizations = () => (
        <div className="space-y-5">
            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-64">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/30" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search organisations…"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-foreground/[0.03] border border-foreground/10 rounded-xl outline-none focus:border-blue-500 text-foreground placeholder:text-foreground/30 transition-colors" />
                </div>
                <div className="flex gap-1 p-1 bg-foreground/5 rounded-xl border border-foreground/10">
                    {(["all", "active", "inactive"] as const).map(f => (
                        <button key={f} onClick={() => setFilterActive(f)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${filterActive === f ? "bg-background text-foreground shadow-sm border border-foreground/10" : "text-foreground/50 hover:text-foreground"}`}>
                            {f}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-foreground/30 ml-auto">{filtered.length} org{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle size={16} />{error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-foreground/30">
                    <RefreshCw size={24} className="animate-spin mb-3" />
                    <p>Loading organisations…</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-foreground/30">
                    <Building2 size={48} className="mb-4 opacity-20" />
                    <p className="font-medium text-lg">{search ? "No results found" : "No organisations yet"}</p>
                    <p className="text-sm mt-1 opacity-60">Organisations will appear here once created</p>
                    <button onClick={() => setShowCreateModal(true)}
                        className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all">
                        <Plus size={16} /> Create First Organisation
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map(org => {
                        const plan = PLAN_CONFIG[org.subscription_plan] || PLAN_CONFIG.free;
                        return (
                            <div key={org.id} className="group relative rounded-2xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04] hover:border-blue-500/30 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.15)] transition-all duration-200 p-5">
                                {/* Top row */}
                                <div className="flex items-start gap-3 mb-4">
                                    <OrgInitial name={org.name} logoUrl={org.logo_url} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="font-semibold text-sm text-foreground truncate">{org.name}</p>
                                            {org.is_verified && <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />}
                                            {!org.is_active && <XCircle size={13} className="text-red-400 flex-shrink-0" />}
                                        </div>
                                        <p className="text-xs text-foreground/40 truncate">/{org.slug}</p>
                                    </div>
                                    <div className="relative">
                                        <button onClick={e => { e.stopPropagation(); setActionMenuOpen(actionMenuOpen === org.id ? null : org.id); }}
                                            className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all">
                                            <MoreVertical size={16} />
                                        </button>
                                        {actionMenuOpen === org.id && (
                                            <div className="absolute right-0 top-full mt-1 w-52 bg-background border border-foreground/10 rounded-xl shadow-lg py-1 z-20" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleOrgSelect(org)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-foreground/5 hover:text-foreground text-left">
                                                    <ChevronRight size={14} className="text-blue-400" /> Enter as org admin
                                                </button>
                                                <div className="h-px bg-foreground/5 my-1" />
                                                <button onClick={e => toggleOrgVerification(org.id, org.is_verified, e)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-foreground/5 hover:text-foreground text-left">
                                                    {org.is_verified ? <XCircle size={14} className="text-red-400" /> : <CheckCircle size={14} className="text-emerald-400" />}
                                                    {org.is_verified ? "Unverify Organisation" : "Verify Organisation"}
                                                </button>
                                                <div className="h-px bg-foreground/5 my-1" />
                                                <button onClick={e => toggleOrgStatus(org.id, org.is_active, e)}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${org.is_active ? "text-red-400 hover:bg-red-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}`}>
                                                    {org.is_active ? <Ban size={14} /> : <Check size={14} />}
                                                    {org.is_active ? "Suspend Organisation" : "Reactivate Organisation"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Badges */}
                                <div className="flex items-center gap-2 flex-wrap mb-4">
                                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${plan.color}`}>{plan.label}</span>
                                    {!org.is_active && <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Inactive</span>}
                                    {org.is_verified && <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified</span>}
                                    {org.industry && <span className="text-xs text-foreground/40 flex items-center gap-1"><BarChart3 size={11} />{org.industry}</span>}
                                    {org.country && <span className="text-xs text-foreground/40 flex items-center gap-1"><Globe size={11} />{org.country}</span>}
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center gap-4 pt-3 border-t border-foreground/5">
                                    <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                                        <Users size={12} />{org.user_count ?? 0} / {org.max_users} users
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                                        <FolderKanban size={12} />{org.project_count ?? 0} projects
                                    </div>
                                    <div className="ml-auto flex items-center gap-1 text-xs text-foreground/25">
                                        <Clock size={11} />{new Date(org.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                    </div>
                                </div>

                                {/* Enter button hover */}
                                <button onClick={() => handleOrgSelect(org)}
                                    className="mt-3 pt-3 border-t border-foreground/5 w-full flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs text-blue-400 font-medium flex items-center gap-1"><Shield size={12} /> Enter org dashboard</span>
                                    <ChevronRight size={14} className="text-blue-400" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    // ─── Users tab ────────────────────────────────────────────────────────────
    const renderUsers = () => (
        <div className="space-y-5">
            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-64">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/30" />
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-foreground/[0.03] border border-foreground/10 rounded-xl outline-none focus:border-blue-500 text-foreground placeholder:text-foreground/30 transition-colors" />
                </div>
                <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
                    className="px-3 py-2.5 text-sm bg-foreground/[0.03] border border-foreground/10 rounded-xl outline-none focus:border-blue-500 text-foreground/70">
                    <option value="">All Roles</option>
                    <option value="system_admin">System Admin</option>
                    <option value="org_admin">Org Admin</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                </select>
                <select value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value)}
                    className="px-3 py-2.5 text-sm bg-foreground/[0.03] border border-foreground/10 rounded-xl outline-none focus:border-blue-500 text-foreground/70">
                    <option value="">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="rejected">Rejected</option>
                </select>
                <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-sm text-foreground/50 hover:text-foreground transition-all">
                    <RefreshCw size={14} className={usersLoading ? "animate-spin" : ""} /> Refresh
                </button>
                <span className="text-xs text-foreground/30 ml-auto">{usersTotal} user{usersTotal !== 1 ? "s" : ""}</span>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-foreground/5 bg-foreground/[0.02]">
                                <th className="text-left px-5 py-3 text-xs font-medium text-foreground/40 uppercase tracking-wider">User</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-foreground/40 uppercase tracking-wider">Organisation</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-foreground/40 uppercase tracking-wider">Role</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-foreground/40 uppercase tracking-wider">Status</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-foreground/40 uppercase tracking-wider">Last Login</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/5">
                            {usersLoading ? (
                                <tr><td colSpan={6} className="py-12 text-center text-foreground/30">
                                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" /> Loading users…
                                </td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-foreground/30 text-sm">No users found</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-foreground/[0.02] transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-medium text-foreground/60 overflow-hidden flex-shrink-0">
                                                {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user.full_name[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground/90 text-sm">{user.full_name}</p>
                                                <p className="text-xs text-foreground/40">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-sm text-foreground/60">{user.organization_name || <span className="text-foreground/30 italic">No org</span>}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] || "bg-foreground/5 text-foreground/50"}`}>
                                            {user.role.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[user.user_status] || "bg-foreground/5 text-foreground/50 border-foreground/10"}`}>
                                            {user.user_status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-foreground/40">
                                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="relative">
                                            <button onClick={() => setUserActionMenu(userActionMenu === user.id ? null : user.id)}
                                                className="p-1.5 text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all">
                                                <MoreVertical size={16} />
                                            </button>
                                            {userActionMenu === user.id && (
                                                <div className="absolute right-0 top-full mt-1 w-44 bg-background border border-foreground/10 rounded-xl shadow-lg py-1 z-20">
                                                    {user.user_status !== "approved" && (
                                                        <button onClick={() => updateUserStatus(user.id, "approved")}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 text-left">
                                                            <UserCheck size={14} /> Approve User
                                                        </button>
                                                    )}
                                                    {user.user_status !== "suspended" && (
                                                        <button onClick={() => updateUserStatus(user.id, "suspended")}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 text-left">
                                                            <Lock size={14} /> Suspend User
                                                        </button>
                                                    )}
                                                    {user.user_status === "suspended" && (
                                                        <button onClick={() => updateUserStatus(user.id, "approved")}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 text-left">
                                                            <Unlock size={14} /> Unsuspend User
                                                        </button>
                                                    )}
                                                    {user.user_status !== "rejected" && (
                                                        <button onClick={() => updateUserStatus(user.id, "rejected")}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/50 hover:bg-foreground/5 text-left">
                                                            <XCircle size={14} /> Reject User
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="-m-6 bg-background text-foreground" style={{ minHeight: "calc(100vh - 64px)" }}
            onClick={() => { setActionMenuOpen(null); setUserActionMenu(null); }}>

            {/* Hero Header */}
            <div className="relative overflow-hidden border-b border-foreground/5 bg-gradient-to-br from-background via-background to-blue-950/10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.08),transparent_60%)]" />
                <div className="relative p-6 lg:p-10">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
                                    <Crown size={22} className="text-amber-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">Super Admin Portal</h1>
                                    <p className="text-sm text-foreground/40">Full system management and monitoring</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push("/super-admin/settings")}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-sm text-foreground/60 hover:text-foreground transition-all">
                                <Settings size={15} /> Settings
                            </button>
                            <button onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-sm shadow-blue-500/20">
                                <Plus size={16} /> Add Organisation
                            </button>
                            <button onClick={() => { fetchOrgs(); fetchStats(); }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-sm text-foreground/50 hover:text-foreground transition-all">
                                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* Quick stat pills */}
                    <div className="flex items-center gap-4 flex-wrap">
                        {[
                            { icon: Building2, label: "Orgs", value: stats?.organizations.total ?? orgs.length, color: "#3b82f6" },
                            { icon: Users, label: "Users", value: stats?.users.total ?? "—", color: "#8b5cf6" },
                            { icon: FolderKanban, label: "Projects", value: stats?.projects.total ?? "—", color: "#06b6d4" },
                            { icon: Activity, label: "Active Timers", value: stats?.active_timers ?? "—", color: "#10b981" },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/[0.03] border border-foreground/8">
                                <Icon size={14} style={{ color }} />
                                <span className="text-sm text-foreground/60">{label}</span>
                                <span className="text-sm font-bold text-foreground">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-foreground/5 px-6 lg:px-10">
                <nav className="flex gap-0">
                    {([
                        { id: "overview", label: "Overview", icon: BarChart3 },
                        { id: "organizations", label: "Organisations", icon: Building2 },
                        { id: "users", label: "Users", icon: Users },
                    ] as const).map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all ${activeTab === id
                                ? "border-blue-500 text-blue-400"
                                : "border-transparent text-foreground/50 hover:text-foreground hover:border-foreground/20"
                            }`}>
                            <Icon size={15} />{label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content */}
            <div className="p-6 lg:p-10">
                {activeTab === "overview" && renderOverview()}
                {activeTab === "organizations" && renderOrganizations()}
                {activeTab === "users" && renderUsers()}
            </div>

            {/* Modals */}
            <CreateOrgModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={fetchOrgs} />
        </div>
    );
}
