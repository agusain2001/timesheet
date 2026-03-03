"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Zap, Plus, Power, Trash2, Edit2, Clock, Loader2, X, AlertCircle,
    Play, BookOpen, ChevronDown, CheckIcon, ArrowRight, Activity,
    Bell, Mail, UserCheck, GitBranch, AlertTriangle, Webhook,
    ListChecks, BarChart3,
} from "lucide-react";
import {
    getAutomationRules, createAutomationRule, updateAutomationRule,
    deleteAutomationRule, getAutomationLogs,
    type AutomationRule, type AutomationLog, type AutomationRuleCreate,
    type TriggerEvent, type ActionType,
} from "@/services/automation";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGERS: { value: TriggerEvent; label: string; icon: string; category: string }[] = [
    { value: "task_created", label: "Task Created", icon: "✨", category: "Tasks" },
    { value: "task_updated", label: "Task Updated", icon: "✏️", category: "Tasks" },
    { value: "task_status_changed", label: "Status Changed", icon: "🔄", category: "Tasks" },
    { value: "task_assigned", label: "Task Assigned", icon: "👤", category: "Tasks" },
    { value: "task_due_soon", label: "Task Due Soon", icon: "⏰", category: "Tasks" },
    { value: "task_overdue", label: "Task Overdue", icon: "🚨", category: "Tasks" },
    { value: "task_completed", label: "Task Completed", icon: "✅", category: "Tasks" },
    { value: "comment_added", label: "Comment Added", icon: "💬", category: "Tasks" },
    { value: "project_status_changed", label: "Project Status Changed", icon: "📋", category: "Projects" },
    { value: "expense_submitted", label: "Expense Submitted", icon: "💰", category: "Finance" },
    { value: "timesheet_submitted", label: "Timesheet Submitted", icon: "⏱️", category: "Finance" },
];

const ACTIONS: { value: ActionType; label: string; icon: React.ElementType; color: string; description: string }[] = [
    { value: "send_notification", label: "Send Notification", icon: Bell, color: "text-blue-400", description: "Push in-app notification to a user" },
    { value: "send_email", label: "Send Email", icon: Mail, color: "text-purple-400", description: "Send email to assignee or specific address" },
    { value: "assign_task", label: "Assign Task", icon: UserCheck, color: "text-green-400", description: "Auto-assign task to a user" },
    { value: "change_status", label: "Change Status", icon: GitBranch, color: "text-amber-400", description: "Update task status automatically" },
    { value: "change_priority", label: "Change Priority", icon: AlertTriangle, color: "text-orange-400", description: "Escalate or change task priority" },
    { value: "add_label", label: "Add Label", icon: ListChecks, color: "text-pink-400", description: "Tag the task with a label" },
    { value: "create_subtask", label: "Create Subtask", icon: Plus, color: "text-indigo-400", description: "Create a new subtask automatically" },
    { value: "notify_manager", label: "Notify Manager", icon: Bell, color: "text-rose-400", description: "Alert the team manager" },
    { value: "escalate", label: "Escalate", icon: AlertTriangle, color: "text-red-400", description: "Escalate to next approval level" },
    { value: "webhook", label: "Call Webhook", icon: Webhook, color: "text-cyan-400", description: "POST event data to external URL" },
];

