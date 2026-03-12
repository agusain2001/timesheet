"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiGet } from "@/services/api";
import { getToken } from "@/lib/auth";

// ============ Types ============

interface TaskDetail {
    id: string;
    name: string;
    description: string | null;
    task_type: string;
    priority: string;
    status: string;
    due_date: string | null;
    estimated_hours: number | null;
    created_at: string;
    completed_at: string | null;
    project: { id: string; name: string } | null;
    client: { id: string; name: string } | null;
    assignee: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
}

interface TaskDetailPanelProps {
    taskId: string;
    onClose: () => void;
}

// ============ Config ============

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    urgent: { label: "Urgent", color: "#ef4444" },
    high: { label: "High", color: "#f97316" },
    critical: { label: "Critical", color: "#dc2626" },
    medium: { label: "Normal", color: "#3b82f6" },
    low: { label: "Low", color: "#6b7280" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    in_progress: { label: "In Progress", color: "#3b82f6" },
    todo: { label: "To Do", color: "#8b5cf6" },
    backlog: { label: "Backlog", color: "#6b7280" },
    waiting: { label: "On Hold", color: "#f97316" },
    draft: { label: "Draft", color: "#6b7280" },
    review: { label: "Review", color: "#eab308" },
    completed: { label: "Completed", color: "#22c55e" },
    blocked: { label: "Blocked", color: "#ef4444" },
    cancelled: { label: "Cancelled", color: "#9ca3af" },
    open: { label: "Open", color: "#3b82f6" },
    overdue: { label: "Overdue", color: "#ef4444" },
};

const TYPE_LABELS: Record<string, string> = {
    personal: "#Personal",
    project: "#Project",
    assigned: "#Assigned",
    bug: "#Bug",
    feature: "#Feature",
    improvement: "#Improvement",
};

// ============ Helpers ============

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return iso;
    }
}

function timeAgo(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
        return "Just now";
    } catch {
        return iso;
    }
}

function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ============ Main Component ============

