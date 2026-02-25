"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Zap, Plus, Power, Trash2, Edit2, Clock, Loader2, X, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
    getAutomationRules, createAutomationRule, updateAutomationRule,
    deleteAutomationRule, getAutomationLogs,
    type AutomationRule, type AutomationLog, type AutomationRuleCreate,
    type TriggerEvent, type ActionType,
} from "@/services/automation";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGERS: { value: TriggerEvent; label: string }[] = [
    { value: "task_created", label: "Task Created" },
    { value: "task_updated", label: "Task Updated" },
    { value: "task_status_changed", label: "Status Changed" },
    { value: "task_assigned", label: "Task Assigned" },
    { value: "task_due_soon", label: "Task Due Soon" },
    { value: "task_overdue", label: "Task Overdue" },
    { value: "task_completed", label: "Task Completed" },
    { value: "comment_added", label: "Comment Added" },
    { value: "project_status_changed", label: "Project Status Changed" },
    { value: "expense_submitted", label: "Expense Submitted" },
    { value: "timesheet_submitted", label: "Timesheet Submitted" },
];

const ACTIONS: { value: ActionType; label: string }[] = [
    { value: "send_notification", label: "Send Notification" },
    { value: "send_email", label: "Send Email" },
    { value: "assign_task", label: "Assign Task" },
    { value: "change_status", label: "Change Status" },
    { value: "change_priority", label: "Change Priority" },
    { value: "add_label", label: "Add Label" },
    { value: "create_subtask", label: "Create Subtask" },
    { value: "notify_manager", label: "Notify Manager" },
    { value: "escalate", label: "Escalate" },
    { value: "webhook", label: "Call Webhook" },
];

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({ rule, onEdit, onDelete, onToggle }: {
    rule: AutomationRule;
    onEdit: (r: AutomationRule) => void;
    onDelete: (r: AutomationRule) => void;
    onToggle: (r: AutomationRule) => void;
}) {
    const triggerLabel = TRIGGERS.find((t) => t.value === rule.trigger_event)?.label ?? rule.trigger_event;
    const actionLabels = rule.actions.map((a) =>
        ACTIONS.find((x) => x.value === a.type)?.label ?? a.type
    );

    return (
        <div className={`p-5 rounded-2xl border transition-all ${rule.is_active
            ? "border-foreground/10 bg-foreground/[0.02]"
            : "border-foreground/5 bg-foreground/[0.01] opacity-60"
            }`}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground/90 truncate">{rule.name}</h3>
                    {rule.description && (
                        <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">{rule.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => onEdit(rule)}
                        className="p-1.5 rounded-lg hover:bg-foreground/[0.05] text-foreground/50 hover:text-foreground/80 transition-colors"
                    ><Edit2 size={13} /></button>
                    <button
                        onClick={() => onDelete(rule)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground/50 hover:text-red-400 transition-colors"
                    ><Trash2 size={13} /></button>
                </div>
            </div>

            {/* Pipeline */}
            <div className="flex items-center gap-2 flex-wrap text-xs mb-4">
                <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-medium">
                    {triggerLabel}
                </span>
                <span className="text-foreground/40">→</span>
                {actionLabels.slice(0, 3).map((a, i) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-foreground/[0.05] text-foreground/60">{a}</span>
                ))}
                {actionLabels.length > 3 && (
                    <span className="text-foreground/40">+{actionLabels.length - 3} more</span>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-foreground/40">
                    <span className="flex items-center gap-1">
                        <Zap size={10} /> {rule.trigger_count ?? 0} runs
                    </span>
                    {rule.last_triggered_at && (
                        <span className="flex items-center gap-1">
                            <Clock size={10} /> {new Date(rule.last_triggered_at).toLocaleDateString()}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => onToggle(rule)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${rule.is_active
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        : "bg-slate-500/20 text-foreground/50 hover:bg-slate-500/30"
                        }`}
                >
                    <Power size={10} />
                    {rule.is_active ? "Active" : "Disabled"}
                </button>
            </div>
        </div>
    );
}

// ─── Rule Form Modal ──────────────────────────────────────────────────────────

function RuleModal({ rule, onSave, onClose }: {
    rule: AutomationRule | null;
    onSave: () => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState<AutomationRuleCreate>({
        name: rule?.name ?? "",
        description: rule?.description ?? "",
        trigger_event: rule?.trigger_event ?? "task_created",
        conditions: rule?.conditions ?? [],
        actions: rule?.actions ?? [{ type: "send_notification", params: {} }],
        is_active: rule?.is_active ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleAddAction = () => setForm((f) => ({
        ...f, actions: [...f.actions, { type: "send_notification", params: {} }],
    }));
    const handleRemoveAction = (i: number) => setForm((f) => ({
        ...f, actions: f.actions.filter((_, idx) => idx !== i),
    }));

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Name is required"); return; }
        setSaving(true); setError("");
        try {
            if (rule?.id) await updateAutomationRule(rule.id, form);
            else await createAutomationRule(form);
            onSave();
        } catch (e: any) {
            setError(e?.message ?? "Save failed");
        } finally { setSaving(false); }
    };

    const fieldCls = "w-full px-3 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground/90 text-sm placeholder-foreground/60 focus:outline-none focus:border-blue-500/50";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-foreground/10">
                    <h2 className="text-lg font-semibold text-foreground/90">
                        {rule ? "Edit Rule" : "New Automation Rule"}
                    </h2>
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
                            className={fieldCls} placeholder="e.g. Notify on overdue task" />
                    </div>

                    <div>
                        <label className="block text-sm text-foreground/60 mb-1">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className={`${fieldCls} resize-none`} rows={2} />
                    </div>

                    <div>
                        <label className="block text-sm text-foreground/60 mb-1">Trigger</label>
                        <select
                            value={form.trigger_event}
                            onChange={(e) => setForm({ ...form, trigger_event: e.target.value as TriggerEvent })}
                            className="w-full px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/90 text-sm"
                        >
                            {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-foreground/60">Actions</label>
                            <button onClick={handleAddAction} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
                        </div>
                        {form.actions.map((action, i) => (
                            <div key={i} className="flex items-center gap-2 mb-2">
                                <select
                                    value={action.type}
                                    onChange={(e) => {
                                        const updated = [...form.actions];
                                        updated[i] = { ...updated[i], type: e.target.value as ActionType };
                                        setForm({ ...form, actions: updated });
                                    }}
                                    className="flex-1 px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/90 text-sm"
                                >
                                    {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                                </select>
                                {form.actions.length > 1 && (
                                    <button onClick={() => handleRemoveAction(i)} className="text-foreground/40 hover:text-red-400">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" className="sr-only peer" checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                            <div className="w-10 h-5 bg-foreground/[0.05] peer-checked:bg-blue-500 rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
                        </div>
                        <span className="text-sm text-foreground/60">Enable this rule</span>
                    </label>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground/90">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {rule ? "Save Changes" : "Create Rule"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Automation Page ──────────────────────────────────────────────────────────

export default function AutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [logs, setLogs] = useState<AutomationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"rules" | "logs">("rules");
    const [editRule, setEditRule] = useState<AutomationRule | null | false>(false);
    const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [r, l] = await Promise.all([
                getAutomationRules({ limit: 100 }),
                getAutomationLogs({ limit: 50 }),
            ]);
            setRules(r);
            setLogs(l);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleToggle = async (rule: AutomationRule) => {
        try {
            const updated = await updateAutomationRule(rule.id, { is_active: !rule.is_active });
            setRules((prev) => prev.map((r) => r.id === rule.id ? updated : r));
        } catch { }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteAutomationRule(deleteTarget.id);
            setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch { } finally { setDeleting(false); }
    };

    const LOG_STATUS_MAP: Record<string, string> = {
        success: "bg-green-500/20 text-green-400",
        failed: "bg-red-500/20 text-red-400",
        partial: "bg-amber-500/20 text-amber-400",
    };

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Zap size={22} className="text-blue-400" /> Automation
                    </h1>
                    <p className="text-sm text-foreground/50 mt-1">{rules.length} rules · {rules.filter((r) => r.is_active).length} active</p>
                </div>
                <button
                    onClick={() => setEditRule(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                    <Plus size={16} /> New Rule
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-foreground/[0.02] border border-foreground/10 rounded-xl p-1 w-fit">
                {(["rules", "logs"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? "bg-blue-600 text-white" : "text-foreground/50 hover:text-foreground/80"
                            }`}
                    >
                        {t === "logs" ? "Execution Log" : "Rules"}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 size={28} className="animate-spin text-blue-400" />
                </div>
            ) : tab === "rules" ? (
                rules.length === 0 ? (
                    <div className="text-center py-16">
                        <Zap size={40} className="text-foreground/30 mx-auto mb-3" />
                        <p className="text-foreground/50">No automation rules yet. Create one to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {rules.map((rule) => (
                            <RuleCard
                                key={rule.id} rule={rule}
                                onEdit={(r) => setEditRule(r)}
                                onDelete={(r) => setDeleteTarget(r)}
                                onToggle={handleToggle}
                            />
                        ))}
                    </div>
                )
            ) : (
                /* Logs tab */
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-foreground/10">
                                {["Rule", "Event", "Entity", "Status", "Executed", "Actions"].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs text-foreground/50 font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-foreground/40">No logs yet</td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="border-b border-foreground/5 hover:bg-foreground/[0.01] transition-colors">
                                    <td className="px-4 py-3 text-foreground/80 font-medium">{log.rule_name}</td>
                                    <td className="px-4 py-3 text-foreground/60 text-xs">{log.trigger_event?.replace(/_/g, " ")}</td>
                                    <td className="px-4 py-3 text-foreground/60 text-xs">{log.entity_type}/{log.entity_id?.slice(0, 8)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LOG_STATUS_MAP[log.status] || "bg-slate-500/20 text-foreground/60"}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-foreground/50 text-xs">
                                        {new Date(log.executed_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-foreground/50 text-xs">
                                        {log.actions_executed?.join(", ") ?? "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Rule form modal */}
            {editRule !== false && (
                <RuleModal
                    rule={editRule}
                    onSave={() => { setEditRule(false); fetchAll(); }}
                    onClose={() => setEditRule(false)}
                />
            )}

            {/* Delete confirm */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-base font-semibold text-foreground/90 mb-2">Delete Rule</h3>
                        <p className="text-sm text-foreground/60 mb-5">
                            Are you sure you want to delete "{deleteTarget.name}"?
                        </p>
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
