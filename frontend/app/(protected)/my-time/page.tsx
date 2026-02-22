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

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    urgent: { label: "Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    high: { label: "High", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
    critical: { label: "Critical", color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
    medium: { label: "Normal", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
    low: { label: "Low", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    in_progress: { label: "In Progress", color: "#3b82f6" },
    on_hold: { label: "On Hold", color: "#eab308" },
    draft: { label: "Draft", color: "#6b7280" },
    completed: { label: "Completed", color: "#22c55e" },
    archived: { label: "Archived", color: "#9ca3af" },
    todo: { label: "To Do", color: "#8b5cf6" },
    review: { label: "Review", color: "#a855f7" },
    blocked: { label: "Blocked", color: "#ef4444" },
    backlog: { label: "Backlog", color: "#6b7280" },
    waiting: { label: "Waiting", color: "#f97316" },
    cancelled: { label: "Cancelled", color: "#9ca3af" },
    open: { label: "Open", color: "#3b82f6" },
    overdue: { label: "Overdue", color: "#ef4444" },
};

const TYPE_OPTIONS = [
    { value: "personal", label: "#Personal" },
    { value: "project", label: "#Project" },
    { value: "assigned", label: "#Assigned" },
    { value: "bug", label: "#Bug" },
    { value: "feature", label: "#Feature" },
    { value: "improvement", label: "#Improvement" },
];

const PRIORITY_OPTIONS = Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));
const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));
const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR = ["M", "T", "W", "T", "F", "S", "S"];

// ============ Helpers ============

function formatTimer(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getInitials(name: string): string {
    return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function formatDueDate(iso?: string): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    } catch { return iso; }
}

// ============ Icons ============

function PauseIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
    );
}
function PlayIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}
function StopIcon() {
    return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
    );
}
function PlusIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );
}
function SearchIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}
function FilterIcon() {
    return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
    );
}
function DotsIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
        </svg>
    );
}
function ClockIcon({ className }: { className?: string }) {
    return (
        <svg className={className || "w-3.5 h-3.5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
        </svg>
    );
}
function FlagIcon({ color }: { color: string }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill={color}>
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" stroke={color} strokeWidth="2" />
        </svg>
    );
}

// ============ FilterPill ============

function FilterPill({
    label, options, onSelect, activeValue,
}: {
    label: string;
    options: { value: string; label: string }[];
    onSelect: (value: string | null) => void;
    activeValue?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const isActive = !!activeValue;
    const activeLabel = isActive ? options.find(o => o.value === activeValue)?.label : null;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${isActive
                        ? "border-blue-500/60 bg-blue-500/15 text-blue-500 shadow-sm shadow-blue-500/10"
                        : "border-foreground/15 bg-foreground/[0.04] text-foreground/60 hover:bg-foreground/[0.07] hover:text-foreground/80 hover:border-foreground/25"
                    }`}
            >
                <FilterIcon />
                {isActive ? activeLabel : label}
                {isActive && (
                    <span
                        onClick={(e) => { e.stopPropagation(); onSelect(null); }}
                        className="ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition text-[10px] cursor-pointer"
                    >
                        ✕
                    </span>
                )}
                {!isActive && (
                    <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 w-44 rounded-xl border border-foreground/10 bg-background shadow-2xl shadow-black/20 z-50 overflow-hidden">
                    <div className="py-1.5 max-h-48 overflow-y-auto">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { onSelect(opt.value === activeValue ? null : opt.value); setOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-foreground/5 transition ${opt.value === activeValue ? "text-blue-500 font-medium" : "text-foreground/70"
                                    }`}
                            >
                                {opt.label}
                                {opt.value === activeValue && (
                                    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
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

    const dailySeconds = 8 * 3600;
    const progressPct = Math.min(100, (elapsed / dailySeconds) * 100);

    return (
        <div className="flex-1 min-w-0 rounded-2xl border border-foreground/10 bg-foreground/[0.02] dark:bg-foreground/[0.03] p-5 relative overflow-hidden group">
            {/* Glow blob */}
            <div className="absolute -top-8 -left-8 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/15 transition-all duration-700" />

            <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2 font-semibold">Current Task</p>

            <div className="flex items-start justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h3 className={`text-base font-semibold truncate leading-snug ${isRunning ? "text-foreground" : "text-foreground/40 italic"}`}>
                        {summary.current_task?.name || "No task running"}
                    </h3>
                    {isRunning && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-green-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active
                        </span>
                    )}
                </div>
                <span className="text-2xl font-mono font-bold text-foreground tabular-nums whitespace-nowrap shrink-0 mt-0.5">
                    {formatTimer(elapsed)}
                </span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] text-foreground/35 mb-1.5">
                    <span>Daily progress</span>
                    <span>{progressPct.toFixed(0)}% of 8h</span>
                </div>
                <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2.5">
                {isRunning ? (
                    <button
                        onClick={onPause}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition shadow-md shadow-blue-600/25"
                    >
                        <PauseIcon /> Pause
                    </button>
                ) : (
                    <button
                        onClick={onPlay}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition shadow-md shadow-blue-600/25"
                    >
                        <PlayIcon /> Resume
                    </button>
                )}
                <button
                    onClick={onStop}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border border-foreground/15 text-foreground/60 hover:border-foreground/30 hover:text-foreground transition"
                >
                    <StopIcon /> Stop
                </button>
            </div>
        </div>
    );
}