export default function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
    const [task, setTask] = useState<TaskDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState("");

    useEffect(() => {
        setLoading(true);
        apiGet<TaskDetail>(`/api/tasks/${taskId}`)
            .then((data) => { setTask(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [taskId]);

    const priority = task ? (PRIORITY_CONFIG[task.priority] || { label: task.priority, color: "#6b7280" }) : null;
    const status = task ? (STATUS_CONFIG[task.status] || { label: task.status, color: "#6b7280" }) : null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto">
                <div
                    className="relative w-full max-w-2xl bg-background border border-foreground/10 rounded-2xl shadow-2xl mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {loading ? (
                        <div className="p-8 space-y-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-5 bg-foreground/5 rounded animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />
                            ))}
                        </div>
                    ) : !task ? (
                        <div className="p-8 text-center">
                            <p className="text-foreground/60">Task not found</p>
                            <button onClick={onClose} className="mt-4 text-sm text-blue-500 hover:underline">Go Back</button>
                        </div>
                    ) : (
                        <>
                            {/* Go Back Button */}
                            <div className="px-6 pt-5">
                                <button
                                    onClick={onClose}
                                    className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground transition px-3 py-1.5 rounded-lg border border-foreground/10 hover:border-foreground/20"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Go Back
                                </button>
                            </div>

                            {/* Header */}
                            <div className="px-6 pt-4 pb-2 text-center">
                                <h2 className="text-xl font-bold text-foreground">{task.name}</h2>
                                {task.assignee && (
                                    <p className="text-sm text-foreground/50 mt-1">Assigned To: {task.assignee.full_name}</p>
                                )}
                                <div className="flex items-center justify-center gap-3 mt-3">
                                    {status && (
                                        <span
                                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
                                            style={{ background: `${status.color}15`, color: status.color }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                                            {status.label}
                                            <span className="opacity-50 ml-0.5">•••</span>
                                        </span>
                                    )}
                                    <span className="text-foreground/30">|</span>
                                    {priority && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                            <FlagIcon color={priority.color} />
                                            <span style={{ color: priority.color }}>{priority.label}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Sections */}
                            <div className="px-6 pb-6 space-y-1">

                                {/* Task Information */}
                                <Section title="Task Information">
                                    <InfoRow label="Project" value={task.project?.name || "—"} />
                                    <InfoRow label="Task Type">
                                        <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                                            {TYPE_LABELS[task.task_type] || `#${task.task_type}`}
                                        </span>
                                    </InfoRow>
                                    <InfoRow label="Assigned To">
                                        {task.assignee ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-bold text-white">
                                                    {getInitials(task.assignee.full_name)}
                                                </div>
                                            </div>
                                        ) : <span className="text-foreground/40">—</span>}
                                    </InfoRow>
                                    <InfoRow label="Assigned By">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                                            {task.assignee ? getInitials(task.assignee.full_name) : "?"}
                                        </div>
                                    </InfoRow>
                                    <InfoRow label="Due Date" value={task.due_date ? formatDate(task.due_date) : "—"} />
                                    <InfoRow label="Last Updated" value={timeAgo(task.created_at)} />
                                </Section>

                                {/* Description */}
                                <Section title="Description">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-foreground/70">Task Description</p>
                                        <p className="text-sm text-foreground/60 leading-relaxed">
                                            {task.description || "No description provided."}
                                        </p>
                                    </div>
                                </Section>

                                {/* Time & Effort */}
                                <Section title="Time & Effort">
                                    <div className="relative">
                                        <div className="flex items-center justify-between py-2">
                                            <span className="text-sm font-medium text-foreground/80">Estimated Effort</span>
                                            <span className="text-sm text-foreground/60 flex items-center gap-1">
                                                <ClockIcon />
                                                {task.estimated_hours ? `${task.estimated_hours}h` : "—"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-t border-foreground/5">
                                            <span className="text-sm font-medium text-foreground/80">Time Logged</span>
                                            <span className="text-sm text-foreground/60 flex items-center gap-1">
                                                <ClockIcon />
                                                {task.completed_at ? "Completed" : "0h 0m"}
                                            </span>
                                        </div>
                                    </div>
                                </Section>

                                {/* Comments & Discussion */}
                                <Section title="Comments & Discussion">
                                    <div className="space-y-3">
                                        <div className="text-sm text-foreground/50 text-center py-2">
                                            No comments yet
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <input
                                                type="text"
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                placeholder="Add Comment"
                                                className="flex-1 px-3 py-2 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                            />
                                            <button className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 hover:bg-blue-600 transition">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </Section>


                                {/* Attachments */}
                                <AttachmentsSection taskId={task.id} />

                                {/* Subtasks */}
                                <SubtasksSection taskId={task.id} />

                                {/* Dependencies */}
                                <DependenciesSection taskId={task.id} />

                                {/* Activity / Audit Trail */}
                                <AuditTrailSection taskId={task.id} />

                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

// ============ Sub-components ============

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-foreground/8 p-4 mt-3">
            <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
            {children}
        </div>
    );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-b-0">
            <span className="text-sm font-medium text-foreground/80">{label}</span>
            {children || <span className="text-sm text-foreground/60">{value}</span>}
        </div>
    );
}

function FlagIcon({ color }: { color: string }) {
    return (
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color }} viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 1a1 1 0 0 1 1 1v1h6.5a1 1 0 0 1 .8.4l1.25 1.67a1 1 0 0 1 0 1.2L10.3 7.93a1 1 0 0 1-.8.4H3v6a1 1 0 1 1-2 0V2a1 1 0 0 1 1-1z" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg className="w-3.5 h-3.5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
        </svg>
    );
}

// ============ Attachments Section ============

