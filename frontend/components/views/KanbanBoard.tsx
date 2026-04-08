"use client";

import { useState, useCallback } from "react";
import { GripVertical, Clock, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import TaskContextMenu, { type TaskContextMenuTask } from "@/components/views/TaskContextMenu";

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
    onEditTask: (task: Task) => void;
    onDeleteTask: (task: Task) => void;
    onDuplicateTask: (task: Task) => void;
    onViewComments: (task: Task) => void;
    onAddForStatus: (status: string) => void;
    selectedTaskIds?: Set<string>;
    onToggleSelect?: (taskId: string) => void;
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
    { id: "backlog", label: "Backlog", color: "#64748b", bg: "bg-slate-500/10", border: "border-foreground/20" },
    { id: "todo", label: "To Do", color: "#6366f1", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
    { id: "in_progress", label: "In Progress", color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { id: "review", label: "Review", color: "#8b5cf6", bg: "bg-purple-500/10", border: "border-purple-500/30" },
    { id: "blocked", label: "Blocked", color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/30" },
    { id: "completed", label: "Done", color: "#22c55e", bg: "bg-green-500/10", border: "border-green-500/30" },
];

const PRIORITY_LABELS: Record<string, string> = {
    critical: "🔴", high: "🟠", medium: "🟡", low: "🟢",
};

function formatDate(d?: string) {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    return { label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), isOverdue: date < now };
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
    task,
    onDragStart,
    onDragEnd,
    onClick,
    onContextMenu,
    onMenuClick,
    isSelected,
    onToggleSelect,
}: {
    task: Task;
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onDragEnd: () => void;
    onClick: (task: Task) => void;
    onContextMenu: (e: React.MouseEvent, task: Task) => void;
    onMenuClick: (e: React.MouseEvent, task: Task) => void;
    isSelected: boolean;
    onToggleSelect: (taskId: string) => void;
}) {
    const due = formatDate(task.due_date);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            onDragEnd={onDragEnd}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, task); }}
            className={`group relative p-3 rounded-xl border cursor-pointer select-none transition-all hover:translate-y-[-1px] hover:shadow-lg ${isSelected
                ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30"
                : task.is_blocked
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-white dark:bg-white/[0.05] border-foreground/10 hover:border-foreground/20 shadow-sm"
                }`}
        >
            {/* Drag handle */}
            <div className="absolute left-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-foreground/30">
                <GripVertical size={12} />
            </div>

            {/* Select + Action row */}
            <div className="flex items-start justify-between mb-1.5 pl-3">
                {/* Checkbox */}
                <div
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
                    className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center cursor-pointer transition-colors shrink-0 ${isSelected
                        ? "bg-blue-500 border-blue-500"
                        : "border-foreground/20 opacity-0 group-hover:opacity-100"
                        }`}
                >
                    {isSelected && (
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                    )}
                </div>

                {/* Action menu button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onMenuClick(e, task); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-foreground/10 text-foreground/40 hover:text-foreground/70 transition-all -mt-1 -mr-1"
                >
                    <MoreHorizontal size={13} />
                </button>
            </div>

            {/* Priority + Title */}
            <div
                className="flex items-start gap-2 mb-2"
                onClick={() => onClick(task)}
            >
                {task.priority && <span className="text-xs mt-0.5 shrink-0">{PRIORITY_LABELS[task.priority] || ""}</span>}
                <p className={`text-sm font-medium leading-snug ${task.is_blocked ? "text-red-500" : "text-foreground"} line-clamp-2`}>
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
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-foreground/10 text-foreground/60">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                    {task.assignee && (
                        <div
                            className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-bold text-blue-600 dark:text-blue-300"
                            title={task.assignee.full_name}
                        >
                            {task.assignee.full_name?.charAt(0)}
                        </div>
                    )}
                    {task.estimated_hours && (
                        <span className="flex items-center gap-0.5 text-[10px] text-foreground/50">
                            <Clock size={9} /> {task.estimated_hours}h
                        </span>
                    )}
                </div>
                {due && (
                    <span className={`text-[10px] ${due.isOverdue ? "text-red-400" : "text-foreground/50"}`}>
                        {due.label}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({
    column,
    tasks,
    onDragStart,
    onDragEnd,
    onDrop,
    dragOver,
    setDragOver,
    onTaskClick,
    onContextMenu,
    onMenuClick,
    onAddForStatus,
    selectedTaskIds,
    onToggleSelect,
}: {
    column: typeof COLUMNS[0];
    tasks: Task[];
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onDragEnd: () => void;
    onDrop: (status: string) => void;
    dragOver: string | null;
    setDragOver: (id: string | null) => void;
    onTaskClick: (task: Task) => void;
    onContextMenu: (e: React.MouseEvent, task: Task) => void;
    onMenuClick: (e: React.MouseEvent, task: Task) => void;
    onAddForStatus: (status: string) => void;
    selectedTaskIds: Set<string>;
    onToggleSelect: (taskId: string) => void;
}) {
    const isOver = dragOver === column.id;

    return (
        <div
            className={`flex flex-col min-w-[280px] max-w-[280px] rounded-2xl border transition-colors ${isOver ? `${column.border} bg-foreground/[0.05]` : "border-foreground/10 bg-foreground/[0.02] dark:border-foreground/5 dark:bg-foreground/[0.01]"
                }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(column.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => { onDrop(column.id); setDragOver(null); }}
        >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 pb-3 rounded-t-2xl ${column.bg}`}>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                    <h3 className="text-sm font-semibold text-foreground/80">{column.label}</h3>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/60">
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
                        onContextMenu={onContextMenu}
                        onMenuClick={onMenuClick}
                        isSelected={selectedTaskIds.has(task.id)}
                        onToggleSelect={onToggleSelect}
                    />
                ))}
                {tasks.length === 0 && (
                    <div className={`h-20 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors ${isOver ? `${column.border} opacity-100` : "border-foreground/5 opacity-50"
                        }`}>
                        <p className="text-xs text-foreground/50">Drop here</p>
                    </div>
                )}
            </div>

            {/* Add task button */}
            <div className="p-3 pt-1">
                <button
                    onClick={() => onAddForStatus(column.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                    <Plus size={13} />
                    Add task
                </button>
            </div>
        </div>
    );
}

// ─── KanbanBoard ──────────────────────────────────────────────────────────────

export default function KanbanBoard({
    tasks,
    onStatusChange,
    onTaskClick,
    onEditTask,
    onDeleteTask,
    onDuplicateTask,
    onViewComments,
    onAddForStatus,
    selectedTaskIds = new Set(),
    onToggleSelect = () => { },
}: KanbanBoardProps) {
    const [dragging, setDragging] = useState<Task | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ task: Task; x: number; y: number } | null>(null);

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

    const handleContextMenu = useCallback((e: React.MouseEvent, task: Task) => {
        setContextMenu({ task, x: e.clientX, y: e.clientY });
    }, []);

    const handleMenuClick = useCallback((e: React.MouseEvent, task: Task) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setContextMenu({ task, x: rect.right, y: rect.bottom });
    }, []);

    // Group tasks by status
    const tasksByStatus = COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
        acc[col.id] = tasks.filter((t) => t.status === col.id);
        return acc;
    }, {});

    return (
        <>
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
                        onContextMenu={handleContextMenu}
                        onMenuClick={handleMenuClick}
                        onAddForStatus={onAddForStatus}
                        selectedTaskIds={selectedTaskIds}
                        onToggleSelect={onToggleSelect}
                    />
                ))}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <TaskContextMenu
                    task={contextMenu.task as TaskContextMenuTask}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onViewDetails={(t) => { onTaskClick(t as Task); setContextMenu(null); }}
                    onEdit={(t) => { onEditTask(t as Task); setContextMenu(null); }}
                    onDelete={(t) => { onDeleteTask(t as Task); setContextMenu(null); }}
                    onDuplicate={(t) => { onDuplicateTask(t as Task); setContextMenu(null); }}
                    onComments={(t) => { onViewComments(t as Task); setContextMenu(null); }}
                    onStatusChange={(taskId, status) => { onStatusChange(taskId, status); setContextMenu(null); }}
                />
            )}
        </>
    );
}