// ============ Weekly Progress Card ============

function WeeklyProgressCard({ summary }: { summary: MyTimeSummary }) {
    const maxDailyHours = 8;
    const weekPct = Math.min(100, (summary.total_hours / summary.expected_hours) * 100) || 0;
    const today = new Date().getDay(); // 0=Sun, 1=Mon…
    const todayIdx = today === 0 ? 6 : today - 1; // convert to Mon=0

    return (
        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] dark:bg-foreground/[0.03] p-5 w-full lg:w-[360px] shrink-0 relative overflow-hidden group">
            <div className="absolute -top-8 -right-8 w-36 h-36 bg-purple-500/8 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/12 transition-all duration-700" />

            <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-semibold">Weekly Progress</p>
                <span className="text-[10px] text-foreground/40">{summary.total_hours}h / {summary.expected_hours}h</span>
            </div>

            {/* Overall progress */}
            <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-bold text-foreground">{weekPct.toFixed(0)}%</span>
                <span className="text-xs text-foreground/40">complete</span>
            </div>
            <div className="h-1 bg-foreground/8 rounded-full overflow-hidden mb-5">
                <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-1000"
                    style={{ width: `${weekPct}%` }}
                />
            </div>

            {/* Day bars */}
            <div className="flex items-end gap-1.5 h-14">
                {DAYS_ORDER.map((day, idx) => {
                    const hours = summary.daily_hours[day] ?? 0;
                    const pct = Math.min(100, (hours / maxDailyHours) * 100);
                    const isToday = idx === todayIdx;
                    return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                            <div className="relative w-full flex-1 min-h-[36px]">
                                <div className="absolute inset-0 rounded bg-foreground/5" />
                                {pct > 0 && (
                                    <div
                                        className={`absolute bottom-0 left-0 right-0 rounded transition-all duration-700 ${isToday ? "bg-blue-500" : "bg-foreground/20"}`}
                                        style={{ height: `${pct}%` }}
                                    />
                                )}
                                {pct === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-1 h-1 rounded-full bg-foreground/15" />
                                    </div>
                                )}
                            </div>
                            <span className={`text-[9px] font-medium ${isToday ? "text-blue-500" : "text-foreground/30"}`}>
                                {DAY_ABBR[idx]}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-foreground/5">
                <span className="text-xs text-foreground/40">Remaining</span>
                <span className="text-sm font-semibold text-foreground">{summary.remaining_hours}h</span>
            </div>
        </div>
    );
}

// ============ Task Row ============

function ActionMenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 transition ${danger
                    ? "text-red-500 hover:bg-red-500/8"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                }`}
        >
            <span className="shrink-0">{icon}</span>
            {label}
        </button>
    );
}

function TaskRow({
    task, isMenuOpen, onMenuToggle, onCloseMenu,
    onDelete, onDuplicate, onViewDetails, onToggleState, onEdit, onComments,
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
            setMenuPos({ top: rect.bottom + 6, left: rect.right - 192 });
        }
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isMenuOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) onCloseMenu();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isMenuOpen, onCloseMenu]);

    const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const st = STATUS_CONFIG[task.status] || { label: task.status, color: "#6b7280" };
    const isWorking = task.work_state === "working";

    const typeLabel = TYPE_OPTIONS.find(t => t.value === task.task_type)?.label || `#${task.task_type}`;

    return (
        <tr className="border-t border-foreground/[0.06] hover:bg-foreground/[0.018] transition-colors group/row">
            {/* Checkbox */}
            <td className="py-3 pl-4 w-10">
                <input type="checkbox" className="rounded border-foreground/20 bg-transparent accent-blue-500 cursor-pointer" />
            </td>

            {/* Task Name */}
            <td className="py-3 pr-3 max-w-[220px]">
                <button
                    onClick={onViewDetails}
                    className="text-sm font-medium text-foreground/85 hover:text-foreground transition text-left truncate w-full leading-snug"
                >
                    {task.name}
                </button>
                {task.due_date && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-foreground/35">
                        <ClockIcon className="w-3 h-3" />
                        {formatDueDate(task.due_date)}
                    </div>
                )}
            </td>

            {/* Type */}
            <td className="py-3 pr-3">
                <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-500/8 px-2 py-0.5 rounded-md">
                    {typeLabel}
                </span>
            </td>

            {/* Project */}
            <td className="py-3 pr-3">
                <span className="text-xs text-foreground/55 truncate max-w-[140px] block">
                    {task.project?.name || "—"}
                </span>
            </td>

            {/* Priority */}
            <td className="py-3 pr-3">
                <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
                    style={{ background: pri.bg, color: pri.color }}
                >
                    <FlagIcon color={pri.color} />
                    {pri.label}
                </span>
            </td>

            {/* Status */}
            <td className="py-3 pr-3">
                <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: `${st.color}18`, color: st.color }}
                >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.color }} />
                    {st.label}
                </span>
            </td>

            {/* Assignee */}
            <td className="py-3 pr-3">
                {task.owner ? (
                    <div title={task.owner.full_name} className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
                        {getInitials(task.owner.full_name)}
                    </div>
                ) : task.assignee ? (
                    <div title={task.assignee.full_name} className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
                        {getInitials(task.assignee.full_name)}
                    </div>
                ) : (
                    <span className="text-xs text-foreground/25">—</span>
                )}
            </td>

            {/* Work State Toggle */}
            <td className="py-3 pr-3">
                <button
                    onClick={onToggleState}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all duration-200 ${isWorking
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                            : "border-foreground/12 bg-foreground/[0.03] text-foreground/50 hover:bg-foreground/8 hover:text-foreground/70"
                        }`}
                >
                    {isWorking ? (
                        <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Working</>
                    ) : (
                        <><span className="w-1.5 h-1.5 rounded-full bg-foreground/25" />Paused</>
                    )}
                </button>
            </td>

            {/* Actions */}
            <td className="py-3 pr-4 w-10">
                <button
                    ref={btnRef}
                    onClick={onMenuToggle}
                    className="p-1.5 rounded-lg text-foreground/30 hover:text-foreground hover:bg-foreground/8 transition opacity-0 group-hover/row:opacity-100"
                    aria-label="Actions"
                >
                    <DotsIcon />
                </button>

                {isMenuOpen && createPortal(
                    <div
                        ref={menuRef}
                        className="fixed w-48 rounded-xl border border-foreground/10 bg-background shadow-2xl shadow-black/30 z-[9999] py-1.5 overflow-hidden"
                        style={{ top: menuPos.top, left: menuPos.left }}
                    >
                        <ActionMenuItem
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                            label="View Details"
                            onClick={() => { onCloseMenu(); onViewDetails(); }}
                        />
                        <ActionMenuItem
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                            label="Edit Task"
                            onClick={() => { onCloseMenu(); onEdit(); }}
                        />
                        <ActionMenuItem
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                            label="Duplicate"
                            onClick={() => { onCloseMenu(); onDuplicate(); }}
                        />
                        <ActionMenuItem
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                            label="Comments"
                            onClick={() => { onCloseMenu(); onComments(); }}
                        />
                        <div className="h-px bg-foreground/6 my-1" />
                        <ActionMenuItem
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                            label="Delete Task"
                            onClick={() => { onCloseMenu(); onDelete(); }}
                            danger
                        />
                    </div>,
                    document.body
                )}
            </td>
        </tr>
    );
}

// ============ Stats Strip ============

function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent: string }) {
    return (
        <div className={`rounded-xl border border-foreground/8 bg-foreground/[0.02] px-4 py-3 flex items-center gap-3`}>
            <div className="w-2 h-8 rounded-full shrink-0" style={{ background: accent }} />
            <div>
                <p className="text-lg font-bold text-foreground leading-none">{value}</p>
                <p className="text-[10px] text-foreground/40 font-medium mt-0.5">{label}</p>
                {sub && <p className="text-[10px] text-foreground/25">{sub}</p>}
            </div>
        </div>
    );
}

// ============ Skeleton / Empty ============

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-foreground/8 rounded-lg ${className || ""}`} />;
}

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-28 rounded-xl" />
                <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-40 flex-1 rounded-2xl" />
                <Skeleton className="h-40 w-[360px] rounded-2xl" />
            </div>
            <div className="flex gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-28 rounded-full" />)}
            </div>
            <Skeleton className="h-72 rounded-2xl" />
        </div>
    );
}