const STATUS_OPTIONS = ["todo", "in_progress", "in_review", "blocked", "done", "cancelled"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical", "urgent"];

// Pre-built templates
const TEMPLATES: { name: string; description: string; emoji: string; rule: Omit<AutomationRuleCreate, "name"> }[] = [
    {
        name: "Overdue Task Alert",
        emoji: "🚨",
        description: "Notify the assignee when a task becomes overdue",
        rule: {
            description: "Automatically notify assignee when their task passes due date",
            trigger_event: "task_overdue",
            conditions: [],
            actions: [
                { type: "send_notification", params: { title: "Task Overdue!", message: "One of your tasks is past its due date." } },
                { type: "change_priority", params: { priority: "high" } },
            ],
            is_active: true,
        },
    },
    {
        name: "Auto-Assign on Create",
        emoji: "👤",
        description: "Auto-assign new tasks in a project to a default user",
        rule: {
            trigger_event: "task_created",
            conditions: [],
            actions: [{ type: "assign_task", params: { assignee_id: "" } }],
            is_active: true,
        },
    },
    {
        name: "Completed → Notify Manager",
        emoji: "✅",
        description: "Notify the manager whenever a task is marked Done",
        rule: {
            description: "Keep the manager informed of completed work",
            trigger_event: "task_completed",
            conditions: [],
            actions: [{ type: "notify_manager", params: { message: "A task was just completed in your project." } }],
            is_active: true,
        },
    },
    {
        name: "Status to In Review → Notify",
        emoji: "🔄",
        description: "Send a notification when a task moves to In Review",
        rule: {
            trigger_event: "task_status_changed",
            trigger_conditions: { status: "in_review" },
            conditions: [],
            actions: [{ type: "send_notification", params: { title: "Ready for Review", message: "A task is waiting for your review." } }],
            is_active: true,
        },
    },
    {
        name: "New Expense → Email",
        emoji: "💰",
        description: "Email the finance team when an expense is submitted",
        rule: {
            trigger_event: "expense_submitted",
            conditions: [],
            actions: [{ type: "send_email", params: { subject: "New Expense Submitted", message: "An expense report requires your approval." } }],
            is_active: true,
        },
    },
    {
        name: "Blocked Task Escalation",
        emoji: "🧱",
        description: "Escalate to manager when a task is marked Blocked",
        rule: {
            trigger_event: "task_status_changed",
            trigger_conditions: { status: "blocked" },
            conditions: [],
            actions: [
                { type: "change_priority", params: { priority: "critical" } },
                { type: "notify_manager", params: { message: "A task has been marked as BLOCKED and needs attention." } },
            ],
            is_active: true,
        },
    },
];

// ─── Action Param Fields ──────────────────────────────────────────────────────

function ActionParamEditor({ action, onChange }: {
    action: { type: ActionType; params: Record<string, unknown> };
    onChange: (params: Record<string, unknown>) => void;
}) {
    const inputCls = "w-full px-2 py-1.5 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/80 text-xs placeholder-foreground/40 focus:outline-none focus:border-blue-500/50";

    if (action.type === "change_status") {
        return (
            <select
                value={(action.params.status as string) ?? ""}
                onChange={(e) => onChange({ ...action.params, status: e.target.value })}
                className={inputCls}
            >
                <option value="">Select status…</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
        );
    }
    if (action.type === "change_priority") {
        return (
            <select
                value={(action.params.priority as string) ?? ""}
                onChange={(e) => onChange({ ...action.params, priority: e.target.value })}
                className={inputCls}
            >
                <option value="">Select priority…</option>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
        );
    }
    if (action.type === "send_notification" || action.type === "notify_manager" || action.type === "escalate") {
        return (
            <div className="space-y-1">
                <input
                    placeholder="Notification title"
                    value={(action.params.title as string) ?? ""}
                    onChange={(e) => onChange({ ...action.params, title: e.target.value })}
                    className={inputCls}
                />
                <input
                    placeholder="Message text"
                    value={(action.params.message as string) ?? ""}
                    onChange={(e) => onChange({ ...action.params, message: e.target.value })}
                    className={inputCls}
                />
            </div>
        );
    }
    if (action.type === "send_email") {
        return (
            <div className="space-y-1">
                <input
                    placeholder="Email subject"
                    value={(action.params.subject as string) ?? ""}
                    onChange={(e) => onChange({ ...action.params, subject: e.target.value })}
                    className={inputCls}
                />
                <input
                    placeholder="Recipient email (optional, defaults to assignee)"
                    value={(action.params.to as string) ?? ""}
                    onChange={(e) => onChange({ ...action.params, to: e.target.value })}
                    className={inputCls}
                />
            </div>
        );
    }
    if (action.type === "create_subtask") {
        return (
            <input
                placeholder="Subtask name"
                value={(action.params.name as string) ?? ""}
                onChange={(e) => onChange({ ...action.params, name: e.target.value })}
                className={inputCls}
            />
        );
    }
    if (action.type === "webhook") {
        return (
            <input
                placeholder="Webhook URL (https://…)"
                value={(action.params.url as string) ?? ""}
                onChange={(e) => onChange({ ...action.params, url: e.target.value })}
                className={inputCls}
            />
        );
    }
    if (action.type === "add_label") {
        return (
            <input
                placeholder="Label name"
                value={(action.params.label as string) ?? ""}
                onChange={(e) => onChange({ ...action.params, label: e.target.value })}
                className={inputCls}
            />
        );
    }
    return null;
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({ rule, onEdit, onDelete, onToggle }: {
    rule: AutomationRule;
    onEdit: (r: AutomationRule) => void;
    onDelete: (r: AutomationRule) => void;
    onToggle: (r: AutomationRule) => void;
}) {
    const triggerObj = TRIGGERS.find((t) => t.value === rule.trigger_event);
    const triggerLabel = triggerObj?.label ?? rule.trigger_event;
    const triggerIcon = triggerObj?.icon ?? "⚡";

    return (
        <div className={`group p-5 rounded-2xl border transition-all duration-200 ${rule.is_active
            ? "border-foreground/10 bg-foreground/[0.02] hover:border-foreground/20 hover:shadow-lg hover:shadow-black/10"
            : "border-foreground/5 bg-foreground/[0.01] opacity-55"
            }`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{triggerIcon}</span>
                        <h3 className="font-semibold text-foreground/90 truncate text-sm">{rule.name}</h3>
                    </div>
                    {rule.description && (
                        <p className="text-xs text-foreground/50 line-clamp-2 ml-6">{rule.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(rule)}
                        className="p-1.5 rounded-lg hover:bg-foreground/[0.08] text-foreground/50 hover:text-foreground/80 transition-colors"
                        title="Edit rule"
                    ><Edit2 size={13} /></button>
                    <button
                        onClick={() => onDelete(rule)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground/50 hover:text-red-400 transition-colors"
                        title="Delete rule"
                    ><Trash2 size={13} /></button>
                </div>
            </div>

            {/* Pipeline visual */}
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium border border-blue-500/20">
                    {triggerLabel}
                </span>
                <ArrowRight size={12} className="text-foreground/30 shrink-0" />
                {rule.actions.slice(0, 3).map((a: { type: ActionType; params: Record<string, unknown> }, i: number) => {
                    const actionObj = ACTIONS.find((x) => x.value === a.type);
                    const Icon = actionObj?.icon;
                    return (
                        <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-foreground/[0.06] text-foreground/60 text-xs border border-foreground/[0.08]">
                            {Icon && <Icon size={10} className={actionObj?.color} />}
                            {actionObj?.label ?? a.type}
                        </span>
                    );
                })}
                {rule.actions.length > 3 && (
                    <span className="text-foreground/40 text-xs">+{rule.actions.length - 3}</span>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-foreground/40">
                    <span className="flex items-center gap-1">
                        <Zap size={10} />
                        {rule.trigger_count ?? 0} runs
                    </span>
                    {rule.last_triggered_at && (
                        <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(rule.last_triggered_at).toLocaleDateString()}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => onToggle(rule)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${rule.is_active
                        ? "bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/20"
                        : "bg-foreground/[0.04] text-foreground/40 hover:bg-foreground/[0.08] border border-foreground/[0.06]"
                        }`}
                >
                    <Power size={10} />
                    {rule.is_active ? "Active" : "Off"}
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
        trigger_conditions: (rule as any)?.trigger_conditions ?? null,
        conditions: (rule as any)?.conditions ?? [],
        actions: rule?.actions ?? [{ type: "send_notification", params: {} }],
        is_active: rule?.is_active ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showConditions, setShowConditions] = useState(false);

    const handleAddAction = () => setForm((f) => ({
        ...f, actions: [...f.actions, { type: "send_notification", params: {} }],
    }));

    const handleRemoveAction = (i: number) => setForm((f) => ({
        ...f, actions: f.actions.filter((_, idx) => idx !== i),
    }));

    const handleActionTypeChange = (i: number, newType: ActionType) => {
        const updated = [...form.actions];
        updated[i] = { type: newType, params: {} };
        setForm({ ...form, actions: updated });
    };

    const handleActionParamChange = (i: number, params: Record<string, unknown>) => {
        const updated = [...form.actions];
        updated[i] = { ...updated[i], params };
        setForm({ ...form, actions: updated });
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Name is required"); return; }
        if (form.actions.length === 0) { setError("At least one action is required"); return; }
        setSaving(true); setError("");
        try {
            if (rule?.id) await updateAutomationRule(rule.id, form);
            else await createAutomationRule(form);
            toast.success(rule ? "Rule updated" : "Automation rule created!");
            onSave();
        } catch {
            setError("Failed to save rule. Please try again.");
        } finally { setSaving(false); }
    };

    const inputCls = "w-full px-3 py-2 rounded-lg bg-foreground/[0.03] border border-foreground/10 text-foreground/90 text-sm placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 transition-colors";
    const selectedTrigger = TRIGGERS.find((t) => t.value === form.trigger_event);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
                {/* Modal header */}
                <div className="flex items-center justify-between p-5 border-b border-foreground/10">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Zap size={14} className="text-blue-400" />
                        </div>
                        <h2 className="text-base font-semibold text-foreground/90">
                            {rule ? "Edit Rule" : "New Automation Rule"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground/80 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-foreground/60 mb-1.5">Rule Name *</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className={inputCls}
                            placeholder="e.g. Notify manager on overdue task"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-foreground/60 mb-1.5">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className={`${inputCls} resize-none`}
                            rows={2}
                            placeholder="Optional description of what this rule does"
                        />
                    </div>

                    {/* Trigger */}
                    <div>
                        <label className="block text-xs font-medium text-foreground/60 mb-1.5">
                            <span className="text-blue-400">WHEN</span> — Trigger Event
                        </label>
                        <div className="relative">
                            <select
                                value={form.trigger_event}
                                onChange={(e) => setForm({ ...form, trigger_event: e.target.value as TriggerEvent })}
                                className={`${inputCls} appearance-none pr-8`}
                            >
                                {TRIGGERS.map((t) => (
                                    <option key={t.value} value={t.value}>{t.icon} {t.label} ({t.category})</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                        </div>
                        {selectedTrigger && (
                            <p className="text-xs text-foreground/40 mt-1">
                                This rule fires whenever a {selectedTrigger.label.toLowerCase()} event occurs.
                            </p>
                        )}
                    </div>

                    {/* Optional Conditions */}
                    <div>
                        <button
                            onClick={() => setShowConditions((v) => !v)}
                            className="flex items-center gap-2 text-xs text-foreground/50 hover:text-foreground/80 transition-colors"
                        >
                            <ChevronDown size={12} className={`transition-transform ${showConditions ? "rotate-180" : ""}`} />
                            <span className="text-amber-400 font-medium">IF</span> — Conditions (optional)
                        </button>
                        {showConditions && (
                            <div className="mt-2 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-foreground/50 mb-1">Priority equals</label>
                                        <select
                                            value={(form.trigger_conditions as any)?.priority ?? ""}
                                            onChange={(e) => setForm({ ...form, trigger_conditions: { ...(form.trigger_conditions || {}), priority: e.target.value || undefined } })}
                                            className="w-full px-2 py-1.5 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/80 text-xs"
                                        >
                                            <option value="">Any</option>
                                            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-foreground/50 mb-1">Status equals</label>
                                        <select
                                            value={(form.trigger_conditions as any)?.status ?? ""}
                                            onChange={(e) => setForm({ ...form, trigger_conditions: { ...(form.trigger_conditions || {}), status: e.target.value || undefined } })}
                                            className="w-full px-2 py-1.5 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/80 text-xs"
                                        >
                                            <option value="">Any</option>
                                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <p className="text-xs text-foreground/30">Leave fields empty to match all values.</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-foreground/60">
                                <span className="text-green-400">THEN</span> — Actions
                            </label>
                            <button
                                onClick={handleAddAction}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                            >
                                <Plus size={12} /> Add Action
                            </button>
                        </div>
                        <div className="space-y-3">
                            {form.actions.map((action, i) => {
                                const actionObj = ACTIONS.find((a) => a.value === action.type);
                                const Icon = actionObj?.icon;
                                return (
                                    <div key={i} className="p-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.07]">
                                        <div className="flex items-center gap-2 mb-2">
                                            {Icon && <Icon size={13} className={actionObj?.color} />}
                                            <select
                                                value={action.type}
                                                onChange={(e) => handleActionTypeChange(i, e.target.value as ActionType)}
                                                className="flex-1 px-2 py-1.5 rounded-lg bg-foreground/[0.06] border border-foreground/10 text-foreground/90 text-xs"
                                            >
                                                {ACTIONS.map((a) => (
                                                    <option key={a.value} value={a.value}>{a.label}</option>
                                                ))}
                                            </select>
                                            {form.actions.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveAction(i)}
                                                    className="text-foreground/30 hover:text-red-400 transition-colors"
                                                ><X size={13} /></button>
                                            )}
                                        </div>
                                        {actionObj?.description && (
                                            <p className="text-xs text-foreground/40 mb-2">{actionObj.description}</p>
                                        )}
                                        <ActionParamEditor
                                            action={action as { type: ActionType; params: Record<string, unknown> }}
                                            onChange={(params) => handleActionParamChange(i, params)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Enable toggle */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative">
                            <input type="checkbox" className="sr-only peer" checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                            <div className="w-10 h-5 bg-foreground/[0.08] peer-checked:bg-blue-500 rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
                        </div>
                        <span className="text-sm text-foreground/70">Enable this rule immediately</span>
                    </label>
                </div>

                <div className="flex justify-end gap-2 p-5 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground/90 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckIcon size={14} />}
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
    const [tab, setTab] = useState<"rules" | "logs" | "templates">("rules");
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
        } catch {
            // silently handle — 404 until backend is fixed
        }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleToggle = async (rule: AutomationRule) => {
        try {
            const updated = await updateAutomationRule(rule.id, { is_active: !rule.is_active });
            setRules((prev) => prev.map((r) => r.id === rule.id ? updated : r));
            toast.success(updated.is_active ? "Rule enabled" : "Rule disabled");
        } catch {
            toast.error("Failed to update rule");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteAutomationRule(deleteTarget.id);
            setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
            setDeleteTarget(null);
            toast.success("Rule deleted");
        } catch {
            toast.error("Failed to delete rule");
        } finally { setDeleting(false); }
    };

    const handleUseTemplate = (tpl: typeof TEMPLATES[number]) => {
        setEditRule({
            id: "",
            name: tpl.name,
            description: tpl.rule.description ?? "",
            trigger_event: tpl.rule.trigger_event as TriggerEvent,
            conditions: tpl.rule.conditions ?? [],
            actions: tpl.rule.actions as AutomationRule["actions"],
            is_active: tpl.rule.is_active ?? true,
            trigger_count: 0,
            created_by_id: "",
            created_at: "",
            updated_at: "",
        });
        setTab("rules");
    };

    const activeCount = rules.filter((r) => r.is_active).length;

    const LOG_STATUS_MAP: Record<string, string> = {
        success: "bg-green-500/15 text-green-400 border border-green-500/20",
        failed: "bg-red-500/15 text-red-400 border border-red-500/20",
        partial: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    };

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">

            {/* ─── Header ─── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Zap size={18} className="text-blue-400" />
                        </div>
                        Automation
                    </h1>
                    <p className="text-sm text-foreground/50 mt-1">
                        {rules.length === 0
                            ? "Create rules to automate repetitive actions"
                            : `${rules.length} rule${rules.length !== 1 ? "s" : ""} · ${activeCount} active`}
                    </p>
                </div>
                <button
                    onClick={() => setEditRule(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Plus size={16} /> New Rule
                </button>
            </div>

            {/* How It Works */}
            <HowItWorks
                pageKey="automation"
                color="blue"
                description="Automation lets you create rules that trigger actions automatically — no manual intervention needed once a rule is active."
                bullets={[
                    "Each rule has a Trigger (e.g. task overdue) and one or more Actions (e.g. send notification).",
                    "Add optional Conditions to control when a rule should fire.",
                    "Toggle a rule on/off with the power switch without deleting it.",
                    "The Activity Log tab shows a history of every time a rule ran and its outcome.",
                    "Use the Templates tab to quickly create rules from predefined patterns.",
                ]}
            />

            {/* ─── Stats bar ─── */}
            {!loading && rules.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Total Rules", value: rules.length, icon: ListChecks, color: "text-blue-400" },
                        { label: "Active", value: activeCount, icon: Play, color: "text-green-400" },
                        { label: "Total Runs", value: rules.reduce((s, r) => s + (r.trigger_count ?? 0), 0), icon: Activity, color: "text-purple-400" },
                    ].map((stat) => (
                        <div key={stat.label} className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
                                <stat.icon size={15} className={stat.color} />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground/90 leading-none">{stat.value}</p>
                                <p className="text-xs text-foreground/50 mt-0.5">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Tabs ─── */}
            <div className="flex gap-1 bg-foreground/[0.03] border border-foreground/[0.08] rounded-xl p-1 w-fit">
                {([
                    { key: "rules", label: "Rules", icon: Zap },
                    { key: "templates", label: "Templates", icon: BookOpen },
                    { key: "logs", label: "Execution Log", icon: BarChart3 },
                ] as const).map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === key
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-foreground/50 hover:text-foreground/80"
                            }`}
                    >
                        <Icon size={13} /> {label}
                    </button>
                ))}
            </div>

            {/* ─── Content ─── */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 size={28} className="animate-spin text-blue-400" />
                </div>
            ) : tab === "rules" ? (
                rules.length === 0 ? (
                    /* Empty state with template prompts */
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-foreground/[0.04] border border-foreground/[0.08] flex items-center justify-center mx-auto mb-4">
                            <Zap size={28} className="text-foreground/30" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground/70 mb-1">No automation rules yet</h3>
                        <p className="text-sm text-foreground/40 mb-6 max-w-sm mx-auto">
                            Rules automatically perform actions when events happen — saving your team hours of manual work.
                        </p>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                            <button
                                onClick={() => setEditRule(null)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                            >
                                <Plus size={14} /> Create Custom Rule
                            </button>
                            <button
                                onClick={() => setTab("templates")}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] hover:bg-foreground/[0.06] text-foreground/70 text-sm font-medium transition-colors"
                            >
                                <BookOpen size={14} /> Browse Templates
                            </button>
                        </div>
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
            ) : tab === "templates" ? (
                /* Templates Grid */
                <div>
                    <p className="text-sm text-foreground/50 mb-4">
                        Click a template to pre-fill a new rule — you can customise it before saving.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {TEMPLATES.map((tpl, i) => (
                            <button
                                key={i}
                                onClick={() => handleUseTemplate(tpl)}
                                className="text-left p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] hover:border-blue-500/30 hover:bg-blue-500/[0.04] transition-all group"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <span className="text-2xl">{tpl.emoji}</span>
                                    <div>
                                        <h3 className="font-semibold text-foreground/90 text-sm group-hover:text-blue-400 transition-colors">{tpl.name}</h3>
                                        <p className="text-xs text-foreground/50 mt-0.5">{tpl.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs">
                                        {TRIGGERS.find((t) => t.value === tpl.rule.trigger_event)?.label ?? tpl.rule.trigger_event}
                                    </span>
                                    <ArrowRight size={10} className="text-foreground/30" />
                                    {tpl.rule.actions.slice(0, 2).map((a, j) => (
                                        <span key={j} className="px-2 py-0.5 rounded-md bg-foreground/[0.06] text-foreground/60 text-xs">
                                            {ACTIONS.find((x) => x.value === a.type)?.label ?? a.type}
                                        </span>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                /* Execution Logs */
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                    <div className="px-4 py-3 border-b border-foreground/10 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground/70">Execution History</h3>
                        <span className="text-xs text-foreground/40">{logs.length} entries</span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-foreground/10">
                                {["Rule", "Trigger", "Entity", "Status", "Actions Run", "Time"].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs text-foreground/50 font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-foreground/40">
                                        <Activity size={24} className="mx-auto mb-2 opacity-40" />
                                        No executions yet — rules will log here when triggered
                                    </td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="border-b border-foreground/5 hover:bg-foreground/[0.01] transition-colors">
                                    <td className="px-4 py-3 text-foreground/80 font-medium text-sm">{log.rule_name}</td>
                                    <td className="px-4 py-3 text-foreground/60 text-xs">{log.trigger_event?.replace(/_/g, " ")}</td>
                                    <td className="px-4 py-3 text-foreground/50 text-xs font-mono">
                                        {log.entity_type}/{log.entity_id?.slice(0, 8)}…
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LOG_STATUS_MAP[log.status] ?? "bg-foreground/[0.05] text-foreground/60"}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-foreground/50 text-xs">{log.actions_executed?.join(", ") || "—"}</td>
                                    <td className="px-4 py-3 text-foreground/40 text-xs">{new Date(log.executed_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ─── Rule Form Modal ─── */}
            {editRule !== false && (
                <RuleModal
                    rule={editRule}
                    onSave={() => { setEditRule(false); fetchAll(); }}
                    onClose={() => setEditRule(false)}
                />
            )}

            {/* ─── Delete Confirm ─── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
                                <Trash2 size={16} className="text-red-400" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground/90">Delete Rule</h3>
                        </div>
                        <p className="text-sm text-foreground/60 mb-5">
                            Are you sure you want to delete <strong className="text-foreground/80">"{deleteTarget.name}"</strong>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground/90 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                            >
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
