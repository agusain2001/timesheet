"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Building2, Search, RefreshCw, Users, FolderKanban,
    CheckCircle, XCircle, ChevronRight, Clock, Shield,
    Globe, BarChart3, AlertCircle, Crown
} from "lucide-react";

import { apiFetch } from "@/services/api";

interface OrgStats {
    user_count: number;
    project_count: number;
    active_project_count: number;
    task_count: number;
    pending_user_count: number;
}

interface OrgCard {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    industry: string | null;
    country: string | null;
    subscription_plan: string;
    max_users: number;
    max_projects: number;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    stats?: OrgStats;
    // Basic counts from list endpoint
    user_count?: number;
    project_count?: number;
}

const PLAN_CONFIG: Record<string, { label: string; color: string }> = {
    free: { label: "Free", color: "bg-gray-500/15 text-gray-400 border-gray-500/20" },
    starter: { label: "Starter", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    professional: { label: "Pro", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
    enterprise: { label: "Enterprise", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
};

function OrgInitial({ name, logoUrl }: { name: string; logoUrl: string | null }) {
    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={name}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
        );
    }
    const colors = [
        "from-blue-500 to-cyan-500",
        "from-purple-500 to-pink-500",
        "from-green-500 to-emerald-500",
        "from-orange-500 to-amber-500",
        "from-indigo-500 to-blue-500",
    ];
    const colorIndex = name.charCodeAt(0) % colors.length;
    return (
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

export default function SuperAdminDashboard() {
    const router = useRouter();
    const [orgs, setOrgs] = useState<OrgCard[]>([]);
    const [filtered, setFiltered] = useState<OrgCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

    const fetchOrgs = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data: any = await apiFetch("/organizations");
            const list: OrgCard[] = Array.isArray(data) ? data : (data.items ?? []);
            setOrgs(list);
            setFiltered(list);
        } catch (e: any) {
            setError(e.message || "Failed to load organisations");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

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

    // When super admin clicks an org card, save selection and redirect to dashboard
    const handleOrgSelect = (org: OrgCard) => {
        if (typeof window !== "undefined") {
            localStorage.setItem("superadmin_selected_org_id", org.id);
            localStorage.setItem("superadmin_selected_org_name", org.name);
            localStorage.setItem("superadmin_selected_org_logo", org.logo_url || "");
        }
        router.push("/home");
    };

    const totalUsers = orgs.reduce((sum, o) => sum + (o.user_count || 0), 0);
    const totalProjects = orgs.reduce((sum, o) => sum + (o.project_count || 0), 0);
    const activeOrgs = orgs.filter(o => o.is_active).length;

    return (
        <div className="min-h-screen bg-background text-foreground">
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
                                    <p className="text-sm text-foreground/40">Select an organisation to view its full dashboard</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={fetchOrgs}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-sm text-foreground/50 hover:text-foreground transition-all"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                    </div>

                    {/* Platform Stats */}
                    <div className="grid grid-cols-3 gap-4 max-w-xl">
                        <div className="bg-foreground/[0.03] border border-foreground/8 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Building2 size={14} className="text-blue-400" />
                                <span className="text-xs text-foreground/40">Organisations</span>
                            </div>
                            <p className="text-2xl font-bold">{orgs.length}</p>
                            <p className="text-xs text-emerald-400 mt-0.5">{activeOrgs} active</p>
                        </div>
                        <div className="bg-foreground/[0.03] border border-foreground/8 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Users size={14} className="text-purple-400" />
                                <span className="text-xs text-foreground/40">Total Users</span>
                            </div>
                            <p className="text-2xl font-bold">{totalUsers}</p>
                        </div>
                        <div className="bg-foreground/[0.03] border border-foreground/8 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <FolderKanban size={14} className="text-cyan-400" />
                                <span className="text-xs text-foreground/40">Total Projects</span>
                            </div>
                            <p className="text-2xl font-bold">{totalProjects}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-6 lg:px-10 border-b border-foreground/5">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-64">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/30" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search organisations..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-foreground/[0.03] border border-foreground/10 rounded-xl outline-none focus:border-blue-500 text-foreground placeholder:text-foreground/30 transition-colors"
                        />
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-1 p-1 bg-foreground/5 rounded-xl border border-foreground/10">
                        {(["all", "active", "inactive"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterActive(f)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${filterActive === f ? "bg-background text-foreground shadow-sm border border-foreground/10" : "text-foreground/50 hover:text-foreground"}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <span className="text-xs text-foreground/30 ml-auto">{filtered.length} organisation{filtered.length !== 1 ? "s" : ""}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 lg:px-10">
                {error && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-foreground/30">
                        <RefreshCw size={24} className="animate-spin mb-3" />
                        <p>Loading organisations...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-foreground/30">
                        <Building2 size={48} className="mb-4 opacity-20" />
                        <p className="font-medium text-lg">{search ? "No results found" : "No organisations yet"}</p>
                        <p className="text-sm mt-1 opacity-60">Organisations will appear here once created</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filtered.map(org => {
                            const plan = PLAN_CONFIG[org.subscription_plan] || PLAN_CONFIG.free;
                            return (
                                <button
                                    key={org.id}
                                    onClick={() => handleOrgSelect(org)}
                                    className="group text-left rounded-2xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04] hover:border-blue-500/30 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.15)] transition-all duration-200 p-5 cursor-pointer"
                                >
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
                                        <ChevronRight size={16} className="text-foreground/20 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex items-center gap-2 flex-wrap mb-4">
                                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${plan.color}`}>
                                            {plan.label}
                                        </span>
                                        {!org.is_active && (
                                            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                                Inactive
                                            </span>
                                        )}
                                        {org.industry && (
                                            <span className="text-xs text-foreground/40 flex items-center gap-1">
                                                <BarChart3 size={11} className="text-foreground/20" />
                                                {org.industry}
                                            </span>
                                        )}
                                        {org.country && (
                                            <span className="text-xs text-foreground/40 flex items-center gap-1">
                                                <Globe size={11} className="text-foreground/20" />
                                                {org.country}
                                            </span>
                                        )}
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex items-center gap-4 pt-3 border-t border-foreground/5">
                                        <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                                            <Users size={12} />
                                            {org.user_count ?? 0} / {org.max_users}
                                            <span className="text-foreground/20">users</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                                            <FolderKanban size={12} />
                                            {org.project_count ?? 0}
                                            <span className="text-foreground/20">projects</span>
                                        </div>
                                        <div className="ml-auto flex items-center gap-1 text-xs text-foreground/25">
                                            <Clock size={11} />
                                            {new Date(org.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                        </div>
                                    </div>

                                    {/* Hover CTA */}
                                    <div className="mt-3 pt-3 border-t border-foreground/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
                                            <Shield size={12} />
                                            View organisation dashboard
                                        </span>
                                        <ChevronRight size={14} className="text-blue-400" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
