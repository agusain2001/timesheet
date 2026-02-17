"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
    getMyTimeTasks,
    getMyTimeSummary,
    updateTaskWorkState,
    duplicateMyTimeTask,
    type MyTimeTask,
    type MyTimeSummary,
    type MyTimeTasksParams,
} from "@/services/my-time";
import { apiDelete } from "@/services/api";
import AddTaskModal from "@/components/AddTaskModal";
import EditTaskModal from "@/components/EditTaskModal";
import DeleteTaskModal from "@/components/DeleteTaskModal";
import CommentsModal from "@/components/CommentsModal";
import DuplicateTaskModal from "@/components/DuplicateTaskModal";
import TaskDetailPanel from "@/components/TaskDetailPanel";

// ============ Config ============

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    urgent: { label: "Urgent", color: "#ef4444" },
    high: { label: "High", color: "#f97316" },
    critical: { label: "Critical", color: "#dc2626" },
    medium: { label: "Normal", color: "#eab308" },
    low: { label: "Low", color: "#22c55e" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    in_progress: { label: "In Progress", color: "#3b82f6" },
    on_hold: { label: "On Hold", color: "#eab308" },
    draft: { label: "Draft", color: "#6b7280" },
    completed: { label: "Completed", color: "#22c55e" },
    archived: { label: "Archived", color: "#9ca3af" },
    todo: { label: "To Do", color: "#6b7280" },
    review: { label: "Review", color: "#a855f7" },
    blocked: { label: "Blocked", color: "#ef4444" },
    backlog: { label: "Backlog", color: "#6b7280" },
    waiting: { label: "Waiting", color: "#f97316" },
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

const SORT_FILTERS = [
    { key: "task_type", label: "Sort By Type", options: Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: "project_id", label: "Sort By Project", options: [] as { value: string; label: string }[] },
    { key: "priority", label: "Sort By Priority", options: Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label })) },
    { key: "status_filter", label: "Sort By Status", options: Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label })) },
    { key: "assignee_id", label: "Sort By Assignee", options: [] as { value: string; label: string }[] },
];

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ============ Helpers ============

