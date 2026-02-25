"use client";

import { useState, useEffect, useCallback } from "react";
import {
    FileText, Plus, Edit2, Trash2, Copy, Loader2, X, AlertCircle, CheckCircle2,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { apiGet } from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
    id: string;
    name: string;
    description?: string;
    task_type?: string;
    priority?: string;
    status?: string;
    estimated_hours?: number;
    checklist?: string[];
    tags?: string[];
    use_count: number;
    created_at: string;
}

interface TemplateForm {
    name: string;
    description: string;
    task_type: string;
    priority: string;
    status: string;
    estimated_hours: string;
    checklist: string[];
    tags: string[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Request failed");
    }
    if (res.status === 204) return null;
    return res.json();
}

// ─── Priority / status config ─────────────────────────────────────────────────

const PRIORITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["todo", "in_progress", "review", "backlog", "draft"];
const TASK_TYPES = ["project", "personal", "bug", "feature", "improvement", "assigned"];

const PRIORITY_BADGE: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-blue-500/20 text-blue-400",
    low: "bg-foreground/[0.02]0/20 text-foreground/60",
};

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onEdit, onDelete, onDuplicate }: {
    tpl: Template;
    onEdit: (t: Template) => void;
    onDelete: (t: Template) => void;
    onDuplicate: (t: Template) => void;
}) {
    return (
        <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] hover:bg-white/8 transition-all flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                        <FileText size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground/90 text-sm">{tpl.name}</h3>
                        <p className="text-xs text-foreground/40">{tpl.use_count} use{tpl.use_count !== 1 ? "s" : ""}</p>
                    </div>
                </div>
                <div className="flex items-center gap-0.5">
                    <button onClick={() => onDuplicate(tpl)}
                        className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground/80 hover:bg-foreground/10 transition-colors" title="Duplicate">
                        <Copy size={13} />
                    </button>
                    <button onClick={() => onEdit(tpl)}
                        className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground/80 hover:bg-foreground/10 transition-colors" title="Edit">
                        <Edit2 size={13} />
                    </button>
                    <button onClick={() => onDelete(tpl)}
                        className="p-1.5 rounded-lg text-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {tpl.description && (
                <p className="text-xs text-foreground/50 line-clamp-2">{tpl.description}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                {tpl.priority && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${PRIORITY_BADGE[tpl.priority] || "bg-foreground/[0.02]0/20 text-foreground/60"}`}>
                        {tpl.priority}
                    </span>
                )}
                {tpl.task_type && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400">
                        #{tpl.task_type}
                    </span>
                )}
                {tpl.estimated_hours && (
                    <span className="text-[10px] text-foreground/40">{tpl.estimated_hours}h estimated</span>
                )}
            </div>

            {tpl.checklist && tpl.checklist.length > 0 && (
                <div className="space-y-1">
                    {tpl.checklist.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-foreground/50">
                            <CheckCircle2 size={10} className="text-foreground/40 shrink-0" />
                            <span className="truncate">{item}</span>
                        </div>
                    ))}
                    {tpl.checklist.length > 3 && (
                        <p className="text-[10px] text-foreground/30">+{tpl.checklist.length - 3} more…</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Template Form Modal ──────────────────────────────────────────────────────

const EMPTY_FORM: TemplateForm = {
    name: "", description: "", task_type: "", priority: "medium",
    status: "todo", estimated_hours: "", checklist: [], tags: [],
};

function TemplateModal({ tpl, onSave, onClose }: {
    tpl: Template | null;
    onSave: () => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState<TemplateForm>(tpl ? {
        name: tpl.name,
        description: tpl.description ?? "",
        task_type: tpl.task_type ?? "",
        priority: tpl.priority ?? "medium",
        status: tpl.status ?? "todo",
        estimated_hours: tpl.estimated_hours?.toString() ?? "",
        checklist: tpl.checklist ?? [],
        tags: tpl.tags ?? [],
    } : EMPTY_FORM);
    const [checklistInput, setChecklistInput] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const fieldCls = "w-full px-3 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground/90 text-sm placeholder-foreground/40 focus:outline-none focus:border-blue-500/50";
    const selectCls = "w-full px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/90 text-sm focus:outline-none focus:border-blue-500/50";

    const addChecklistItem = () => {
        if (!checklistInput.trim()) return;
        setForm((f) => ({ ...f, checklist: [...f.checklist, checklistInput.trim()] }));
        setChecklistInput("");
    };

    const addTag = () => {
        if (!tagInput.trim() || form.tags.includes(tagInput.trim())) return;
        setForm((f) => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
        setTagInput("");
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Name is required"); return; }
        setSaving(true); setError("");
        const payload = {
            name: form.name.trim(),
            description: form.description || undefined,
            task_type: form.task_type || undefined,
            priority: form.priority,
            status: form.status,
            estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : undefined,
            checklist: form.checklist,
            tags: form.tags,
        };
        try {
            if (tpl) await apiFetch(`/task-templates/${tpl.id}`, { method: "PUT", body: JSON.stringify(payload) });
            else await apiFetch("/api/task-templates", { method: "POST", body: JSON.stringify(payload) });
            onSave();
        } catch (e: any) {
            setError(e?.message ?? "Save failed");
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-foreground/10">
                    <h2 className="text-lg font-semibold text-foreground/90">{tpl ? "Edit Template" : "New Template"}</h2>
                    <button onClick={onClose} className="text-foreground/50 hover:text-foreground/80"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-foreground/60 mb-1">Name *</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className={fieldCls} placeholder="e.g. Bug Investigation" />
                    </div>

                    <div>
                        <label className="block text-sm text-foreground/60 mb-1">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className={`${fieldCls} resize-none`} rows={2} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Task Type</label>
                            <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} className={selectCls}>
                                <option value="">None</option>
                                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Priority</label>
                            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectCls}>
                                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Default Status</label>
                            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectCls}>
                                {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Estimated Hours</label>
                            <input type="number" min={0.5} step={0.5} value={form.estimated_hours}
                                onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                                className={fieldCls} placeholder="e.g. 4" />
                        </div>
                    </div>

                    {/* Checklist */}
                    <div>
                        <label className="block text-sm text-foreground/60 mb-1">Checklist Items</label>
                        <div className="flex gap-2 mb-2">
                            <input value={checklistInput} onChange={(e) => setChecklistInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                                className={fieldCls} placeholder="Add item…" />
                            <button onClick={addChecklistItem} className="px-3 py-2 rounded-lg bg-foreground/10 text-foreground/80 hover:bg-white/15 transition-colors text-sm">+</button>
                        </div>
                        {form.checklist.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 mb-1">
                                <CheckCircle2 size={12} className="text-foreground/40 shrink-0" />
                                <span className="flex-1 text-sm text-foreground/60">{item}</span>
                                <button onClick={() => setForm((f) => ({ ...f, checklist: f.checklist.filter((_, j) => j !== i) }))}
                                    className="text-foreground/40 hover:text-red-400">
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm text-foreground/60 mb-1">Tags</label>
                        <div className="flex gap-2 mb-2">
                            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addTag()}
                                className={fieldCls} placeholder="Add tag…" />
                            <button onClick={addTag} className="px-3 py-2 rounded-lg bg-foreground/10 text-foreground/80 hover:bg-white/15 transition-colors text-sm">+</button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {form.tags.map((tag) => (
                                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs">
                                    {tag}
                                    <button onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))}
                                        className="hover:text-red-400">
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground/90">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {tpl ? "Save Changes" : "Create Template"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Templates Page ───────────────────────────────────────────────────────────

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<Template | null | false>(false);
    const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [search, setSearch] = useState("");

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch("/api/task-templates?limit=100");
            setTemplates(Array.isArray(data) ? data : (data?.items ?? []));
        } catch { setTemplates([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleDuplicate = async (tpl: Template) => {
        try {
            await apiFetch("/api/task-templates", {
                method: "POST",
                body: JSON.stringify({
                    name: `${tpl.name} (Copy)`,
                    description: tpl.description,
                    task_type: tpl.task_type,
                    priority: tpl.priority,
                    status: tpl.status,
                    estimated_hours: tpl.estimated_hours,
                    checklist: tpl.checklist,
                    tags: tpl.tags,
                }),
            });
            fetchAll();
        } catch { }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await apiFetch(`/task-templates/${deleteTarget.id}`, { method: "DELETE" });
            setDeleteTarget(null);
            fetchAll();
        } catch { } finally { setDeleting(false); }
    };

    const filtered = templates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <FileText size={22} className="text-blue-400" /> Task Templates
                    </h1>
                    <p className="text-sm text-foreground/50 mt-1">{templates.length} templates · reusable task blueprints</p>
                </div>
                <button onClick={() => setModal(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                    <Plus size={16} /> New Template
                </button>
            </div>

            {/* Search */}
            <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/80 placeholder-foreground/60 focus:outline-none focus:border-blue-500/50 text-sm"
            />

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin text-blue-400" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <FileText size={48} className="text-foreground/30 mx-auto mb-3" />
                    <p className="text-foreground/50 text-sm">
                        {search ? `No templates match "${search}"` : "No templates yet. Create your first one!"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((tpl) => (
                        <TemplateCard key={tpl.id} tpl={tpl}
                            onEdit={(t) => setModal(t)}
                            onDelete={(t) => setDeleteTarget(t)}
                            onDuplicate={handleDuplicate}
                        />
                    ))}
                </div>
            )}

            {/* Template modal */}
            {modal !== false && (
                <TemplateModal
                    tpl={modal}
                    onSave={() => { setModal(false); fetchAll(); }}
                    onClose={() => setModal(false)}
                />
            )}

            {/* Delete confirm */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-base font-semibold text-foreground/90 mb-2">Delete Template</h3>
                        <p className="text-sm text-foreground/60 mb-5">Delete "{deleteTarget.name}"? This cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground/90">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50">
                                {deleting && <Loader2 size={14} className="animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
