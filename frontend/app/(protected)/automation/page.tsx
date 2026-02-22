"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Zap, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
    X, Loader2, AlertCircle, ChevronDown, Play, Clock,
} from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Request failed"); }
    if (res.status === 204) return null;
    return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutomationRule {
    id: string;
    name: string;
    description?: string;
    trigger_event: string;
    conditions: Record<string, any>[];
    actions: Record<string, any>[];
    is_active: boolean;
    run_count: number;
    last_run_at?: string;
    created_at?: string;
}

interface AutomationLog {
    id: string;
    rule_name: string;
    triggered_at: string;
    status: string;
    result?: string;
}

// ─── Trigger / Action options ─────────────────────────────────────────────────

const TRIGGERS = [
    { value: "task_created", label: "Task Created" },
    { value: "task_completed", label: "Task Completed" },
    { value: "status_changed", label: "Status Changed" },
    { value: "due_date_passed", label: "Due Date Passed" },
    { value: "assignee_changed", label: "Assignee Changed" },
    { value: "priority_changed", label: "Priority Changed" },
    { value: "task_overdue", label: "Task Overdue" },
    { value: "comment_added", label: "Comment Added" },
];

const ACTIONS = [
    { value: "change_status", label: "Change Status" },
    { value: "assign_to", label: "Assign To User" },
    { value: "send_notification", label: "Send Notification" },
    { value: "add_comment", label: "Add Comment" },
    { value: "change_priority", label: "Change Priority" },
    { value: "set_due_date", label: "Set Due Date" },
    { value: "add_label", label: "Add Label/Tag" },
    { value: "webhook", label: "Trigger Webhook" },
];

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
    rule,
    onEdit,
    onDelete,
    onToggle,
}: {
    rule: AutomationRule;
    onEdit: (r: AutomationRule) => void;
    onDelete: (r: AutomationRule) => void;
    onToggle: (r: AutomationRule) => void;
}) {
    const trigger = TRIGGERS.find((t) => t.value === rule.trigger_event);
    const lastRun = rule.last_run_at ? new Date(rule.last_run_at).toLocaleDateString() : "Never";

    return (
        <div className={`p-5 rounded-2xl border transition-all ${rule.is_active
                ? "border-white/10 bg-white/5"
                : "border-white/5 bg-white/2 opacity-60"
            }`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-200 truncate">{rule.name}</h3>
                        {rule.is_active ? (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-400 font-medium">Active</span>
                        ) : (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/10 text-slate-500 font-medium">Inactive</span>
                        )}
                    </div>
                    {rule.description && (
                        <p className="text-xs text-slate-500 truncate">{rule.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                    <button onClick={() => onToggle(rule)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors" title={rule.is_active ? "Disable" : "Enable"}>
                        {rule.is_active ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => onEdit(rule)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={() => onDelete(rule)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Trigger → Actions */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                    ⚡ {trigger?.label || rule.trigger_event}
                </span>
                <span className="text-slate-600 text-xs">→</span>
                {rule.actions.slice(0, 3).map((a, i) => {
                    const actionDef = ACTIONS.find((x) => x.value === (a.type || a.action));
                    return (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-medium">
                            {actionDef?.label || a.type || a.action}
                        </span>
                    );
                })}
                {rule.actions.length > 3 && (
                    <span className="text-xs text-slate-600">+{rule.actions.length - 3}</span>
                )}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1"><Play size={10} /> {rule.run_count} runs</span>
                <span className="flex items-center gap-1"><Clock size={10} /> Last: {lastRun}</span>
            </div>
        </div>
    );
}

// ─── Rule Form Modal ──────────────────────────────────────────────────────────

function RuleFormModal({
    rule,
    onSave,
    onClose,
}: {
    rule: Partial<AutomationRule> | null;
    onSave: () => void;
    onClose: () => void;
}) {
    const isEdit = !!rule?.id;
    const [form, setForm] = useState({
        name: rule?.name || "",
        description: rule?.description || "",
        trigger_event: rule?.trigger_event || "task_created",
        conditions: rule?.conditions || [],
        actions: rule?.actions || [{ type: "change_status", value: "" }],
        is_active: rule?.is_active ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Name is required"); return; }
        setSaving(true);
        setError("");
        try {
            if (isEdit) {
                await apiFetch(`/advanced/automation-rules/${rule!.id}`, { method: "PUT", body: JSON.stringify(form) });
            } else {
                await apiFetch("/advanced/automation-rules", { method: "POST", body: JSON.stringify(form) });
            }
            onSave();
        } catch (e: any) { setError(e.message); }
        finally { setSaving(false); }
    };

    const addAction = () => setForm((f) => ({ ...f, actions: [...f.actions, { type: "send_notification", value: "" }] }));
    const removeAction = (i: number) => setForm((f) => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }));
    const updateAction = (i: number, key: string, val: string) =>
        setForm((f) => ({ ...f, actions: f.actions.map((a, idx) => idx === i ? { ...a, [key]: val } : a) }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-slate-200">{isEdit ? "Edit Rule" : "New Automation Rule"}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={20} /></button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Rule Name *</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                            placeholder="e.g. Notify on overdue task" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                            placeholder="What this rule does" />
                    </div>

                    {/* Trigger */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">⚡ Trigger Event</label>
                        <select value={form.trigger_event} onChange={(e) => setForm({ ...form, trigger_event: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 text-sm">
                            {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    {/* Actions */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-400">→ Actions</label>
                            <button onClick={addAction} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                <Plus size={11} /> Add Action
                            </button>
                        </div>
                        <div className="space-y-2">
                            {form.actions.map((action, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <select
                                        value={action.type || action.action || ""}
                                        onChange={(e) => updateAction(i, "type", e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 text-sm"
                                    >
                                        {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                                    </select>
                                    <input
                                        value={action.value || ""}
                                        onChange={(e) => updateAction(i, "value", e.target.value)}
                                        placeholder="Value (optional)"
                                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-sm placeholder-slate-600"
                                    />
                                    <button onClick={() => removeAction(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="sr-only peer" />
                            <div className="w-10 h-5 bg-white/10 peer-checked:bg-indigo-500 rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
                        </label>
                        <span className="text-sm text-slate-400">Active</span>
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-white/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2 disabled:opacity-50">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {isEdit ? "Save" : "Create Rule"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [logs, setLogs] = useState<AutomationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editRule, setEditRule] = useState<Partial<AutomationRule> | null>(null);
    const [deleteRule, setDeleteRule] = useState<AutomationRule | null>(null);
    const [tab, setTab] = useState<"rules" | "logs">("rules");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [r, l] = await Promise.all([
                apiFetch("/advanced/automation-rules"),
                apiFetch("/advanced/automation-logs?limit=50"),
            ]);
            setRules(r?.rules || r || []);
            setLogs(l?.logs || l || []);
        } catch { setRules([]); setLogs([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleToggle = async (rule: AutomationRule) => {
        try {
            await apiFetch(`/advanced/automation-rules/${rule.id}`, {
                method: "PUT",
                body: JSON.stringify({ is_active: !rule.is_active }),
            });
            fetchData();
        } catch (e: any) { alert(e.message); }
    };

    const handleDelete = async () => {
        if (!deleteRule) return;
        try {
            await apiFetch(`/advanced/automation-rules/${deleteRule.id}`, { method: "DELETE" });
            setDeleteRule(null);
            fetchData();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Zap size={22} className="text-indigo-400" /> Automation Rules</h1>
                    <p className="text-sm text-slate-500 mt-1">{rules.length} rules · {rules.filter((r) => r.is_active).length} active</p>
                </div>
                <button
                    onClick={() => { setEditRule({}); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                >
                    <Plus size={15} /> New Rule
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 w-fit">
                {(["rules", "logs"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                        {t === "rules" ? `Rules (${rules.length})` : `Execution Log (${logs.length})`}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
            ) : tab === "rules" ? (
                rules.length === 0 ? (
                    <div className="text-center py-16">
                        <Zap size={40} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm mb-3">No automation rules yet</p>
                        <button onClick={() => { setEditRule({}); setShowForm(true); }}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm">
                            Create First Rule
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {rules.map((r) => (
                            <RuleCard key={r.id} rule={r}
                                onEdit={(rule) => { setEditRule(rule); setShowForm(true); }}
                                onDelete={setDeleteRule}
                                onToggle={handleToggle}
                            />
                        ))}
                    </div>
                )
            ) : (
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                {["Rule", "Triggered At", "Status", "Result"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-600">No executions yet</td></tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/3 transition-colors">
                                    <td className="px-4 py-3 text-slate-300">{log.rule_name}</td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(log.triggered_at).toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${log.status === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-xs">{log.result || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <RuleFormModal rule={editRule} onSave={() => { setShowForm(false); setEditRule(null); fetchData(); }} onClose={() => { setShowForm(false); setEditRule(null); }} />
            )}

            {/* Delete Confirm */}
            {deleteRule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-semibold text-slate-200 mb-2">Delete Rule?</h3>
                        <p className="text-sm text-slate-500 mb-5"><strong className="text-slate-300">{deleteRule.name}</strong> will be permanently removed.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteRule(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
