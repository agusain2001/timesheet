"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { apiGet, apiDelete, apiPost } from "@/services/api";
import AddTaskModal from "@/components/AddTaskModal";
import EditTaskModal from "@/components/EditTaskModal";
import DeleteTaskModal from "@/components/DeleteTaskModal";
import CommentsModal from "@/components/CommentsModal";
import DuplicateTaskModal from "@/components/DuplicateTaskModal";
import TaskDetailPanel from "@/components/TaskDetailPanel";

// ============ Types ============

export interface TaskItem {
    id: string;
    name: string;
    description?: string;
    task_type: string;
    priority: string;
    status: string;
    due_date: string | null;
    start_date?: string | null;
    project_id?: string;
    assignee_id?: string;
    owner_id?: string;
    estimated_hours?: number;
    actual_hours?: number;
    project: { id: string; name: string } | null;
    assignee: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
    owner?: { id: string; full_name: string; email: string; avatar_url?: string | null } | null;
    tags?: string[];
    created_at?: string;
    completed_at?: string;
    work_state?: string;
    elapsed_seconds?: number;
}

export interface TaskListPageProps {
    title: string;
    fetchUrl: string;
    fetchParams?: Record<string, string>;
    /** When true, hides the built-in header (title + Add Task button).
     *  Use this when the parent page already renders its own header. */
    hideHeader?: boolean;
    /** Optional date range filter inherited from the dashboard. When set,
     *  start_date/end_date are added to the API call and a banner is shown. */
    dateFilter?: {
        startDate: string;
        endDate: string;
        /** Human-readable label shown in the banner, e.g. "Today" or "Mar 1 – Mar 19" */
        label: string;
    };
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

type SortField = "type" | "project" | "priority" | "assignee" | "status";

// ============ Main Component ============

export default function TaskListPage({ title, fetchUrl, fetchParams, dateFilter, hideHeader }: TaskListPageProps) {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [activeSort, setActiveSort] = useState<SortField | null>(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [showAddTask, setShowAddTask] = useState(false);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Modal state
    const [editTask, setEditTask] = useState<TaskItem | null>(null);
    const [deleteTask, setDeleteTask] = useState<TaskItem | null>(null);
    const [commentsTask, setCommentsTask] = useState<TaskItem | null>(null);
    const [duplicateTask, setDuplicateTask] = useState<TaskItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, string | number | boolean | undefined> = { ...fetchParams };
            if (search.trim()) params.search = search.trim();
            if (dateFilter?.startDate) params.start_date = dateFilter.startDate;
            if (dateFilter?.endDate) params.end_date = dateFilter.endDate;
            const data = await apiGet<TaskItem[]>(fetchUrl, params);
            setTasks(data);
        } catch {
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, [fetchUrl, fetchParams, search, dateFilter]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    // Sort logic
    const sortedTasks = [...tasks].sort((a, b) => {
        if (!activeSort) return 0;
        let va = "", vb = "";
        switch (activeSort) {
            case "type": va = a.task_type; vb = b.task_type; break;
            case "project": va = a.project?.name || ""; vb = b.project?.name || ""; break;
            case "priority": {
                const order = ["critical", "urgent", "high", "medium", "low"];
                return sortAsc
                    ? order.indexOf(a.priority) - order.indexOf(b.priority)
                    : order.indexOf(b.priority) - order.indexOf(a.priority);
            }
            case "assignee": va = a.assignee?.full_name || ""; vb = b.assignee?.full_name || ""; break;
            case "status": va = a.status; vb = b.status; break;
        }
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    const toggleSort = (field: SortField) => {
        if (activeSort === field) setSortAsc(!sortAsc);
        else { setActiveSort(field); setSortAsc(true); }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTask) return;
        setIsDeleting(true);
        try {
            await apiDelete(`/api/tasks/${deleteTask.id}`);
            setTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
            setDeleteTask(null);
        } catch { /* ignore */ }
        setIsDeleting(false);
    };

    const handleDuplicateConfirm = async () => {
        if (!duplicateTask) return;
        setIsDuplicating(true);
        try {
            await apiPost(`/api/my-time/tasks/${duplicateTask.id}/duplicate`);
            fetchTasks();
            setDuplicateTask(null);
        } catch { /* ignore */ }
        setIsDuplicating(false);
    };

    const sortButtons: { field: SortField; label: string }[] = [
        { field: "type", label: "Sort By Type" },
        { field: "project", label: "Sort By Project" },
        { field: "priority", label: "Sort By Priority" },
        { field: "assignee", label: "Sort By Assignee" },
    ];

    const router = useRouter();

    return (
        <div className="space-y-5 max-w-[1400px] mx-auto">
            {/* Header — hidden when parent page already shows one */}
            {!hideHeader && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddTask(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Task
                    </button>
                </div>
            </div>
            )}

            {/* Active date filter banner */}
            {dateFilter && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-500/25 bg-blue-500/8 text-sm">
                    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-foreground/70">Showing tasks for:</span>
                    <span className="font-semibold text-blue-400">{dateFilter.label}</span>
                    <button
                        onClick={() => router.push(window.location.pathname)}
                        className="ml-auto flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70 transition"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear
                    </button>
                </div>
            )}

            {/* Sort pills + Search */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {sortButtons.map((s) => (
                        <button
                            key={s.field}
                            onClick={() => toggleSort(s.field)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition
                                ${activeSort === s.field
                                    ? "bg-blue-600/15 border-blue-500/40 text-blue-600 dark:text-blue-400"
                                    : "border-foreground/15 text-foreground/60 hover:border-foreground/25 hover:text-foreground/80"
                                }`}
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                            {s.label}
                            {activeSort === s.field && (
                                <svg className={`w-3 h-3 transition-transform ${sortAsc ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {showSearch ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search tasks..."
                                autoFocus
                                className="px-3 py-1.5 text-sm bg-foreground/[0.04] border border-foreground/15 rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-48"
                            />
                            <button onClick={() => { setShowSearch(false); setSearch(""); }} className="text-foreground/40 hover:text-foreground transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSearch(true)}
                            className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Search
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                                <th className="text-left py-3 px-4 font-medium text-foreground/50 text-xs uppercase tracking-wider w-10">
                                    <input type="checkbox" className="rounded border-foreground/20 accent-blue-500" />
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-foreground/50 text-xs uppercase tracking-wider">Task Name</th>
                                <th className="text-left py-3 px-4 font-medium text-foreground/50 text-xs uppercase tracking-wider">Type</th>
                                <th className="text-left py-3 px-4 font-medium text-foreground/50 text-xs uppercase tracking-wider">Project</th>
                                <th className="text-left py-3 px-4 font-medium text-foreground/50 text-xs uppercase tracking-wider">Priority</th>
                                <th className="text-left py-3 px-4 font-medium text-foreground/50 text-xs uppercase tracking-wider">Status</th>
                                <th className="text-left py-3 px-4 font-medium text-foreground/50 text-xs uppercase tracking-wider">Assigned By</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-foreground/5">
                                        {Array.from({ length: 8 }).map((__, j) => (
                                            <td key={j} className="py-4 px-4"><div className="h-4 bg-foreground/5 rounded animate-pulse w-20" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : sortedTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center">
                                        <p className="text-foreground/60 font-medium">No tasks found</p>
                                        <p className="text-foreground/40 text-xs mt-1">Create a task to get started.</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedTasks.map((task) => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        isMenuOpen={actionMenuId === task.id}
                                        onMenuToggle={() => setActionMenuId(actionMenuId === task.id ? null : task.id)}
                                        onCloseMenu={() => setActionMenuId(null)}
                                        onDelete={() => setDeleteTask(task)}
                                        onEdit={() => setEditTask(task)}
                                        onDuplicate={() => setDuplicateTask(task)}
                                        onComments={() => setCommentsTask(task)}
                                        onRowClick={() => setSelectedTaskId(task.id)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <AddTaskModal isOpen={showAddTask} onClose={() => setShowAddTask(false)} onTaskCreated={fetchTasks} />
            <EditTaskModal isOpen={!!editTask} task={editTask as any} onClose={() => setEditTask(null)} onTaskUpdated={fetchTasks} />
            <DeleteTaskModal isOpen={!!deleteTask} taskName={deleteTask?.name || ""} taskStatus={deleteTask?.status || ""} onClose={() => setDeleteTask(null)} onConfirm={handleDeleteConfirm} isDeleting={isDeleting} />
            <CommentsModal isOpen={!!commentsTask} taskId={commentsTask?.id || null} taskName={commentsTask?.name || ""} onClose={() => setCommentsTask(null)} />
            <DuplicateTaskModal isOpen={!!duplicateTask} taskName={duplicateTask?.name || ""} onClose={() => setDuplicateTask(null)} onConfirm={handleDuplicateConfirm} isDuplicating={isDuplicating} />

            {/* Task Detail Panel */}
            {selectedTaskId && (
                <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
            )}
        </div>
    );
}

// ============ Task Row ============

function TaskRow({
    task,
    isMenuOpen,
    onMenuToggle,
    onCloseMenu,
    onDelete,
    onEdit,
    onDuplicate,
    onComments,
    onRowClick,
}: {
    task: TaskItem;
    isMenuOpen: boolean;
    onMenuToggle: () => void;
    onCloseMenu: () => void;
    onDelete: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onComments: () => void;
    onRowClick: () => void;
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!isMenuOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) onCloseMenu();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isMenuOpen, onCloseMenu]);

    useEffect(() => {
        if (isMenuOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 });
        }
    }, [isMenuOpen]);

    const priority = PRIORITY_CONFIG[task.priority] || { label: task.priority, color: "#6b7280" };
    const status = STATUS_CONFIG[task.status] || { label: task.status, color: "#6b7280" };
    const typeLabel = TYPE_LABELS[task.task_type] || `#${task.task_type}`;
    const initials = task.assignee?.full_name
        ? task.assignee.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "?";

    return (
        <tr className="border-b border-foreground/5 hover:bg-foreground/[0.02] transition group cursor-pointer" onClick={onRowClick}>
            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" className="rounded border-foreground/20 accent-blue-500" />
            </td>
            <td className="py-3 px-4 text-foreground/90 font-medium">{task.name}</td>
            <td className="py-3 px-4">
                <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">{typeLabel}</span>
            </td>
            <td className="py-3 px-4 text-foreground/70">{task.project?.name || "—"}</td>
            <td className="py-3 px-4">
                <span className="flex items-center gap-1.5">
                    <FlagIcon color={priority.color} />
                    <span className="text-foreground/80 text-xs">{priority.label}</span>
                </span>
            </td>
            <td className="py-3 px-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${status.color}15`, color: status.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                    {status.label}
                    <span className="opacity-50 ml-0.5">•••</span>
                </span>
            </td>
            <td className="py-3 px-4">
                {task.assignee ? (
                    <div
                        className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold"
                        title={task.assignee.full_name}
                    >
                        {initials}
                    </div>
                ) : (
                    <span className="text-foreground/30 text-xs">—</span>
                )}
            </td>
            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                <button
                    ref={buttonRef}
                    onClick={onMenuToggle}
                    className="p-1 rounded hover:bg-foreground/10 text-foreground/30 hover:text-foreground transition opacity-0 group-hover:opacity-100"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                    </svg>
                </button>
                {isMenuOpen && menuPos && createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[9999] w-48 bg-background border border-foreground/10 rounded-lg shadow-2xl overflow-hidden"
                        style={{ top: menuPos.top, left: menuPos.left }}
                    >
                        <ActionButton icon="eye" label="View Details" onClick={() => { onCloseMenu(); onRowClick(); }} />
                        <ActionButton icon="edit" label="Edit Task" onClick={() => { onCloseMenu(); onEdit(); }} />
                        <ActionButton icon="copy" label="Duplicate Task" onClick={() => { onCloseMenu(); onDuplicate(); }} />
                        <ActionButton icon="comment" label="View Comments" onClick={() => { onCloseMenu(); onComments(); }} />
                        <div className="border-t border-foreground/5" />
                        <button
                            onClick={() => { onCloseMenu(); onDelete(); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                    </div>,
                    document.body
                )}
            </td>
        </tr>
    );
}

// ============ Sub-components ============

function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    const icons: Record<string, React.ReactNode> = {
        eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
        edit: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
        copy: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />,
        comment: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
    };

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground transition"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icons[icon]}
                {icon === "eye" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
            </svg>
            {label}
        </button>
    );
}

function FlagIcon({ color }: { color: string }) {
    return (
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color }} viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 1a1 1 0 0 1 1 1v1h6.5a1 1 0 0 1 .8.4l1.25 1.67a1 1 0 0 1 0 1.2L10.3 7.93a1 1 0 0 1-.8.4H3v6a1 1 0 1 1-2 0V2a1 1 0 0 1 1-1z" />
        </svg>
    );
}
