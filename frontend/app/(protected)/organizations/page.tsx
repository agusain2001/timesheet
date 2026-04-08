"use client";

import { useEffect, useState } from "react";
import {
    Building2, Plus, Search, CheckCircle, XCircle,
    RefreshCw, ChevronRight, Users, FolderKanban, Globe, Loader2
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

function AddOrgModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [industry, setIndustry] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await apiFetch("/api/organizations", {
                method: "POST",
                body: JSON.stringify({ name, slug: slug || undefined, industry: industry || undefined, email: email || undefined })
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || "Failed to register organisation");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background border border-foreground/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-foreground/10">
                    <h2 className="text-lg font-semibold text-foreground/90">Register Organisation</h2>
                    <button type="button" onClick={onClose} className="text-foreground/40 hover:text-foreground/80"><XCircle size={20} /></button>
                </div>
                <div className="p-5 overflow-y-auto max-h-[70vh]">
                    {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>}
                    <form id="add-org-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Company Name *</label>
                            <input required value={name} onChange={e => {
                                setName(e.target.value);
                                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                            }} placeholder="e.g. Acme Corp" className="w-full px-3 py-2 rounded-xl bg-foreground/[0.03] border border-foreground/10 outline-none focus:border-blue-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Organization Slug</label>
                            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. acme-corp" className="w-full px-3 py-2 rounded-xl bg-foreground/[0.03] border border-foreground/10 outline-none focus:border-blue-500 text-sm" />
                            <p className="text-[10px] text-foreground/40 mt-1">Used for custom URLs or identifiers.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Industry</label>
                            <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology" className="w-full px-3 py-2 rounded-xl bg-foreground/[0.03] border border-foreground/10 outline-none focus:border-blue-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Contact Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@acmecorp.com" className="w-full px-3 py-2 rounded-xl bg-foreground/[0.03] border border-foreground/10 outline-none focus:border-blue-500 text-sm" />
                        </div>
                    </form>
                </div>
                <div className="p-5 border-t border-foreground/10 flex justify-end gap-3 bg-foreground/[0.01]">
                    <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-medium text-foreground/60 hover:text-foreground/90 transition">Cancel</button>
                    <button type="submit" form="add-org-form" disabled={loading} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50 shadow shadow-blue-600/20">
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        Register
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function OrganisationsPage() {
    const [orgs, setOrgs] = useState<Organisation[]>([]);
    const [filtered, setFiltered] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);

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
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchOrgs}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-sm text-foreground/60 hover:text-foreground transition-all"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    <button 
                        onClick={() => setShowAddModal(true)} 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                    >
                        <Plus size={16} /> Register
                    </button>
                </div>
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

            {showAddModal && (
                <AddOrgModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => { setShowAddModal(false); fetchOrgs(); }}
                />
            )}
        </div>
    );
}