interface Attachment {
    id: string;
    filename: string;
    size: number;
    content_type: string;
    uploaded_by: string;
    uploaded_at: string;
    url: string;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(contentType: string): string {
    if (contentType.startsWith("image/")) return "🖼️";
    if (contentType === "application/pdf") return "📄";
    if (contentType.includes("zip") || contentType.includes("tar")) return "🗜️";
    if (contentType.includes("sheet") || contentType.includes("csv")) return "📊";
    if (contentType.includes("word") || contentType.includes("doc")) return "📝";
    return "📎";
}

const API = process.env.NEXT_PUBLIC_API_URL || "";

function AttachmentsSection({ taskId }: { taskId: string }) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        try {
            const token = getToken();
            const res = await fetch(`${API}/api/tasks/${taskId}/attachments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setAttachments(await res.json());
        } catch { }
    }, [taskId]);

    useEffect(() => { load(); }, [load]);

    const upload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true); setError("");
        const token = getToken();
        for (const file of Array.from(files)) {
            const fd = new FormData();
            fd.append("file", file);
            try {
                const res = await fetch(`${API}/api/tasks/${taskId}/attachments`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    setError(err.detail || "Upload failed");
                } else {
                    const att = await res.json();
                    setAttachments((prev) => [...prev, att]);
                }
            } catch { setError("Upload failed"); }
        }
        setUploading(false);
    };

    const deleteAtt = async (id: string) => {
        const token = getToken();
        try {
            await fetch(`${API}/api/tasks/${taskId}/attachments/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            setAttachments((prev) => prev.filter((a) => a.id !== id));
        } catch { }
    };

