"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import TaskContextMenu, { type TaskContextMenuTask } from "@/components/views/TaskContextMenu";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
    id: string;
    name: string;
    status: string;
    priority?: string;
    due_date?: string;
    start_date?: string;
    assignee?: { id: string; full_name: string };
}

interface CalendarViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onDateClick: (date: Date) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (task: Task) => void;
    onTaskDateChange?: (taskId: string, newDate: string) => Promise<void>;
}

// ─── Priority colours ─────────────────────────────────────────────────────────

const PRI_BG: Record<string, string> = {
    critical: "bg-red-600",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-green-600",
    default: "bg-blue-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Calendar View ────────────────────────────────────────────────────────────

export default function CalendarView({
    tasks,
    onTaskClick,
    onDateClick,
    onEditTask,
    onDeleteTask,
    onTaskDateChange,
}: CalendarViewProps) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [contextMenu, setContextMenu] = useState<{ task: Task; x: number; y: number } | null>(null);
    const [dragTask, setDragTask] = useState<Task | null>(null);
    const [dragOverDay, setDragOverDay] = useState<number | null>(null);

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prev = () => { if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1); };
    const next = () => { if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1); };

    const tasksByDay = useMemo(() => {
        const map: Record<number, Task[]> = {};
        tasks.forEach((t) => {
            const dateStr = t.due_date || t.start_date;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const day = d.getDate();
                if (!map[day]) map[day] = [];
                map[day].push(t);
            }
        });
        return map;
    }, [tasks, year, month]);

    const today = now.getDate();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const handleContextMenu = useCallback((e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ task, x: e.clientX, y: e.clientY });
    }, []);

    const handleTaskDragStart = useCallback((e: React.DragEvent, task: Task) => {
        setDragTask(task);
        e.dataTransfer.effectAllowed = "move";
        e.stopPropagation();
    }, []);

    const handleDayDrop = useCallback(async (day: number) => {
        if (!dragTask || !onTaskDateChange) return;
        const newDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        await onTaskDateChange(dragTask.id, newDate);
        setDragTask(null);
        setDragOverDay(null);
    }, [dragTask, year, month, onTaskDateChange]);

    return (
        <>
            <div className="flex flex-col h-full bg-background rounded-2xl border border-foreground/10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
                    <h2 className="text-lg font-semibold text-foreground">{MONTHS[month]} {year}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={prev} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}
                            className="px-3 py-1.5 rounded-lg text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                        >
                            Today
                        </button>
                        <button onClick={next} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-foreground/5">
                    {DAYS.map((d) => (
                        <div key={d} className="py-2 text-center text-xs font-medium text-foreground/50 uppercase tracking-wider">{d}</div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                    {cells.map((day, idx) => {
                        const dayTasks = day ? (tasksByDay[day] || []) : [];
                        const isToday = isCurrentMonth && day === today;
                        const isDragOver = dragOverDay === day;

                        return (
                            <div
                                key={idx}
                                onClick={() => day && onDateClick(new Date(year, month, day))}
                                onDragOver={(e) => { if (day && dragTask) { e.preventDefault(); setDragOverDay(day); } }}
                                onDragLeave={() => setDragOverDay(null)}
                                onDrop={() => { if (day) handleDayDrop(day); }}
                                className={`min-h-[100px] p-2 border-b border-r border-foreground/5 cursor-pointer transition-colors group ${day ? "hover:bg-foreground/[0.01]" : "bg-white/1"
                                    } ${isToday ? "bg-blue-950/30" : ""} ${isDragOver ? "bg-blue-500/10 border-blue-500/30" : ""}`}
                            >
                                {day && (
                                    <>
                                        {/* Day number + add button */}
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-500 text-white" : "text-foreground/60 group-hover:text-foreground"
                                                }`}>
                                                {day}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDateClick(new Date(year, month, day)); }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground/50 hover:text-blue-400 p-0.5 rounded hover:bg-blue-400/10"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>

                                        {/* Task chips */}
                                        <div className="space-y-0.5">
                                            {dayTasks.slice(0, 3).map((t) => (
                                                <div
                                                    key={t.id}
                                                    draggable
                                                    onDragStart={(e) => handleTaskDragStart(e, t)}
                                                    onDragEnd={() => { setDragTask(null); setDragOverDay(null); }}
                                                    onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                                                    onContextMenu={(e) => handleContextMenu(e, t)}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] text-white truncate cursor-pointer hover:opacity-90 transition-all active:scale-95 ${PRI_BG[t.priority || "default"] || PRI_BG.default
                                                        } ${t.status === "completed" ? "opacity-60 line-through" : ""}`}
                                                    title={`${t.name} — right-click for options`}
                                                >
                                                    {t.name}
                                                </div>
                                            ))}
                                            {dayTasks.length > 3 && (
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); onDateClick(new Date(year, month, day)); }}
                                                    className="text-[10px] text-blue-400 pl-1 hover:underline cursor-pointer"
                                                >
                                                    +{dayTasks.length - 3} more
                                                </div>
                                            )}
                                        </div>

                                        {/* Drop indicator */}
                                        {isDragOver && (
                                            <div className="mt-1 h-5 rounded border-2 border-dashed border-blue-500/50 flex items-center justify-center">
                                                <span className="text-[9px] text-blue-400">Move here</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
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
                    onDuplicate={() => setContextMenu(null)}
                    onComments={() => setContextMenu(null)}
                />
            )}
        </>
    );
}
