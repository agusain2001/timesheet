"use client";

import { useEffect, useState } from "react";
import {
    Building2, Plus, Search, CheckCircle, XCircle,
    RefreshCw, ChevronRight, Users, FolderKanban, Globe
} from "lucide-react";

import { apiFetch } from "@/services/api";

interface Organisation {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    industry: string | null;
    subscription_plan: string;
    is_verified: boolean;
    is_active: boolean;
    user_count: number;
    project_count: number;
    email: string | null;
    country: string | null;
    created_at: string;
}

const PLAN_COLORS: Record<string, string> = {
    free: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    starter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    professional: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function OrganisationsPage() {
    const [orgs, setOrgs] = useState<Organisation[]>([]);
    const [filtered, setFiltered] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const fetchOrgs = async () => {
        setLoading(true);
        setError("");
        try {
            const data: any = await apiFetch("/api/organizations");
            const list = Array.isArray(data) ? data : (data.items ?? []);
            setOrgs(list);
            setFiltered(list);
        } catch (e: any) {
            setError(e.message || "Failed to load organisations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrgs(); }, []);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(orgs.filter(o =>
            o.name.toLowerCase().includes(q) ||
            (o.slug || "").toLowerCase().includes(q) ||
            (o.industry || "").toLowerCase().includes(q) ||
            (o.email || "").toLowerCase().includes(q)
        ));
    }, [search, orgs]);

    return (
        <div className="bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <Building2 size={20} className="text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold">Organisations</h1>
                    </div>
                    <p className="text-sm text-foreground/40 ml-[52px]">
                        {orgs.length} organisation{orgs.length !== 1 ? "s" : ""} registered
                    </p>
                </div>
                <button
                    onClick={fetchOrgs}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-sm text-foreground/60 hover:text-foreground transition-all"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/30" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, slug, industry or email..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-foreground/[0.03] border border-foreground/10 rounded-xl outline-none focus:border-blue-500 text-foreground placeholder:text-foreground/30 transition-colors"
                />
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-foreground/30">
                    <RefreshCw size={20} className="animate-spin mr-2" />
                    Loading organisations...
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-foreground/30">
                    <Building2 size={40} className="mb-3 opacity-30" />
                    <p className="font-medium">{search ? "No results found" : "No organisations yet"}</p>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map(org => (
                        <div
                            key={org.id}
                            className="group rounded-2xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04] hover:border-foreground/20 transition-all p-5"
                        >
                            {/* Top row */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {/* Avatar / Logo */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {org.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-semibold text-sm text-foreground">{org.name}</p>
                                            {org.is_verified && (
                                                <CheckCircle size={13} className="text-emerald-400" />
                                            )}
                                            {!org.is_active && (
                                                <XCircle size={13} className="text-red-400" />
                                            )}
                                        </div>
                                        <p className="text-xs text-foreground/40">/{org.slug}</p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${PLAN_COLORS[org.subscription_plan] || PLAN_COLORS.free}`}>
                                    {org.subscription_plan}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="space-y-1.5 mb-4">
                                {org.industry && (
                                    <p className="text-xs text-foreground/50 flex items-center gap-1.5">
                                        <FolderKanban size={12} className="text-foreground/30" />
                                        {org.industry}
                                    </p>
                                )}
                                {org.email && (
                                    <p className="text-xs text-foreground/50 flex items-center gap-1.5">
                                        <Globe size={12} className="text-foreground/30" />
                                        {org.email}
                                    </p>
                                )}
                                {org.country && (
                                    <p className="text-xs text-foreground/50 flex items-center gap-1.5">
                                        <Globe size={12} className="text-foreground/30" />
                                        {org.country}
                                    </p>
                                )}
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-4 pt-3 border-t border-foreground/5">
                                <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                                    <Users size={12} />
                                    {org.user_count} member{org.user_count !== 1 ? "s" : ""}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                                    <FolderKanban size={12} />
                                    {org.project_count} project{org.project_count !== 1 ? "s" : ""}
                                </div>
                                <div className="ml-auto text-xs text-foreground/30">
                                    {new Date(org.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
