"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Plus, Settings, Trash2, Users, Loader2, Check, X, Edit2, Globe, Lock } from "lucide-react";
import { getToken } from "@/lib/auth";

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
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Request failed"); }
    if (res.status === 204) return null;
    return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Workspace {
    id: string;
    name: string;
    slug: string;
    description?: string;
    is_public: boolean;
    member_count?: number;
    owner_name?: string;
    created_at: string;
}

// ─── Create/Edit Modal ────────────────────────────────────────────────────────

function WorkspaceModal({ workspace, onSave, onClose }: {
    workspace?: Workspace;
    onSave: (ws: Workspace) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        name: workspace?.name ?? "",
        slug: workspace?.slug ?? "",
        description: workspace?.description ?? "",
        is_public: workspace?.is_public ?? false,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Name is required"); return; }
        setSaving(true); setError("");
        try {
            const data = workspace
                ? await apiFetch(`/workspaces/${workspace.id}`, { method: "PUT", body: JSON.stringify(form) })
                : await apiFetch("/api/workspaces", { method: "POST", body: JSON.stringify(form) });
            onSave(data);
        } catch (e: any) { setError(e?.message || "Failed to save workspace"); }
        finally { setSaving(false); }
    };

    const fieldCls = "w-full px-3 py-2.5 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-foreground placeholder-foreground/30 focus:outline-none focus:border-indigo-500/50 text-sm";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-foreground/10">
                    <h2 className="font-semibold text-foreground">{workspace ? "Edit Workspace" : "New Workspace"}</h2>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    {error && <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
                    <div>
                        <label className="block text-xs text-foreground/50 mb-1">Workspace Name *</label>
                        <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }); }} className={fieldCls} placeholder="My Workspace" />
                    </div>
                    <div>
                        <label className="block text-xs text-foreground/50 mb-1">Slug</label>
                        <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`${fieldCls} font-mono`} placeholder="my-workspace" />
                    </div>
                    <div>
                        <label className="block text-xs text-foreground/50 mb-1">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${fieldCls} resize-none`} rows={3} placeholder="What is this workspace used for?" />
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-foreground/10">
                        <span className="text-sm text-foreground/80 font-medium flex items-center gap-2">
                            {form.is_public ? <Globe size={14} className="text-green-500" /> : <Lock size={14} className="text-foreground/40" />}
                            {form.is_public ? "Public workspace" : "Private workspace"}
                        </span>
                        <button onClick={() => setForm({ ...form, is_public: !form.is_public })}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.is_public ? "bg-indigo-500" : "bg-foreground/20"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_public ? "translate-x-5" : ""}`} />
                        </button>
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-5 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/50 hover:text-foreground">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {workspace ? "Save Changes" : "Create Workspace"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Workspace Card ───────────────────────────────────────────────────────────

function WorkspaceCard({ ws, onEdit, onDelete }: { ws: Workspace; onEdit: (ws: Workspace) => void; onDelete: (id: string) => void }) {
    const hue = ws.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return (
        <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] dark:bg-white/3 hover:bg-foreground/[0.04] dark:hover:bg-white/5 transition-all group">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: `hsl(${hue}, 60%, 45%)` }}>
                        {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-foreground text-sm">{ws.name}</p>
                        <p className="text-xs text-foreground/40 font-mono">/{ws.slug}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(ws)} className="p-1.5 rounded-lg text-foreground/40 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => onDelete(ws.id)} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                </div>
            </div>
            {ws.description && <p className="text-xs text-foreground/50 mb-3 line-clamp-2">{ws.description}</p>}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                    <Users size={11} />
                    <span>{ws.member_count ?? 0} members</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ws.is_public ? "bg-green-500/15 text-green-500" : "bg-foreground/10 text-foreground/50"}`}>
                    {ws.is_public ? "Public" : "Private"}
                </span>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspacesPage() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editWs, setEditWs] = useState<Workspace | null>(null);
    const [toast, setToast] = useState("");
    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch("/api/workspaces");
            setWorkspaces(Array.isArray(data) ? data : (data?.items ?? []));
        } catch { setWorkspaces([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this workspace? This cannot be undone.")) return;
        try { await apiFetch(`/workspaces/${id}`, { method: "DELETE" }); setWorkspaces((prev) => prev.filter((w) => w.id !== id)); showToast("Workspace deleted"); }
        catch (e: any) { showToast(e?.message || "Failed to delete"); }
    };

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm shadow-2xl">
                    <Check size={14} /> {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Building2 size={22} className="text-indigo-500 dark:text-indigo-400" /> Workspaces
                    </h1>
                    <p className="text-sm text-foreground/50 mt-1">Organize your teams and projects into separate workspaces</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
                    <Plus size={15} /> New Workspace
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
            ) : workspaces.length === 0 ? (
                <div className="text-center py-20">
                    <Building2 size={48} className="text-foreground/15 mx-auto mb-4" />
                    <p className="text-foreground/40 text-sm">No workspaces yet</p>
                    <button onClick={() => setShowCreate(true)}
                        className="mt-4 text-indigo-500 dark:text-indigo-400 hover:underline text-sm flex items-center gap-1 mx-auto">
                        <Plus size={13} /> Create your first workspace
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workspaces.map((ws) => (
                        <WorkspaceCard key={ws.id} ws={ws} onEdit={setEditWs} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            {/* Modals */}
            {showCreate && (
                <WorkspaceModal onSave={(ws) => { setWorkspaces((prev) => [ws, ...prev]); setShowCreate(false); showToast("Workspace created"); }} onClose={() => setShowCreate(false)} />
            )}
            {editWs && (
                <WorkspaceModal workspace={editWs} onSave={(ws) => { setWorkspaces((prev) => prev.map((w) => w.id === ws.id ? ws : w)); setEditWs(null); showToast("Workspace updated"); }} onClose={() => setEditWs(null)} />
            )}
        </div>
    );
}
