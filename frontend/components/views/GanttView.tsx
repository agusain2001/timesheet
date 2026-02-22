"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Diamond } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
    id: string;
    name: string;
    status: string;
    priority?: string;
    start_date?: string;
    due_date?: string;
    progress?: number;
    assignee?: { full_name: string };
    is_blocked?: boolean;
}

interface Milestone {
    id: string;
    name: string;
    due_date: string;
    status: string;
}

interface GanttViewProps {
    tasks: Task[];
    milestones?: Milestone[];
    onTaskClick: (task: Task) => void;
    zoom?: "day" | "week" | "month";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BAR_COLOR: Record<string, string> = {
    completed: "bg-green-500",
    in_progress: "bg-amber-500",
    review: "bg-violet-500",
    blocked: "bg-red-500",
    todo: "bg-indigo-500",
    backlog: "bg-slate-500",
    cancelled: "bg-slate-700",
};

const LABEL_WIDTH = 220; // px for task label column
const COL_WIDTH = 40;  // px per day cell

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDates(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

function addDays(d: Date, n: number) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function daysBetween(a: Date, b: Date) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// ─── Gantt View ───────────────────────────────────────────────────────────────

export default function GanttView({ tasks, milestones = [], onTaskClick, zoom = "week" }: GanttViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    // Determine timeline range
    const { timelineStart, timelineEnd, dates } = useMemo(() => {
        const allDates: Date[] = [];
        tasks.forEach((t) => {
            if (t.start_date) allDates.push(new Date(t.start_date));
            if (t.due_date) allDates.push(new Date(t.due_date));
        });
        milestones.forEach((m) => { if (m.due_date) allDates.push(new Date(m.due_date)); });

        const now = new Date();
        const minDate = allDates.length > 0
            ? new Date(Math.min(...allDates.map((d) => d.getTime())))
            : now;
        const maxDate = allDates.length > 0
            ? new Date(Math.max(...allDates.map((d) => d.getTime())))
            : addDays(now, 30);

        const start = addDays(minDate, -3);
        const end = addDays(maxDate, 7);
        return { timelineStart: start, timelineEnd: end, dates: getDates(start, end) };
    }, [tasks, milestones]);

    const today = new Date();
    const todayOffset = daysBetween(timelineStart, today);

    // Group dates by week/month for header
    const headerGroups = useMemo(() => {
        const groups: { label: string; days: number }[] = [];
        let cur: string | null = null;
        let count = 0;
        dates.forEach((d) => {
            const key = zoom === "day"
                ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : zoom === "week"
                    ? `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("en-US", { month: "short" })}`
                    : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
            if (key === cur) { count++; }
            else { if (cur) groups.push({ label: cur, days: count }); cur = key; count = 1; }
        });
        if (cur) groups.push({ label: cur, days: count });
        return groups;
    }, [dates, zoom]);

    if (tasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
                No tasks with dates to display in the timeline.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden border border-white/10 rounded-2xl">
            {/* Sticky header row */}
            <div className="flex border-b border-white/10 bg-slate-900 shrink-0">
                {/* Task label header */}
                <div
                    className="shrink-0 flex items-center px-4 py-3 border-r border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                    style={{ width: LABEL_WIDTH }}
                >
                    Task
                </div>
                {/* Timeline header */}
                <div className="flex-1 overflow-x-hidden">
                    <div className="flex" style={{ width: dates.length * COL_WIDTH }}>
                        {/* Group labels */}
                        {headerGroups.map((g, i) => (
                            <div
                                key={i}
                                className="border-r border-white/5 text-[10px] font-medium text-slate-500 px-2 py-1 truncate"
                                style={{ width: g.days * COL_WIDTH, minWidth: 0 }}
                            >
                                {g.label}
                            </div>
                        ))}
                    </div>
                    <div className="flex border-t border-white/5" style={{ width: dates.length * COL_WIDTH }}>
                        {dates.map((d, i) => {
                            const isToday = d.toDateString() === today.toDateString();
                            return (
                                <div
                                    key={i}
                                    className={`border-r border-white/5 text-[9px] text-center py-1 ${isToday ? "bg-indigo-500/20 text-indigo-400" : "text-slate-700"
                                        }`}
                                    style={{ width: COL_WIDTH, minWidth: COL_WIDTH }}
                                >
                                    {d.getDate()}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Scrollable body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Task label column */}
                <div className="shrink-0 overflow-y-auto border-r border-white/10 bg-slate-900/50" style={{ width: LABEL_WIDTH }}>
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="flex items-center gap-2 px-3 py-2 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                            style={{ height: 48 }}
                            onClick={() => onTaskClick(task)}
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpandedTasks((prev) => { const n = new Set(prev); n.has(task.id) ? n.delete(task.id) : n.add(task.id); return n; }); }}
                                className="text-slate-600 hover:text-slate-400 shrink-0"
                            >
                                <ChevronDown size={12} className={`transition-transform ${expandedTasks.has(task.id) ? "rotate-180" : ""}`} />
                            </button>
                            <p className="text-xs text-slate-300 truncate">{task.name}</p>
                        </div>
                    ))}
                </div>

                {/* Gantt chart body */}
                <div ref={scrollRef} className="flex-1 overflow-auto relative">
                    <div style={{ width: dates.length * COL_WIDTH, position: "relative" }}>
                        {/* Today line */}
                        {todayOffset >= 0 && (
                            <div
                                className="absolute top-0 bottom-0 w-px bg-indigo-400/60 z-10 pointer-events-none"
                                style={{ left: todayOffset * COL_WIDTH + COL_WIDTH / 2 }}
                            />
                        )}

                        {/* Task rows */}
                        {tasks.map((task) => {
                            const start = task.start_date
                                ? daysBetween(timelineStart, new Date(task.start_date))
                                : null;
                            const end = task.due_date
                                ? daysBetween(timelineStart, new Date(task.due_date))
                                : null;

                            const barStart = start ?? end ?? 0;
                            const barWidth = start != null && end != null ? (end - start + 1) * COL_WIDTH : COL_WIDTH;
                            const progress = task.status === "completed" ? 100 : task.progress ?? 0;

                            const barColor = task.is_blocked
                                ? "bg-red-500"
                                : STATUS_BAR_COLOR[task.status] || "bg-indigo-500";

                            return (
                                <div
                                    key={task.id}
                                    className="relative border-b border-white/5"
                                    style={{ height: 48 }}
                                >
                                    {/* Row background stripes */}
                                    <div className="absolute inset-0 flex">
                                        {dates.map((_, i) => (
                                            <div key={i} className={`border-r border-white/5 ${i % 7 >= 5 ? "bg-white/2" : ""}`} style={{ width: COL_WIDTH }} />
                                        ))}
                                    </div>

                                    {/* Bar */}
                                    {(start !== null || end !== null) && (
                                        <div
                                            className={`absolute top-3 h-6 rounded-lg cursor-pointer hover:opacity-80 transition-opacity overflow-hidden shadow-sm ${barColor}`}
                                            style={{
                                                left: barStart * COL_WIDTH + 2,
                                                width: Math.max(barWidth - 4, COL_WIDTH - 4),
                                            }}
                                            onClick={() => onTaskClick(task)}
                                            title={task.name}
                                        >
                                            {/* Progress overlay */}
                                            {progress > 0 && (
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-white/20 rounded-lg"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            )}
                                            <span className="relative text-[9px] text-white px-1.5 leading-6 truncate block">
                                                {task.name}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Milestones */}
                        {milestones.map((ms) => {
                            const offset = daysBetween(timelineStart, new Date(ms.due_date));
                            return (
                                <div
                                    key={ms.id}
                                    className="absolute bottom-0 z-20"
                                    style={{ left: offset * COL_WIDTH + COL_WIDTH / 2 - 6 }}
                                    title={ms.name}
                                >
                                    <Diamond
                                        size={12}
                                        className={ms.status === "completed" ? "text-green-400 fill-green-400" : "text-amber-400 fill-amber-400"}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
