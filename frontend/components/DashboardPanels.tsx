"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    X, CheckCircle2, AlertTriangle, MessageSquare, Send,
    Loader2, BarChart2, Users as UsersIcon, Clock, FolderOpen
} from "lucide-react";
import { apiGet, apiPut } from "@/services/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TaskItem {
    id: string; name: string; status: string; priority: string;
    due_date?: string | null; project_name?: string | null;
    project_id?: string | null; assignee_name?: string | null;
    assignee_id?: string | null; estimated_hours?: number | null;
    actual_hours?: number | null; updated_at?: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
    low: "bg-slate-400", medium: "bg-blue-400",
    high: "bg-amber-400", urgent: "bg-red-500", critical: "bg-red-600",
};

const STATUS_COLOR: Record<string, string> = {
    todo: "bg-slate-500/20 text-slate-400",
    in_progress: "bg-blue-500/20 text-blue-400",
    blocked: "bg-red-500/20 text-red-400",
    waiting: "bg-amber-500/20 text-amber-400",
    review: "bg-purple-500/20 text-purple-400",
    completed: "bg-green-500/20 text-green-400",
    done: "bg-green-500/20 text-green-400",
};

function fmtDate(d?: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Centered Modal Wrapper ────────────────────────────────────────────────────
// Replaces the old right-side PanelOverlay

function ModalOverlay({
    onClose, title, subtitle, children, size = "lg",
}: {
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    size?: "sm" | "lg" | "xl";
}) {
    const ref = useRef<HTMLDivElement>(null);
    const widths = { sm: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

    // Close on backdrop click
    const handleBackdrop = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    // Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleBackdrop}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Modal card */}
            <div
                ref={ref}
                className={`relative w-full ${widths[size]} bg-background border border-foreground/10 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.4)] animate-in zoom-in-95 fade-in duration-200 max-h-[85vh] flex flex-col`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/8 shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-foreground">{title}</h2>
                        {subtitle && <p className="text-xs text-foreground/45 mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-foreground/[0.04] hover:bg-foreground/10 text-foreground/50 hover:text-foreground/80 transition-colors"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-6 py-5">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ─── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({
    task, showAssignee, onStatusChange, onSelect,
}: {
    task: TaskItem;
    showAssignee?: boolean;
    onStatusChange?: (id: string, status: string) => void;
    onSelect?: (task: TaskItem) => void;
}) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date()
        && !["done", "completed"].includes(task.status);

    return (
        <div
            className={`flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-foreground/[0.03] transition-colors ${onSelect ? "cursor-pointer" : ""}`}
            onClick={() => onSelect?.(task)}
        >
            <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || "bg-slate-500"}`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/80 truncate">{task.name}</p>
                {(task.project_name || (showAssignee && task.assignee_name)) && (
                    <p className="text-[10px] text-foreground/40 truncate">
                        {task.project_name}{showAssignee && task.assignee_name ? ` · ${task.assignee_name}` : ""}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {isOverdue && <AlertTriangle size={11} className="text-red-400" />}
                <span className={`text-[10px] ${isOverdue ? "text-red-400 font-medium" : "text-foreground/40"}`}>
                    {fmtDate(task.due_date)}
                </span>
                {onStatusChange ? (
                    <select
                        value={task.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { e.stopPropagation(); onStatusChange(task.id, e.target.value); }}
                        className="text-[10px] bg-foreground/[0.04] border border-foreground/10 rounded-lg px-1.5 py-0.5 text-foreground/60 outline-none focus:border-blue-500"
                    >
                        {["todo", "in_progress", "blocked", "waiting", "review", "completed"].map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                    </select>
                ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_COLOR[task.status] || STATUS_COLOR.todo}`}>
                        {task.status.replace(/_/g, " ")}
                    </span>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK LIST MODAL  (replaces TaskListDrawer)
// ═══════════════════════════════════════════════════════════════════════════════

export function TaskListModal({
    title, statusFilter, teamId, onClose, onTaskUpdate,
}: {
    title: string; statusFilter: string; teamId?: string;
    onClose: () => void; onTaskUpdate?: () => void;
}) {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<TaskItem | null>(null);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | undefined> = { status: statusFilter, team_id: teamId };
            const d = await apiGet<{ tasks: TaskItem[]; total: number }>(
                `/api/dashboard/manager/tasks-by-status`, params
            );
            setTasks(d.tasks);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [statusFilter, teamId]);

    useEffect(() => { load(); }, [load]);

    const handleStatus = async (id: string, status: string) => {
        try { await apiPut(`/api/dashboard/manager/tasks/${id}/quick-update`, { status }); load(); onTaskUpdate?.(); } catch (e) { console.error(e); }
    };

    const handleComment = async () => {
        if (!selected || !comment.trim()) return;
        setSubmitting(true);
        try { await apiPut(`/api/dashboard/manager/tasks/${selected.id}/quick-update`, { comment: comment.trim() }); setComment(""); setSelected(null); } catch (e) { console.error(e); } finally { setSubmitting(false); }
    };

    return (
        <ModalOverlay onClose={onClose} title={title} subtitle={loading ? "Loading…" : `${tasks.length} tasks`} size="lg">
            {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-400" /></div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                    <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-foreground/45">No tasks found</p>
                </div>
            ) : (
                <div className="space-y-0.5">
                    {tasks.map(t => (
                        <TaskRow key={t.id} task={t} showAssignee onStatusChange={handleStatus} onSelect={setSelected} />
                    ))}
                </div>
            )}

            {/* Inline comment box when task selected */}
            {selected && (
                <div className="mt-4 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                            <MessageSquare size={11} className="text-blue-400" /> Comment: {selected.name}
                        </p>
                        <button onClick={() => setSelected(null)} className="text-foreground/35 hover:text-foreground/60"><X size={12} /></button>
                    </div>
                    <div className="flex gap-2">
                        <input
                            autoFocus value={comment}
                            onChange={e => setComment(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleComment()}
                            placeholder="Add comment…"
                            className="flex-1 px-3 py-2 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-sm text-foreground outline-none focus:border-blue-500"
                        />
                        <button onClick={handleComment} disabled={submitting || !comment.trim()}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        </button>
                    </div>
                </div>
            )}
        </ModalOverlay>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK DETAIL MODAL  (replaces TaskDetailDrawer)
// ═══════════════════════════════════════════════════════════════════════════════

export function TaskDetailModal({
    taskId, taskName, onClose, onUpdate,
}: {
    taskId: string; taskName: string; onClose: () => void; onUpdate?: () => void;
}) {
    const [task, setTask] = useState<TaskItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [priority, setPriority] = useState("");
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const t = await apiGet<TaskItem>(`/api/tasks/${taskId}`);
                setTask(t); setStatus(t.status); setPriority(t.priority);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        })();
    }, [taskId]);

    const update = async (updates: Record<string, string>) => {
        try {
            await apiPut(`/api/dashboard/manager/tasks/${taskId}/quick-update`, updates);
            const t = await apiGet<TaskItem>(`/api/tasks/${taskId}`);
            setTask(t); setStatus(t.status); setPriority(t.priority); onUpdate?.();
        } catch (e) { console.error(e); }
    };

    const handleComment = async () => {
        if (!comment.trim()) return;
        setSubmitting(true);
        try { await apiPut(`/api/dashboard/manager/tasks/${taskId}/quick-update`, { comment: comment.trim() }); setComment(""); } catch (e) { console.error(e); } finally { setSubmitting(false); }
    };

    return (
        <ModalOverlay onClose={onClose} title={taskName} subtitle={task?.project_name || undefined} size="sm">
            {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-400" /></div>
            ) : task ? (
                <div className="space-y-4">
                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-foreground/40 uppercase font-semibold block mb-1">Status</label>
                            <select value={status} onChange={e => { setStatus(e.target.value); update({ status: e.target.value }); }}
                                className="w-full px-3 py-2 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-sm text-foreground outline-none focus:border-blue-500">
                                {["todo", "in_progress", "blocked", "waiting", "review", "completed"].map(s => (
                                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-foreground/40 uppercase font-semibold block mb-1">Priority</label>
                            <select value={priority} onChange={e => { setPriority(e.target.value); update({ priority: e.target.value }); }}
                                className="w-full px-3 py-2 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-sm text-foreground outline-none focus:border-blue-500">
                                {["low", "medium", "high", "urgent", "critical"].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: "Due Date", value: fmtDate(task.due_date) },
                            { label: "Assignee", value: task.assignee_name || "—" },
                            { label: "Est. Hours", value: task.estimated_hours != null ? `${task.estimated_hours}h` : "—" },
                            { label: "Actual Hours", value: `${task.actual_hours ?? 0}h` },
                        ].map(({ label, value }) => (
                            <div key={label} className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5">
                                <p className="text-[10px] text-foreground/40 uppercase font-semibold">{label}</p>
                                <p className="text-sm text-foreground/75 mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="text-[10px] text-foreground/40 uppercase font-semibold block mb-2">
                            <MessageSquare size={10} className="inline mr-1 text-blue-400" />Add Comment
                        </label>
                        <div className="flex gap-2">
                            <input value={comment} onChange={e => setComment(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleComment()}
                                placeholder="Write a comment…"
                                className="flex-1 px-3 py-2 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-sm text-foreground outline-none focus:border-blue-500"
                            />
                            <button onClick={handleComment} disabled={submitting || !comment.trim()}
                                className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </ModalOverlay>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT DETAIL MODAL  (replaces ProjectDetailPanel)
// ═══════════════════════════════════════════════════════════════════════════════

interface ProjectSummary {
    project: {
        id: string; name: string; code?: string | null; status: string;
        priority: string; start_date?: string | null; end_date?: string | null;
        budget?: number | null; actual_cost?: number | null; progress: number;
    };
    tasks_by_status: Record<string, number>;
    total_tasks: number; completed_tasks: number; overdue_tasks: number;
    team_members: Array<{ id: string; full_name: string; role: string; task_count: number }>;
    recent_tasks: TaskItem[];
}

export function ProjectDetailModal({
    projectId, onClose,
}: {
    projectId: string; onClose: () => void;
}) {
    const [data, setData] = useState<ProjectSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const d = await apiGet<ProjectSummary>(`/api/dashboard/executive/project/${projectId}/summary`);
                setData(d);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        })();
    }, [projectId]);

    if (!data && !loading) return null;
    const p = data?.project;
    const statusEntries = data ? Object.entries(data.tasks_by_status) : [];
    const maxCount = Math.max(...statusEntries.map(([, v]) => v), 1);
    const barColor = (p?.progress || 0) >= 70 ? "bg-green-500" : (p?.progress || 0) >= 40 ? "bg-amber-500" : "bg-red-500";

    return (
        <ModalOverlay onClose={onClose} title={p?.name || "Project"} subtitle={p?.code || undefined} size="xl">
            {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-400" /></div>
            ) : data && p ? (
                <div className="space-y-5">
                    {/* Progress */}
                    <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-foreground/8">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm text-foreground/55">Progress</span>
                            <span className="text-sm font-bold text-foreground/80">{p.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${p.progress}%` }} />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-foreground/35">
                            <span>{fmtDate(p.start_date)}</span>
                            <span className="capitalize">{p.status.replace(/_/g, " ")}</span>
                            <span>{fmtDate(p.end_date)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Stats + task breakdown */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: "Total", value: data.total_tasks },
                                    { label: "Done", value: data.completed_tasks, color: "text-green-400" },
                                    { label: "Overdue", value: data.overdue_tasks, color: data.overdue_tasks > 0 ? "text-red-400" : "text-foreground/40" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="text-center p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5">
                                        <p className={`text-xl font-bold ${color || "text-foreground/80"}`}>{value}</p>
                                        <p className="text-[10px] text-foreground/40">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {statusEntries.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-foreground/60 mb-2 flex items-center gap-1.5">
                                        <BarChart2 size={11} className="text-blue-400" /> Breakdown
                                    </h4>
                                    <div className="space-y-1.5">
                                        {statusEntries.map(([status, count]) => (
                                            <div key={status} className="flex items-center gap-2">
                                                <span className="text-[10px] text-foreground/45 w-16 truncate capitalize">{status.replace(/_/g, " ")}</span>
                                                <div className="flex-1 h-2.5 bg-foreground/[0.04] rounded overflow-hidden">
                                                    <div className={`h-full rounded ${["done", "completed"].includes(status) ? "bg-green-500" : status === "in_progress" ? "bg-blue-500" : status === "blocked" ? "bg-red-500" : "bg-slate-500"}`}
                                                        style={{ width: `${(count / maxCount) * 100}%` }} />
                                                </div>
                                                <span className="text-[10px] text-foreground/45 w-4 text-right">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(p.budget != null || p.actual_cost != null) && (
                                <div className="grid grid-cols-2 gap-2">
                                    {p.budget != null && (
                                        <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5">
                                            <p className="text-[10px] text-foreground/40 uppercase font-semibold">Budget</p>
                                            <p className="text-sm font-bold text-foreground/75 mt-0.5">${p.budget.toLocaleString()}</p>
                                        </div>
                                    )}
                                    {p.actual_cost != null && (
                                        <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5">
                                            <p className="text-[10px] text-foreground/40 uppercase font-semibold">Actual Cost</p>
                                            <p className="text-sm font-bold text-foreground/75 mt-0.5">${p.actual_cost.toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Team */}
                        {data.team_members.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-foreground/60 mb-2 flex items-center gap-1.5">
                                    <UsersIcon size={11} className="text-blue-400" /> Team ({data.team_members.length})
                                </h4>
                                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                    {data.team_members.map(m => (
                                        <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-foreground/[0.03]">
                                            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                                                {m.full_name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground/75 truncate">{m.full_name}</p>
                                                <p className="text-[10px] text-foreground/40 capitalize">{m.role} · {m.task_count} tasks</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recent tasks */}
                    {data.recent_tasks.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-foreground/60 mb-2 flex items-center gap-1.5">
                                <Clock size={11} className="text-blue-400" /> Recent Tasks
                            </h4>
                            <div className="space-y-0.5 max-h-40 overflow-y-auto">
                                {data.recent_tasks.map(t => <TaskRow key={t.id} task={t} />)}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </ModalOverlay>
    );
}

// ─── Keep these names for backward compat with existing imports ────────────────
export { TaskListModal as TaskListDrawer, TaskDetailModal as TaskDetailDrawer };