function EmptyState({ onAddTask }: { onAddTask: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            {/* Decorative ring */}
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border border-blue-500/30" />
                <div className="absolute inset-0 rounded-full flex items-center justify-center">
                    <ClockIcon className="w-8 h-8 text-foreground/25" />
                </div>
            </div>
            <h3 className="text-base font-semibold text-foreground/70 mb-1">No tasks yet</h3>
            <p className="text-sm text-foreground/40 max-w-xs mb-6 leading-relaxed">
                Add tasks, track progress and maintain accurate time records across your week.
            </p>
            <button
                onClick={onAddTask}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
            >
                <PlusIcon />
                Add Your First Task
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
        try { await apiDelete(`/api/tasks/${deleteTask.id}`); setDeleteTask(null); fetchData(); }
        catch (err) { console.error("Delete error:", err); }
        finally { setIsDeleting(false); }
    };

    const handleDuplicateConfirm = async () => {
        if (!duplicateTask) return;
        setIsDuplicating(true);
        try { await duplicateMyTimeTask(duplicateTask.id); setDuplicateTask(null); fetchData(); }
        catch (err) { console.error("Duplicate error:", err); }
        finally { setIsDuplicating(false); }
    };

    const handleToggleState = async (task: MyTimeTask) => {
        const newState = task.work_state === "working" ? "paused" : "working";
        try { await updateTaskWorkState(task.id, newState); fetchData(); }
        catch (err) { console.error("State toggle error:", err); }
    };

    const handlePlay = () => {
        if (!summary?.current_task && tasks.length > 0) handleToggleState({ ...tasks[0], work_state: "paused" });
    };
    const handlePause = () => {
        if (summary?.current_task) updateTaskWorkState(summary.current_task.id, "paused").then(() => fetchData());
    };
    const handleStop = () => {
        if (summary?.current_task) updateTaskWorkState(summary.current_task.id, "paused").then(() => fetchData());
    };

    // Derived stats
    const workingCount = tasks.filter(t => t.work_state === "working").length;
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === "completed").length;
    const overdueTasks = tasks.filter(t => t.status === "overdue").length;

    if (loading) return <PageSkeleton />;
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-sm text-foreground/60">{error}</p>
                    <button onClick={() => { setError(null); setLoading(true); fetchData(); }} className="px-4 py-2 text-sm font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const currentSummary = summary!;
    const activeFiltersCount = Object.keys(filters).length;

    return (
        <div className="space-y-5 max-w-[1400px] mx-auto pb-8">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Time</h1>
                    <p className="text-xs text-foreground/40 mt-0.5">Track and manage your work time</p>
                </div>
                <button
                    onClick={() => setShowAddTask(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
                >
                    <PlusIcon />
                    Add Task
                </button>
            </div>

            {/* ── Summary Cards ── */}
            <div className="flex flex-col lg:flex-row gap-4">
                <CurrentTaskCard summary={currentSummary} onPlay={handlePlay} onPause={handlePause} onStop={handleStop} />
                <WeeklyProgressCard summary={currentSummary} />
            </div>

            {/* ── Stats Strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Tasks" value={totalTasks} accent="#3b82f6" />
                <StatCard label="Active Now" value={workingCount} accent="#22c55e" sub={workingCount > 0 ? "timer running" : undefined} />
                <StatCard label="Completed" value={doneTasks} accent="#a855f7" />
                <StatCard label="Overdue" value={overdueTasks} accent="#ef4444" />
            </div>

            {/* ── Filters + Search ── */}
            <div className="flex items-center gap-2.5 flex-wrap">
                <FilterPill
                    label="Type"
                    options={TYPE_OPTIONS}
                    activeValue={filters.task_type}
                    onSelect={(v) => handleFilterChange("task_type", v)}
                />
                <FilterPill
                    label="Priority"
                    options={PRIORITY_OPTIONS}
                    activeValue={filters.priority}
                    onSelect={(v) => handleFilterChange("priority", v)}
                />
                <FilterPill
                    label="Status"
                    options={STATUS_OPTIONS}
                    activeValue={filters.status_filter}
                    onSelect={(v) => handleFilterChange("status_filter", v)}
                />

                {activeFiltersCount > 0 && (
                    <button
                        onClick={() => setFilters({})}
                        className="text-xs text-foreground/40 hover:text-foreground/70 underline underline-offset-2 transition"
                    >
                        Clear all ({activeFiltersCount})
                    </button>
                )}

                <div className="ml-auto flex items-center gap-2">
                    {showSearch ? (
                        <div className="relative">
                            <SearchIcon />
                            <input
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); } }}
                                placeholder="Search tasks…"
                                className="pl-8 pr-8 py-1.5 text-xs rounded-xl bg-foreground/[0.05] border border-foreground/12 text-foreground placeholder-foreground/30 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 w-52 transition"
                                style={{ paddingLeft: "2rem" }}
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/35 pointer-events-none">
                                <SearchIcon />
                            </div>
                            <button
                                onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition text-[11px]"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSearch(true)}
                            className="inline-flex items-center gap-1.5 text-xs text-foreground/45 hover:text-foreground/70 border border-foreground/12 rounded-xl px-3 py-1.5 hover:bg-foreground/5 transition"
                        >
                            <SearchIcon />
                            Search
                        </button>
                    )}
                </div>
            </div>

            {/* ── Task Table ── */}
            {tasks.length === 0 ? (
                <EmptyState onAddTask={() => setShowAddTask(true)} />
            ) : (
                <div className="rounded-2xl border border-foreground/8 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-foreground/[0.025]">
                                <th className="py-3 pl-4 w-10">
                                    <input type="checkbox" className="rounded border-foreground/20 bg-transparent accent-blue-500 cursor-pointer" />
                                </th>
                                {["Task Name", "Type", "Project", "Priority", "Status", "Assigned By", "State", ""].map((h, i) => (
                                    <th key={i} className="py-3 pr-3 text-[10px] uppercase tracking-widest text-foreground/35 font-semibold">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    isMenuOpen={openMenuId === task.id}
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

                    {/* Table footer */}
                    <div className="px-4 py-3 border-t border-foreground/6 bg-foreground/[0.015] flex items-center justify-between">
                        <p className="text-xs text-foreground/35">
                            Showing <span className="font-semibold text-foreground/60">{tasks.length}</span> task{tasks.length !== 1 ? "s" : ""}
                            {activeFiltersCount > 0 && <span className="ml-1 text-blue-500">· {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active</span>}
                        </p>
                        <p className="text-xs text-foreground/30">
                            {workingCount > 0 ? `${workingCount} task${workingCount > 1 ? "s" : ""} running` : "No active timers"}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Modals & Panels ── */}
            {detailTaskId && <TaskDetailPanel taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
            <AddTaskModal isOpen={showAddTask} onClose={() => setShowAddTask(false)} onTaskCreated={fetchData} />
            <EditTaskModal isOpen={!!editTask} task={editTask} onClose={() => setEditTask(null)} onTaskUpdated={fetchData} />
            <DeleteTaskModal
                isOpen={!!deleteTask}
                taskName={deleteTask?.name || ""}
                taskStatus={deleteTask?.status || ""}
                onClose={() => setDeleteTask(null)}
                onConfirm={handleDeleteConfirm}
                isDeleting={isDeleting}
            />
            <CommentsModal
                isOpen={!!commentsTask}
                taskId={commentsTask?.id || null}
                taskName={commentsTask?.name || ""}
                onClose={() => setCommentsTask(null)}
            />
            <DuplicateTaskModal
                isOpen={!!duplicateTask}
                taskName={duplicateTask?.name || ""}
                onClose={() => setDuplicateTask(null)}
                onConfirm={handleDuplicateConfirm}
                isDuplicating={isDuplicating}
            />
        </div>
    );
}