function formatTimer(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getInitials(name: string): string {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ============ Sub-components ============

function FlagIcon({ color }: { color: string }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
    );
}

// ============ Filter Pill ============

function FilterPill({
    label, options, onSelect, activeValue,
}: {
    label: string;
    options: { value: string; label: string }[];
    onSelect: (value: string | null) => void;
    activeValue?: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition ${activeValue
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-500"
                    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20"
                    }`}
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {label}
                {activeValue && (
                    <button onClick={(e) => { e.stopPropagation(); onSelect(null); }} className="ml-1 hover:text-foreground">✕</button>
                )}
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 w-48 rounded-lg border border-foreground/10 bg-background shadow-xl z-50 overflow-hidden">
                    {options.length > 5 && (
                        <div className="p-2 border-b border-foreground/5">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full px-2 py-1.5 text-xs rounded bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/30 outline-none focus:border-blue-500/50"
                            />
                        </div>
                    )}
                    <div className="max-h-48 overflow-y-auto py-1">
                        {filtered.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { onSelect(opt.value === activeValue ? null : opt.value); setOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-foreground/5 flex items-center justify-between transition ${opt.value === activeValue ? "text-blue-500" : "text-foreground/80"
                                    }`}
                            >
                                <span>{opt.label}</span>
                                {opt.value === activeValue && (
                                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                        {filtered.length === 0 && <p className="text-xs text-foreground/30 px-3 py-2">No results</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ Current Task Card ============

function CurrentTaskCard({
    summary, onPlay, onPause, onStop,
}: {
    summary: MyTimeSummary;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
}) {
    const [elapsed, setElapsed] = useState(summary.current_task?.elapsed_seconds ?? 0);
    const isRunning = !!summary.current_task;

    useEffect(() => { setElapsed(summary.current_task?.elapsed_seconds ?? 0); }, [summary.current_task?.elapsed_seconds]);
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(interval);
    }, [isRunning]);

    const progressPct = Math.min(100, (elapsed / (8 * 3600)) * 100);

    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-foreground/40 mb-1">Current Task</p>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground truncate pr-4">
                    {summary.current_task?.name || "Not Selected"}
                </h3>
                <span className="text-2xl font-mono font-bold text-foreground tabular-nums whitespace-nowrap">
                    {formatTimer(elapsed)}
                </span>
            </div>
            <div className="flex items-center gap-3">
                {isRunning ? (
                    <button onClick={onPause} className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-500 transition shadow-lg shadow-blue-600/20">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                    </button>
                ) : (
                    <button onClick={onPlay} className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-500 transition shadow-lg shadow-blue-600/20">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                )}
                <button onClick={onStop} className="w-9 h-9 rounded-full border-2 border-foreground/20 flex items-center justify-center hover:border-foreground/40 transition">
                    <svg className="w-5 h-5 text-foreground/60" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                </button>
                <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
                </div>
            </div>
        </div>
    );
}

// ============ Weekly Progress Card ============

function WeeklyProgressCard({ summary }: { summary: MyTimeSummary }) {
    const maxDailyHours = 8;
    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 w-full lg:w-[380px] shrink-0">
            <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] uppercase tracking-wider text-foreground/40">Weekly Progress</p>
                <p className="text-xs text-foreground/50">
                    Remaining: <span className="text-foreground font-semibold">{summary.remaining_hours}h</span>
                </p>
            </div>
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold text-foreground">{summary.total_hours}h</span>
                <span className="text-sm text-foreground/40">/{summary.expected_hours}h</span>
            </div>
            <div className="flex items-end gap-1 h-4">
                {DAYS_ORDER.map((day) => {
                    const hours = summary.daily_hours[day] ?? 0;
                    const pct = Math.min(100, (hours / maxDailyHours) * 100);
                    return (
                        <div key={day} className="flex-1 h-full relative">
                            <div className="absolute inset-0 rounded bg-foreground/10" />
                            {hours > 0 ? (
                                <div className="absolute bottom-0 left-0 right-0 rounded bg-blue-500 transition-all" style={{ height: `${pct}%` }} />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-[3px] h-[3px] rounded-full bg-foreground/20" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============ Task Row ============

function TaskRow({
    task, isMenuOpen, onMenuToggle, onCloseMenu, onDelete, onDuplicate, onViewDetails, onToggleState, onEdit, onComments,
}: {
    task: MyTimeTask;
    isMenuOpen: boolean;
    onMenuToggle: () => void;
    onCloseMenu: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onViewDetails: () => void;
    onToggleState: () => void;
    onEdit: () => void;
    onComments: () => void;
}) {
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isMenuOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.right - 200 });
        }
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isMenuOpen) return;
        function handler(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) onCloseMenu();
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isMenuOpen, onCloseMenu]);

    const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.draft;
    const typeLbl = TYPE_LABELS[task.task_type] || `#${task.task_type}`;
    const isWorking = task.work_state === "working";

    return (
        <tr className="border-t border-foreground/5 hover:bg-foreground/[0.02] transition">
            <td className="py-3 pl-4 w-10">
                <input type="checkbox" className="rounded border-foreground/20 bg-transparent" />
            </td>
            <td className="py-3 pr-3">
                <button onClick={onViewDetails} className="text-sm text-foreground/90 hover:text-foreground transition text-left">
                    {task.name}
                </button>
            </td>
            <td className="py-3 pr-3">
                <span className="text-xs text-cyan-600">{typeLbl}</span>
            </td>
            <td className="py-3 pr-3 text-sm text-foreground/60">
                {task.project?.name || "—"}
            </td>
            <td className="py-3 pr-3">
                <span className="inline-flex items-center gap-1.5 text-xs">
                    <FlagIcon color={pri.color} />
                    <span className="text-foreground/80">{pri.label}</span>
                </span>
            </td>
            <td className="py-3 pr-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${st.color}20`, color: st.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                    {st.label}
                </span>
            </td>
            <td className="py-3 pr-3">
                {task.owner ? (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {getInitials(task.owner.full_name)}
                    </div>
                ) : task.assignee ? (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {getInitials(task.assignee.full_name)}
                    </div>
                ) : (
                    <span className="text-xs text-foreground/30">—</span>
                )}
            </td>
            <td className="py-3 pr-2">
                <button onClick={onToggleState} className="inline-flex items-center gap-1.5 text-xs text-foreground/70 hover:text-foreground transition">
                    {isWorking ? (
                        <>
                            <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                            </span>
                            Working
                        </>
                    ) : (
                        <>
                            <span className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center">
                                <svg className="w-3 h-3 text-foreground" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </span>
                            Paused
                        </>
                    )}
                </button>
            </td>
            <td className="py-3 pr-4 w-10">
                <button ref={btnRef} onClick={onMenuToggle} className="p-1 rounded hover:bg-foreground/10 text-foreground/40 hover:text-foreground transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
                    </svg>
                </button>
                {isMenuOpen && createPortal(
                    <div ref={menuRef} className="fixed w-[200px] rounded-lg border border-foreground/10 bg-background shadow-2xl z-[9999] py-1 overflow-hidden" style={{ top: menuPos.top, left: menuPos.left }}>
                        <ActionBtn icon="👁" label="View Details" onClick={() => { onCloseMenu(); onViewDetails(); }} />
                        <ActionBtn icon="✏️" label="Edit Task" onClick={() => { onCloseMenu(); onEdit(); }} />
                        <ActionBtn icon="📋" label="Duplicate Task" onClick={() => { onCloseMenu(); onDuplicate(); }} />
                        <ActionBtn icon="💬" label="View Comments" onClick={() => { onCloseMenu(); onComments(); }} />
                        <div className="border-t border-foreground/5 my-1" />
                        <button onClick={() => { onCloseMenu(); onDelete(); }} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition flex items-center gap-2">
                            <span>🗑</span> Delete
                        </button>
                    </div>,
                    document.body
                )}
            </td>
        </tr>
    );
}

function ActionBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-foreground/5 transition flex items-center gap-2">
            <span>{icon}</span> {label}
        </button>
    );
}

// ============ Loading / Empty ============

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-foreground/10 rounded ${className || ""}`} />;
}

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center"><Skeleton className="h-8 w-32" /><Skeleton className="h-10 w-28 rounded-lg" /></div>
            <div className="flex gap-4"><Skeleton className="h-36 flex-1 rounded-xl" /><Skeleton className="h-36 w-[380px] rounded-xl" /></div>
            <div className="flex gap-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-28 rounded-full" />)}</div>
            <Skeleton className="h-64 rounded-xl" />
        </div>
    );
}

function EmptyState({ onAddTask }: { onAddTask: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-lg font-semibold text-foreground/80 mb-2">Manage and Record Your Work Time</h3>
            <p className="text-sm text-foreground/40 max-w-md mb-1">Add tasks, track progress, and maintain accurate time records.</p>
            <p className="text-sm text-foreground/40 max-w-md mb-6">Every entry contributes to your structured daily and weekly timesheets.</p>
            <button onClick={onAddTask} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Task
            </button>
        </div>
    );
}

// ============ Main Page ============

export default function MyTimePage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<MyTimeTask[]>([]);
    const [summary, setSummary] = useState<MyTimeSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [filters, setFilters] = useState<MyTimeTasksParams>({});

    // Modal state
    const [editTask, setEditTask] = useState<MyTimeTask | null>(null);
    const [deleteTask, setDeleteTask] = useState<MyTimeTask | null>(null);
    const [commentsTask, setCommentsTask] = useState<MyTimeTask | null>(null);
    const [duplicateTask, setDuplicateTask] = useState<MyTimeTask | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);

    const fetchData = useCallback(async () => {
        const token = getToken();
        if (!token) { router.push("/login?redirect=/my-time"); return; }
        try {
            const params: MyTimeTasksParams = { ...filters };
            if (searchQuery.trim()) params.search = searchQuery.trim();
            const [tasksData, summaryData] = await Promise.all([getMyTimeTasks(params), getMyTimeSummary()]);
            setTasks(tasksData);
            setSummary(summaryData);
            setLoading(false);
        } catch (err: unknown) {
            console.error("My Time fetch error:", err);
            const e = err as { status?: number; message?: string };
            if (e?.status === 401 || e?.message?.includes("Not authenticated")) { router.push("/login?redirect=/my-time"); return; }
            setError("Failed to load My Time data");
            setLoading(false);
        }
    }, [router, filters, searchQuery]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFilterChange = (key: string, value: string | null) => {
        setFilters((prev) => {
            const next = { ...prev };
            if (value) { next[key] = value; } else { delete next[key]; }
            return next;
        });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTask) return;
        setIsDeleting(true);
        try { await apiDelete(`/api/tasks/${deleteTask.id}`); setDeleteTask(null); fetchData(); } catch (err) { console.error("Delete error:", err); } finally { setIsDeleting(false); }
    };
    const handleDuplicateConfirm = async () => {
        if (!duplicateTask) return;
        setIsDuplicating(true);
        try { await duplicateMyTimeTask(duplicateTask.id); setDuplicateTask(null); fetchData(); } catch (err) { console.error("Duplicate error:", err); } finally { setIsDuplicating(false); }
    };
    const handleToggleState = async (task: MyTimeTask) => {
        const newState = task.work_state === "working" ? "paused" : "working";
        try { await updateTaskWorkState(task.id, newState); fetchData(); } catch (err) { console.error("State toggle error:", err); }
    };
    const handlePlay = () => { if (!summary?.current_task && tasks.length > 0) handleToggleState({ ...tasks[0], work_state: "paused" }); };
    const handlePause = () => { if (summary?.current_task) updateTaskWorkState(summary.current_task.id, "paused").then(() => fetchData()); };
    const handleStop = () => { if (summary?.current_task) updateTaskWorkState(summary.current_task.id, "paused").then(() => fetchData()); };

    if (loading) return <PageSkeleton />;
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-foreground/60 text-sm">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">Retry</button>
                </div>
            </div>
        );
    }

    const currentSummary = summary!;

    return (
        <div className="space-y-5 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">My Time</h1>
                <button onClick={() => setShowAddTask(true)} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Task
                </button>
            </div>

            {/* Cards Row */}
            <div className="flex flex-col lg:flex-row gap-4">
                <CurrentTaskCard summary={currentSummary} onPlay={handlePlay} onPause={handlePause} onStop={handleStop} />
                <WeeklyProgressCard summary={currentSummary} />
            </div>

            {/* Sort/Filter Pills + Search */}
            <div className="flex items-center gap-3 flex-wrap">
                {SORT_FILTERS.map((sf) => (
                    <FilterPill key={sf.key} label={sf.label} options={sf.options} activeValue={filters[sf.key]} onSelect={(v) => handleFilterChange(sf.key, v)} />
                ))}
                <div className="ml-auto flex items-center gap-2">
                    {showSearch && (
                        <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); } }}
                            placeholder="Search tasks..."
                            className="px-3 py-1.5 text-xs rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/30 outline-none focus:border-blue-500/50 w-48 transition"
                        />
                    )}
                    <button onClick={() => setShowSearch(!showSearch)} className="inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        Search
                    </button>
                </div>
            </div>

            {/* Task Table */}
            {tasks.length === 0 ? (
                <EmptyState onAddTask={() => setShowAddTask(true)} />
            ) : (
                <div className="rounded-xl border border-foreground/10 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs uppercase tracking-wider text-foreground/40 border-b border-foreground/5">
                                <th className="py-3 pl-4 w-10 font-medium"><input type="checkbox" className="rounded border-foreground/20 bg-transparent" /></th>
                                <th className="py-3 pr-3 font-medium">Task Name</th>
                                <th className="py-3 pr-3 font-medium">Type</th>
                                <th className="py-3 pr-3 font-medium">Project</th>
                                <th className="py-3 pr-3 font-medium">Priority</th>
                                <th className="py-3 pr-3 font-medium">Status</th>
                                <th className="py-3 pr-3 font-medium">Assigned By</th>
                                <th className="py-3 pr-3 font-medium">Current State</th>
                                <th className="py-3 pr-4 w-10 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => (
                                <TaskRow key={task.id} task={task} isMenuOpen={openMenuId === task.id}
                                    onMenuToggle={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                                    onCloseMenu={() => setOpenMenuId(null)}
                                    onDelete={() => setDeleteTask(task)}
                                    onDuplicate={() => setDuplicateTask(task)}
                                    onViewDetails={() => setDetailTaskId(task.id)}
                                    onToggleState={() => handleToggleState(task)}
                                    onEdit={() => setEditTask(task)}
                                    onComments={() => setCommentsTask(task)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {detailTaskId && <TaskDetailPanel taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
            <AddTaskModal isOpen={showAddTask} onClose={() => setShowAddTask(false)} onTaskCreated={fetchData} />
            <EditTaskModal isOpen={!!editTask} task={editTask} onClose={() => setEditTask(null)} onTaskUpdated={fetchData} />
            <DeleteTaskModal isOpen={!!deleteTask} taskName={deleteTask?.name || ""} taskStatus={deleteTask?.status || ""} onClose={() => setDeleteTask(null)} onConfirm={handleDeleteConfirm} isDeleting={isDeleting} />
            <CommentsModal isOpen={!!commentsTask} taskId={commentsTask?.id || null} taskName={commentsTask?.name || ""} onClose={() => setCommentsTask(null)} />
            <DuplicateTaskModal isOpen={!!duplicateTask} taskName={duplicateTask?.name || ""} onClose={() => setDuplicateTask(null)} onConfirm={handleDuplicateConfirm} isDuplicating={isDuplicating} />
        </div>
    );
}