    return (
        <Section title={`Attachments${attachments.length > 0 ? ` (${attachments.length})` : ""}`}>
            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed py-5 flex flex-col items-center gap-2 transition-colors ${dragOver
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-foreground/10 hover:border-foreground/20 hover:bg-foreground/[0.02]"
                    }`}
            >
                <span className="text-2xl">{uploading ? "⏳" : "📤"}</span>
                <p className="text-xs text-foreground/50">
                    {uploading ? "Uploading…" : "Drop files or click to upload"}
                </p>
                <p className="text-[10px] text-foreground/30">PDF, images, docs, zip — max 20 MB</p>
                <input ref={fileRef} type="file" className="hidden" multiple onChange={(e) => upload(e.target.files)} />
            </div>

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* File list */}
            {attachments.length > 0 && (
                <div className="space-y-1.5 mt-2">
                    {attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/8 group hover:bg-foreground/[0.05] transition-colors">
                            <span className="text-lg shrink-0">{fileIcon(att.content_type)}</span>
                            <div className="flex-1 min-w-0">
                                <a href={`${API}${att.url}`} target="_blank" rel="noreferrer"
                                    className="text-sm font-medium text-foreground/80 hover:text-blue-500 truncate block transition-colors">
                                    {att.filename}
                                </a>
                                <p className="text-[10px] text-foreground/40">
                                    {formatBytes(att.size)} · {att.uploaded_by} · {new Date(att.uploaded_at).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => deleteAtt(att.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-all"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Section>
    );
}

// ============ Subtasks Section ============

interface Subtask {
    id: string;
    name: string;
    status: string;
    assignee?: { full_name: string } | null;
}

function SubtasksSection({ taskId }: { taskId: string }) {
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const token = getToken();
        fetch(`${API}/api/tasks?parent_task_id=${taskId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : [])
            // Backend returns plain array OR {items:[...]} — handle both
            .then(d => setSubtasks(Array.isArray(d) ? d : (d.items ?? [])))
            .catch(() => { });
    }, [taskId]);

    const createSubtask = async () => {
        if (!newTitle.trim()) return;
        const token = getToken();
        setAdding(true);
        try {
            const res = await fetch(`${API}/api/tasks`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTitle.trim(), parent_task_id: taskId, task_type: "personal", status: "todo", priority: "medium" }),
            });
            if (res.ok) {
                // Refetch subtask list instead of appending, to guarantee consistency
                const listRes = await fetch(`${API}/api/tasks?parent_task_id=${taskId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (listRes.ok) {
                    const d = await listRes.json();
                    // Backend returns a plain array (not {items:[]})
                    setSubtasks(Array.isArray(d) ? d : (d.items ?? []));
                }
                setNewTitle("");
                setShowForm(false);
            }
        } finally { setAdding(false); }
    };

    const toggleSubtask = async (sub: Subtask) => {
        const token = getToken();
        // Backend uses 'completed' not 'done'
        const newStatus = sub.status === "completed" ? "todo" : "completed";
        await fetch(`${API}/api/tasks/${sub.id}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        });
        setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s));
    };

    const completed = subtasks.filter(s => s.status === "completed").length;

    return (
        <Section title={`Subtasks${subtasks.length > 0 ? ` (${completed}/${subtasks.length})` : ""}`}>
            {subtasks.length > 0 && (
                <>
                    {subtasks.length > 1 && (
                        <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completed / subtasks.length) * 100}%` }} />
                                </div>
                                <span className="text-xs text-foreground/40">{Math.round((completed / subtasks.length) * 100)}%</span>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        {subtasks.map(sub => (
                            <div key={sub.id} className="flex items-center gap-2.5 group px-2 py-1.5 rounded-lg hover:bg-foreground/[0.03] transition-colors">
                                <button
                                    onClick={() => toggleSubtask(sub)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${sub.status === "completed" ? "bg-green-500 border-green-500" : "border-foreground/20 hover:border-green-500"}`}
                                >
                                    {sub.status === "completed" && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </button>
                                <span className={`text-sm flex-1 ${sub.status === "completed" ? "line-through text-foreground/40" : "text-foreground/80"}`}>{sub.name}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
            {showForm ? (
                <div className="flex gap-2 mt-2">
                    <input
                        autoFocus
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") createSubtask(); if (e.key === "Escape") { setShowForm(false); setNewTitle(""); } }}
                        placeholder="Subtask title..."
                        className="flex-1 text-sm px-3 py-1.5 bg-foreground/5 border border-foreground/10 rounded-lg outline-none focus:border-blue-500 text-foreground"
                    />
                    <button onClick={createSubtask} disabled={adding} className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                        {adding ? "..." : "Add"}
                    </button>
                    <button onClick={() => { setShowForm(false); setNewTitle(""); }} className="text-xs px-3 py-1.5 text-foreground/50 hover:text-foreground transition-colors">Cancel</button>
                </div>
            ) : (
                <button onClick={() => setShowForm(true)} className="mt-2 flex items-center gap-1.5 text-xs text-foreground/40 hover:text-blue-500 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Subtask
                </button>
            )}
        </Section>
    );
}

// ============ Dependencies Section ============

interface TaskDep { id: string; predecessor_id?: string; dependent_id?: string; dependency_type: string; task_name?: string; }

function DependenciesSection({ taskId }: { taskId: string }) {
    const [deps, setDeps] = useState<{ blockers: TaskDep[]; dependents: TaskDep[] }>({ blockers: [], dependents: [] });
    const [allTasks, setAllTasks] = useState<{ id: string; name: string }[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [adding, setAdding] = useState(false);
    const [showAdd, setShowAdd] = useState(false);

    const loadDeps = async () => {
        const token = getToken();
        try {
            const res = await fetch(`${API}/api/tasks/${taskId}/dependencies`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setDeps(await res.json());
        } catch { }
    };

    useEffect(() => {
        loadDeps();
        const token = getToken();
        fetch(`${API}/api/tasks?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : { items: [] })
            .then(d => setAllTasks((d.items ?? []).filter((t: any) => t.id !== taskId)))
            .catch(() => { });
    }, [taskId]);

    const addDep = async () => {
        if (!selectedId) return;
        setAdding(true);
        const token = getToken();
        try {
            await fetch(`${API}/api/tasks/${taskId}/dependencies?predecessor_id=${selectedId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            setSelectedId(""); setShowAdd(false);
            await loadDeps();
        } finally { setAdding(false); }
    };

    const removeDep = async (predecessorId: string) => {
        const token = getToken();
        await fetch(`${API}/api/tasks/${taskId}/dependencies?predecessor_id=${predecessorId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        await loadDeps();
    };

    const blockers = deps?.blockers || [];
    const dependents = deps?.dependents || [];
    const totalDeps = blockers.length + dependents.length;

    return (
        <Section title={`Dependencies${totalDeps > 0 ? ` (${totalDeps})` : ""}`}>
            {blockers.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs font-medium text-orange-500 mb-1.5">🔒 Blocked By</p>
                    <div className="space-y-1.5">
                        {blockers.map(dep => (
                            <div key={dep.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-orange-500/5 border border-orange-500/10 group">
                                <span className="flex-1 text-sm text-foreground/70">{dep.task_name || dep.predecessor_id}</span>
                                <span className="text-[10px] text-orange-500/70 uppercase tracking-wide">{dep.dependency_type || "FS"}</span>
                                <button onClick={() => removeDep(dep.predecessor_id || "")} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-foreground/30 hover:text-red-500 transition-all text-xs">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {dependents.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs font-medium text-blue-500 mb-1.5">→ Blocks</p>
                    <div className="space-y-1.5">
                        {dependents.map(dep => (
                            <div key={dep.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                <span className="flex-1 text-sm text-foreground/70">{dep.task_name || dep.dependent_id}</span>
                                <span className="text-[10px] text-blue-500/70 uppercase tracking-wide">{dep.dependency_type || "FS"}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {showAdd ? (
                <div className="flex gap-2 mt-2">
                    <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="flex-1 text-sm px-2 py-1.5 bg-foreground/5 border border-foreground/10 rounded-lg outline-none focus:border-blue-500 text-foreground">
                        <option value="">Select a blocking task…</option>
                        {allTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button onClick={addDep} disabled={adding || !selectedId} className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">Add</button>
                    <button onClick={() => setShowAdd(false)} className="text-xs px-2 py-1.5 text-foreground/40 hover:text-foreground">✕</button>
                </div>
            ) : (
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-blue-500 transition-colors mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Dependency
                </button>
            )}
        </Section>
    );
}

// ============ Audit Trail Section ============

interface AuditLogEntry { id: string; field_changed: string; old_value?: string; new_value?: string; changed_by_name?: string; created_at: string; }

function AuditTrailSection({ taskId }: { taskId: string }) {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        fetch(`${API}/api/tasks/${taskId}/audit-log`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then(data => setLogs(Array.isArray(data) ? data : data.items ?? []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [taskId]);

    if (loading) return <Section title="Activity"><p className="text-xs text-foreground/40 py-2">Loading…</p></Section>;
    if (!logs.length) return (
        <Section title="Activity">
            <p className="text-xs text-foreground/40 py-2">No activity recorded yet.</p>
        </Section>
    );

    return (
        <Section title={`Activity (${logs.length})`}>
            <div className="space-y-3">
                {logs.slice(0, 20).map(log => (
                    <div key={log.id} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px]">📝</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground/70">
                                <span className="font-medium text-foreground/90">{log.changed_by_name || "Someone"}</span>
                                {" changed "}
                                <span className="font-medium text-blue-400">{log.field_changed?.replace(/_/g, " ")}</span>
                                {log.old_value && log.new_value && (
                                    <> from <span className="text-foreground/50">{log.old_value}</span> to <span className="text-foreground/80">{log.new_value}</span></>
                                )}
                            </p>
                            <p className="text-[10px] text-foreground/30 mt-0.5">{timeAgo(log.created_at)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    );
}
