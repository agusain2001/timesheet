"use client";

import { useState, useCallback } from "react";
import { GripVertical, Clock, Flag, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
    id: string;
    name: string;
    description?: string;
    status: string;
    priority?: string;
    due_date?: string;
    assignee?: { id: string; full_name: string; avatar_url?: string };
    tags?: string[];
    is_blocked?: boolean;
    blocked_by?: { id: string; name: string }[];
    estimated_hours?: number;
}

interface KanbanBoardProps {
    tasks: Task[];
    onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
    onTaskClick: (task: Task) => void;
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
    { id: "backlog", label: "Backlog", color: "#64748b", bg: "bg-slate-500/10", border: "border-slate-500/30" },
    { id: "todo", label: "To Do", color: "#6366f1", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
    { id: "in_progress", label: "In Progress", color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { id: "review", label: "Review", color: "#8b5cf6", bg: "bg-violet-500/10", border: "border-violet-500/30" },
    { id: "blocked", label: "Blocked", color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/30" },
    { id: "completed", label: "Done", color: "#22c55e", bg: "bg-green-500/10", border: "border-green-500/30" },
];

const PRIORITY_COLORS: Record<string, string> = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-400",
    low: "text-green-400",
};

const PRIORITY_LABELS: Record<string, string> = {
    critical: "🔴", high: "🟠", medium: "🟡", low: "🟢",
};

function formatDate(d?: string) {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const isOverdue = date < now;
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label, isOverdue };
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
    task,
    onDragStart,
    onDragEnd,
    onClick,
}: {
    task: Task;
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onDragEnd: () => void;
    onClick: (task: Task) => void;
}) {
    const due = formatDate(task.due_date);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            onDragEnd={onDragEnd}
            onClick={() => onClick(task)}
            className={`group relative p-3 rounded-xl border cursor-pointer select-none transition-all hover:translate-y-[-1px] hover:shadow-lg ${task.is_blocked
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
        >
            {/* Drag handle */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-600">
                <GripVertical size={12} />
            </div>

            {/* Priority + Title */}
            <div className="flex items-start gap-2 mb-2">
                {task.priority && (
                    <span className="text-xs mt-0.5 shrink-0">{PRIORITY_LABELS[task.priority] || ""}</span>
                )}
                <p className={`text-sm font-medium leading-snug ${task.is_blocked ? "text-red-300" : "text-slate-200"} line-clamp-2`}>
                    {task.name}
                </p>
            </div>

            {/* Blocked warning */}
            {task.is_blocked && task.blocked_by && task.blocked_by.length > 0 && (
                <div className="mb-2 text-xs text-red-400 flex items-center gap-1">
                    <ChevronRight size={10} />
                    Blocked by: {task.blocked_by[0].name}
                    {task.blocked_by.length > 1 && ` +${task.blocked_by.length - 1}`}
                </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {task.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-slate-400">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                    {/* Assignee avatar */}
                    {task.assignee && (
                        <div
                            className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center text-[9px] font-bold text-indigo-300"
                            title={task.assignee.full_name}
                        >
                            {task.assignee.full_name?.charAt(0)}
                        </div>
                    )}
                    {/* Estimated hours */}
                    {task.estimated_hours && (
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-600">
                            <Clock size={9} /> {task.estimated_hours}h
                        </span>
                    )}
                </div>

                {/* Due date */}
                {due && (
                    <span className={`text-[10px] ${due.isOverdue ? "text-red-400" : "text-slate-500"}`}>
                        {due.label}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
    column,
    tasks,
    onDragStart,
    onDragEnd,
    onDrop,
    dragOver,
    setDragOver,
    onTaskClick,
}: {
    column: typeof COLUMNS[0];
    tasks: Task[];
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onDragEnd: () => void;
    onDrop: (status: string) => void;
    dragOver: string | null;
    setDragOver: (id: string | null) => void;
    onTaskClick: (task: Task) => void;
}) {
    const isOver = dragOver === column.id;

    return (
        <div
            className={`flex flex-col min-w-[280px] max-w-[280px] rounded-2xl border transition-colors ${isOver ? `${column.border} bg-white/5` : "border-white/5 bg-white/3"
                }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(column.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => { onDrop(column.id); setDragOver(null); }}
        >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 pb-3 rounded-t-2xl ${column.bg}`}>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                    <h3 className="text-sm font-semibold text-slate-300">{column.label}</h3>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                    {tasks.length}
                </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[100px]">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onClick={onTaskClick}
                    />
                ))}
                {tasks.length === 0 && (
                    <div className={`h-20 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors ${isOver ? `${column.border} opacity-100` : "border-white/5 opacity-50"
                        }`}>
                        <p className="text-xs text-slate-600">Drop here</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── KanbanBoard ──────────────────────────────────────────────────────────────

export default function KanbanBoard({ tasks, onStatusChange, onTaskClick }: KanbanBoardProps) {
    const [dragging, setDragging] = useState<Task | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
        setDragging(task);
        e.dataTransfer.effectAllowed = "move";
    }, []);

    const handleDrop = useCallback(
        async (newStatus: string) => {
            if (!dragging || dragging.status === newStatus) return;
            await onStatusChange(dragging.id, newStatus);
        },
        [dragging, onStatusChange]
    );

    // Group tasks by status
    const tasksByStatus = COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
        acc[col.id] = tasks.filter((t) => t.status === col.id);
        return acc;
    }, {});

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
            {COLUMNS.map((col) => (
                <KanbanColumn
                    key={col.id}
                    column={col}
                    tasks={tasksByStatus[col.id] || []}
                    onDragStart={handleDragStart}
                    onDragEnd={() => setDragging(null)}
                    onDrop={handleDrop}
                    dragOver={dragOver}
                    setDragOver={setDragOver}
                    onTaskClick={onTaskClick}
                />
            ))}
        </div>
    );
}
