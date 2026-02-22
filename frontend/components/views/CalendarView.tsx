"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

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
}

// ─── Priority colours ─────────────────────────────────────────────────────────

const PRI_BG: Record<string, string> = {
    critical: "bg-red-600",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-green-600",
    default: "bg-indigo-600",
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

export default function CalendarView({ tasks, onTaskClick, onDateClick }: CalendarViewProps) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prev = () => {
        if (month === 0) { setYear(year - 1); setMonth(11); }
        else setMonth(month - 1);
    };
    const next = () => {
        if (month === 11) { setYear(year + 1); setMonth(0); }
        else setMonth(month + 1);
    };

    // Map tasks by day
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

    // Build grid cells (leading empties + days)
    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-slate-200">
                    {MONTHS[month]} {year}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={prev}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}
                        className="px-3 py-1.5 rounded-lg text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={next}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-white/5">
                {DAYS.map((d) => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                {cells.map((day, idx) => {
                    const dayTasks = day ? (tasksByDay[day] || []) : [];
                    const isToday = isCurrentMonth && day === today;
                    const dateForClick = day ? new Date(year, month, day) : null;

                    return (
                        <div
                            key={idx}
                            onClick={() => dateForClick && onDateClick(dateForClick)}
                            className={`min-h-[100px] p-2 border-b border-r border-white/5 cursor-pointer transition-colors group ${day ? "hover:bg-white/3" : "bg-white/1"
                                } ${isToday ? "bg-indigo-950/30" : ""}`}
                        >
                            {day && (
                                <>
                                    {/* Day number */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday
                                                    ? "bg-indigo-500 text-white"
                                                    : "text-slate-400 group-hover:text-slate-200"
                                                }`}
                                        >
                                            {day}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDateClick(new Date(year, month, day)); }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-indigo-400"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>

                                    {/* Task chips */}
                                    <div className="space-y-0.5">
                                        {dayTasks.slice(0, 3).map((t) => (
                                            <div
                                                key={t.id}
                                                onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                                                className={`px-1.5 py-0.5 rounded text-[10px] text-white truncate cursor-pointer hover:opacity-80 transition-opacity ${PRI_BG[t.priority || "default"] || PRI_BG.default
                                                    }`}
                                                title={t.name}
                                            >
                                                {t.name}
                                            </div>
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <div className="text-[10px] text-slate-500 pl-1">
                                                +{dayTasks.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
