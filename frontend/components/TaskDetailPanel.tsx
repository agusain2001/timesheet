"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/services/api";

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
                                <Section title="Attachments">
                                    <div className="text-sm text-foreground/50 text-center py-2">
                                        No attachments
                                    </div>
                                </Section>
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
