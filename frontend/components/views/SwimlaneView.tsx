"use client";

import { useMemo, useState, useCallback } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import TaskContextMenu, { type TaskContextMenuTask } from "@/components/views/TaskContextMenu";

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
    onEditTask: (task: Task) => void;
    onDeleteTask: (task: Task) => void;
    onDuplicateTask: (task: Task) => void;
    onViewComments: (task: Task) => void;
    onAddForLane?: (status: string) => void;
    selectedTaskIds?: Set<string>;
    onToggleSelect?: (taskId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLUMNS = [
    { id: "todo", label: "To Do", color: "bg-indigo-500" },
    { id: "in_progress", label: "In Progress", color: "bg-amber-500" },
    { id: "review", label: "Review", color: "bg-purple-500" },
    { id: "blocked", label: "Blocked", color: "bg-red-500" },
    { id: "completed", label: "Done", color: "bg-green-500" },
];

const PRIORITY_EMOJI: Record<string, string> = {
    critical: "🔴", high: "🟠", medium: "🟡", low: "🟢",
};

// ─── Mini Task Card ───────────────────────────────────────────────────────────

function MiniCard({
    task,
    onClick,
    onContextMenu,
    onMenuClick,
    isSelected,
    onToggleSelect,
    onDragStart,
    onDragEnd,
}: {
    task: Task;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent, task: Task) => void;
    onMenuClick: (e: React.MouseEvent, task: Task) => void;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onDragEnd: () => void;
}) {
    const due = task.due_date ? new Date(task.due_date) : null;
    const isOverdue = due && due < new Date() && task.status !== "completed";

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            onDragEnd={onDragEnd}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, task); }}
            className={`group p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md text-xs relative ${isSelected
                ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30"
                : task.is_blocked
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-white dark:bg-white/[0.05] border-foreground/10 hover:border-foreground/20 hover:shadow-sm"
                }`}
        >
            {/* Top row: checkbox + menu */}
            <div className="flex items-start justify-between mb-1">
                <div
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0 mt-0.5 ${isSelected
                        ? "bg-blue-500 border-blue-500"
                        : "border-foreground/20 opacity-0 group-hover:opacity-100"
                        }`}
                >
                    {isSelected && (
                        <svg viewBox="0 0 10 8" className="w-2 h-2 fill-white">
                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                    )}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onMenuClick(e, task); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-foreground/10 text-foreground/40 transition-all -mt-0.5 -mr-0.5"
                >
                    <MoreHorizontal size={11} />
                </button>
            </div>

            {/* Content */}
            <div onClick={onClick}>
                <div className="flex items-center gap-1 mb-1">
                    {task.priority && <span>{PRIORITY_EMOJI[task.priority] || ""}</span>}
                    <p className="text-foreground/80 truncate font-medium">{task.name}</p>
                </div>
                {due && (
                    <p className={`text-[10px] ${isOverdue ? "text-red-400" : "text-foreground/50"}`}>
                        {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                )}
                {task.assignee && (
                    <p className="text-[10px] text-foreground/40 mt-0.5">{task.assignee.full_name}</p>
                )}
            </div>
        </div>
    );
}

// ─── SwimlaneView ─────────────────────────────────────────────────────────────

export default function SwimlaneView({
    tasks,
    groupBy,
    onTaskClick,
    onStatusChange,
    onEditTask,
    onDeleteTask,
    onDuplicateTask,
    onViewComments,
    onAddForLane,
    selectedTaskIds = new Set(),
    onToggleSelect = () => { },
}: SwimlaneViewProps) {
    const [dragging, setDragging] = useState<{ task: Task; targetColId: string | null } | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null); // "laneKey:colId"
    const [contextMenu, setContextMenu] = useState<{ task: Task; x: number; y: number } | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
        setDragging({ task, targetColId: null });
        e.dataTransfer.effectAllowed = "move";
    }, []);

    const handleDrop = useCallback(
        async (newStatus: string) => {
            if (!dragging || dragging.task.status === newStatus) return;
            await onStatusChange(dragging.task.id, newStatus);
            setDragging(null);
            setDragOver(null);
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
            <div className="flex flex-col items-center justify-center h-64 text-foreground/50 text-sm gap-3">
                <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center text-2xl">📋</div>
                <p>No tasks to display.</p>
            </div>
        );
    }

    return (
        <>
            <div className="overflow-auto h-full">
                {/* Column headers */}
                <div className="sticky top-0 z-10 flex bg-background border-b border-foreground/10">
                    <div className="w-48 shrink-0 px-4 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider border-r border-foreground/10">
                        {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                    </div>
                    {STATUS_COLUMNS.map((col) => (
                        <div key={col.id} className="flex-1 min-w-[160px] px-3 py-3 border-r border-foreground/10">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                                <span className="text-xs font-semibold text-foreground/60">{col.label}</span>
                                <span className="text-xs text-foreground/30">
                                    {tasks.filter(t => t.status === col.id).length}
                                </span>
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
                        <div key={key} className="flex border-b border-foreground/5 min-h-[80px]">
                            {/* Lane label */}
                            <div className="w-48 shrink-0 flex items-start gap-2 px-4 py-3 border-r border-foreground/10 bg-foreground/[0.01]">
                                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                                    {lane.label.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground/80 truncate">{lane.label}</p>
                                    <p className="text-xs text-foreground/50">{totalInLane} task{totalInLane !== 1 ? "s" : ""}</p>
                                </div>
                            </div>

                            {/* Status columns */}
                            {STATUS_COLUMNS.map((col) => {
                                const colKey = `${key}:${col.id}`;
                                const isOver = dragOver === colKey;
                                const colTasks = tasksByStatus[col.id] || [];
                                return (
                                    <div
                                        key={col.id}
                                        className={`flex-1 min-w-[160px] p-2 border-r border-foreground/5 space-y-1.5 transition-colors ${isOver ? "bg-blue-500/5" : ""
                                            }`}
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(colKey); }}
                                        onDragLeave={() => setDragOver(null)}
                                        onDrop={() => { handleDrop(col.id); }}
                                    >
                                        {colTasks.map((task) => (
                                            <MiniCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => onTaskClick(task)}
                                                onContextMenu={handleContextMenu}
                                                onMenuClick={handleMenuClick}
                                                isSelected={selectedTaskIds.has(task.id)}
                                                onToggleSelect={onToggleSelect}
                                                onDragStart={handleDragStart}
                                                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                                            />
                                        ))}
                                        {isOver && (
                                            <div className="h-10 rounded-lg border-2 border-dashed border-blue-500/30 flex items-center justify-center">
                                                <span className="text-[10px] text-blue-400">Drop here</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
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
