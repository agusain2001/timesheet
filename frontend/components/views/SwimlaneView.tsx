"use client";

import { useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
    id: string;
    name: string;
    status: string;
    priority?: string;
    due_date?: string;
    assignee?: { id: string; full_name: string };
    is_blocked?: boolean;
}

interface SwimlaneViewProps {
    tasks: Task[];
    groupBy: "assignee" | "priority" | "status";
    onTaskClick: (task: Task) => void;
    onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLUMNS = [
    { id: "todo", label: "To Do", color: "bg-indigo-500" },
    { id: "in_progress", label: "In Progress", color: "bg-amber-500" },
    { id: "review", label: "Review", color: "bg-violet-500" },
    { id: "blocked", label: "Blocked", color: "bg-red-500" },
    { id: "completed", label: "Done", color: "bg-green-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
    critical: "text-red-400", high: "text-orange-400",
    medium: "text-yellow-400", low: "text-green-400",
};

const PRIORITY_EMOJI: Record<string, string> = {
    critical: "🔴", high: "🟠", medium: "🟡", low: "🟢",
};

// ─── Mini Task Card ───────────────────────────────────────────────────────────

function MiniCard({ task, onClick }: { task: Task; onClick: () => void }) {
    const due = task.due_date ? new Date(task.due_date) : null;
    const isOverdue = due && due < new Date() && task.status !== "completed";

    return (
        <div
            onClick={onClick}
            className={`p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md text-xs ${task.is_blocked
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
        >
            <div className="flex items-center gap-1 mb-1">
                {task.priority && <span>{PRIORITY_EMOJI[task.priority] || ""}</span>}
                <p className="text-slate-300 truncate font-medium">{task.name}</p>
            </div>
            {due && (
                <p className={`text-[10px] ${isOverdue ? "text-red-400" : "text-slate-600"}`}>
                    {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
            )}
        </div>
    );
}

// ─── SwimlaneView ─────────────────────────────────────────────────────────────

export default function SwimlaneView({ tasks, groupBy, onTaskClick, onStatusChange }: SwimlaneViewProps) {
    // Build lanes based on groupBy
    const lanes = useMemo(() => {
        const laneMap: Record<string, { label: string; tasks: Task[] }> = {};

        tasks.forEach((task) => {
            let laneKey = "other";
            let laneLabel = "Other";

            if (groupBy === "assignee") {
                laneKey = task.assignee?.id || "unassigned";
                laneLabel = task.assignee?.full_name || "Unassigned";
            } else if (groupBy === "priority") {
                laneKey = task.priority || "none";
                laneLabel = task.priority
                    ? `${PRIORITY_EMOJI[task.priority] || ""} ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`
                    : "No Priority";
            } else if (groupBy === "status") {
                laneKey = task.status;
                laneLabel = STATUS_COLUMNS.find((c) => c.id === task.status)?.label || task.status;
            }

            if (!laneMap[laneKey]) laneMap[laneKey] = { label: laneLabel, tasks: [] };
            laneMap[laneKey].tasks.push(task);
        });

        return Object.entries(laneMap).sort(([a], [b]) => a.localeCompare(b));
    }, [tasks, groupBy]);

    if (tasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
                No tasks to display.
            </div>
        );
    }

    return (
        <div className="overflow-auto h-full">
            {/* Column headers */}
            <div className="sticky top-0 z-10 flex bg-slate-950 border-b border-white/10">
                <div className="w-48 shrink-0 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-white/10">
                    {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                </div>
                {STATUS_COLUMNS.map((col) => (
                    <div
                        key={col.id}
                        className="flex-1 min-w-[160px] px-3 py-3 border-r border-white/10"
                    >
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${col.color}`} />
                            <span className="text-xs font-semibold text-slate-400">{col.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Swimlanes */}
            {lanes.map(([key, lane]) => {
                const tasksByStatus = STATUS_COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
                    acc[col.id] = lane.tasks.filter((t) => t.status === col.id);
                    return acc;
                }, {});
                const totalInLane = lane.tasks.length;

                return (
                    <div key={key} className="flex border-b border-white/5 min-h-[80px]">
                        {/* Lane label */}
                        <div className="w-48 shrink-0 flex items-start gap-2 px-4 py-3 border-r border-white/10 bg-white/2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                                {lane.label.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-300 truncate">{lane.label}</p>
                                <p className="text-xs text-slate-600">{totalInLane} task{totalInLane !== 1 ? "s" : ""}</p>
                            </div>
                        </div>

                        {/* Status columns */}
                        {STATUS_COLUMNS.map((col) => {
                            const colTasks = tasksByStatus[col.id] || [];
                            return (
                                <div
                                    key={col.id}
                                    className="flex-1 min-w-[160px] p-2 border-r border-white/5 space-y-1.5"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => { }}
                                >
                                    {colTasks.map((task) => (
                                        <MiniCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
