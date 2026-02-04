"use client";

import { useState, useEffect, useMemo } from "react";
import { getTasks, Task, TaskStatus } from "@/services/tasks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Icons ===============

const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

// =============== Types ===============

interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    type: "task" | "milestone" | "meeting";
    priority?: string;
    status?: TaskStatus;
    project?: string;
}

// =============== Helper Functions ===============

const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
};

const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const priorityColors: Record<string, string> = {
    low: "bg-gray-500",
    medium: "bg-blue-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
};

const statusColors: Record<string, string> = {
    completed: "border-l-emerald-500",
    in_progress: "border-l-blue-500",
    todo: "border-l-gray-400",
    blocked: "border-l-red-500",
    review: "border-l-purple-500",
};

// =============== Components ===============

interface CalendarDayProps {
    day: number | null;
    isToday: boolean;
    isCurrentMonth: boolean;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onDayClick: (date: string) => void;
    dateString: string;
}

function CalendarDay({ day, isToday, isCurrentMonth, events, onEventClick, onDayClick, dateString }: CalendarDayProps) {
    if (day === null) {
        return <div className="h-32 bg-foreground/[0.02]" />;
    }

    const maxVisibleEvents = 3;
    const visibleEvents = events.slice(0, maxVisibleEvents);
    const hiddenCount = events.length - maxVisibleEvents;

    return (
        <div
            className={`h-32 border-b border-r border-foreground/10 p-1 transition-colors hover:bg-foreground/5 cursor-pointer ${isCurrentMonth ? "bg-background" : "bg-foreground/[0.02]"
                }`}
            onClick={() => onDayClick(dateString)}
        >
            <div className="flex items-center justify-between mb-1">
                <span
                    className={`w-7 h-7 flex items-center justify-center text-sm rounded-full ${isToday
                            ? "bg-blue-600 text-white font-bold"
                            : isCurrentMonth
                                ? "text-foreground"
                                : "text-foreground/30"
                        }`}
                >
                    {day}
                </span>
                {events.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                )}
            </div>

            <div className="space-y-0.5 overflow-hidden">
                {visibleEvents.map((event) => (
                    <div
                        key={event.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                        }}
                        className={`px-1.5 py-0.5 text-xs rounded truncate cursor-pointer transition-colors border-l-2 ${statusColors[event.status || "todo"] || "border-l-gray-400"
                            } ${event.type === "milestone"
                                ? "bg-purple-500/20 text-purple-300"
                                : event.type === "meeting"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-foreground/10 text-foreground/80 hover:bg-foreground/20"
                            }`}
                    >
                        {event.title}
                    </div>
                ))}
                {hiddenCount > 0 && (
                    <div className="px-1.5 py-0.5 text-xs text-foreground/50">
                        +{hiddenCount} more
                    </div>
                )}
            </div>
        </div>
    );
}

interface EventDetailPopupProps {
    event: CalendarEvent | null;
    onClose: () => void;
}

function EventDetailPopup({ event, onClose }: EventDetailPopupProps) {
    if (!event) return null;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-background border border-foreground/10 rounded-xl shadow-2xl z-50 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-foreground/10 rounded"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-foreground/50">Date:</span>
                        <span className="text-foreground">{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    {event.project && (
                        <div className="flex items-center gap-2">
                            <span className="text-foreground/50">Project:</span>
                            <span className="text-foreground">{event.project}</span>
                        </div>
                    )}
                    {event.priority && (
                        <div className="flex items-center gap-2">
                            <span className="text-foreground/50">Priority:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs text-white ${priorityColors[event.priority]}`}>
                                {event.priority}
                            </span>
                        </div>
                    )}
                    {event.status && (
                        <div className="flex items-center gap-2">
                            <span className="text-foreground/50">Status:</span>
                            <span className="text-foreground capitalize">{event.status.replace(/_/g, " ")}</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        View Details
                    </button>
                    <button className="px-3 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg text-sm font-medium transition-colors">
                        Edit
                    </button>
                </div>
            </div>
        </>
    );
}

// =============== Main Component ===============

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"month" | "week">("month");
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    useEffect(() => {
        async function fetchTasks() {
            try {
                setLoading(true);
                const data = await getTasks({});
                setTasks(data);
            } catch (error) {
                console.error("Failed to fetch tasks:", error);
                // Mock data for demo
                const mockTasks: Task[] = Array.from({ length: 15 }, (_, i) => ({
                    id: `task-${i}`,
                    name: `Task ${i + 1}`,
                    description: `Description for task ${i + 1}`,
                    task_type: "project" as const,
                    priority: (["low", "medium", "high", "urgent"] as const)[i % 4],
                    status: (["todo", "in_progress", "completed", "review"] as const)[i % 4],
                    due_date: new Date(year, month, Math.floor(Math.random() * 28) + 1).toISOString(),
                    actual_hours: 0,
                    order: i,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    project: { id: `p${i % 3}`, name: ["Frontend", "Backend", "DevOps"][i % 3] },
                }));
                setTasks(mockTasks);
            } finally {
                setLoading(false);
            }
        }

        fetchTasks();
    }, [year, month]);

    // Convert tasks to calendar events
    const events = useMemo<CalendarEvent[]>(() => {
        return tasks
            .filter((task) => task.due_date)
            .map((task) => ({
                id: task.id,
                title: task.name,
                date: task.due_date!.split("T")[0],
                type: "task" as const,
                priority: task.priority,
                status: task.status,
                project: task.project?.name,
            }));
    }, [tasks]);

    // Group events by date
    const eventsByDate = useMemo(() => {
        const grouped: Record<string, CalendarEvent[]> = {};
        events.forEach((event) => {
            if (!grouped[event.date]) {
                grouped[event.date] = [];
            }
            grouped[event.date].push(event);
        });
        return grouped;
    }, [events]);

    // Generate calendar grid
    const calendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const daysInPrevMonth = getDaysInMonth(year, month - 1);

        const days: Array<{ day: number | null; isCurrentMonth: boolean; dateString: string }> = [];

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            days.push({
                day,
                isCurrentMonth: false,
                dateString: formatDate(prevYear, prevMonth, day),
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                dateString: formatDate(year, month, i),
            });
        }

        // Next month days
        const remainingDays = 42 - days.length; // 6 weeks * 7 days
        for (let i = 1; i <= remainingDays; i++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            days.push({
                day: i,
                isCurrentMonth: false,
                dateString: formatDate(nextYear, nextMonth, i),
            });
        }

        return days;
    }, [year, month]);

    const today = new Date();
    const todayString = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

    const navigateMonth = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const handleDayClick = (date: string) => {
        console.log("Day clicked:", date);
        // Could open a modal to add a new task on this date
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
                        <p className="text-foreground/60 mt-1">View and manage your schedule</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-foreground/5 rounded-lg p-1">
                            <button
                                onClick={() => setView("month")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "month"
                                        ? "bg-foreground/10 text-foreground"
                                        : "text-foreground/60 hover:text-foreground"
                                    }`}
                            >
                                Month
                            </button>
                            <button
                                onClick={() => setView("week")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "week"
                                        ? "bg-foreground/10 text-foreground"
                                        : "text-foreground/60 hover:text-foreground"
                                    }`}
                            >
                                Week
                            </button>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <PlusIcon />
                            Add Event
                        </button>
                    </div>
                </div>

                {/* Calendar Navigation */}
                <div className="flex items-center justify-between p-4 bg-background border border-foreground/10 rounded-xl">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                        >
                            <ChevronLeftIcon />
                        </button>
                        <h2 className="text-xl font-bold text-foreground min-w-[200px] text-center">
                            {monthNames[month]} {year}
                        </h2>
                        <button
                            onClick={() => navigateMonth(1)}
                            className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                        >
                            <ChevronRightIcon />
                        </button>
                    </div>
                    <button
                        onClick={goToToday}
                        className="px-4 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-sm font-medium transition-colors"
                    >
                        Today
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="bg-background border border-foreground/10 rounded-xl overflow-hidden">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-foreground/10">
                        {dayNames.map((day) => (
                            <div
                                key={day}
                                className="py-3 text-center text-sm font-medium text-foreground/60"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((dayInfo, idx) => (
                            <CalendarDay
                                key={idx}
                                day={dayInfo.day}
                                isToday={dayInfo.dateString === todayString}
                                isCurrentMonth={dayInfo.isCurrentMonth}
                                events={eventsByDate[dayInfo.dateString] || []}
                                onEventClick={setSelectedEvent}
                                onDayClick={handleDayClick}
                                dateString={dayInfo.dateString}
                            />
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 p-4 bg-background border border-foreground/10 rounded-xl text-sm">
                    <span className="text-foreground/60">Legend:</span>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-foreground/70">Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-foreground/70">In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <span className="text-foreground/70">To Do</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-foreground/70">Blocked</span>
                    </div>
                </div>

                {/* Events Summary */}
                <div className="p-4 bg-background border border-foreground/10 rounded-xl">
                    <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">
                        This Month
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-foreground/5">
                            <p className="text-2xl font-bold text-foreground">{events.length}</p>
                            <p className="text-sm text-foreground/50">Total Events</p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/10">
                            <p className="text-2xl font-bold text-emerald-400">
                                {events.filter((e) => e.status === "completed").length}
                            </p>
                            <p className="text-sm text-foreground/50">Completed</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/10">
                            <p className="text-2xl font-bold text-blue-400">
                                {events.filter((e) => e.status === "in_progress").length}
                            </p>
                            <p className="text-sm text-foreground/50">In Progress</p>
                        </div>
                        <div className="p-3 rounded-lg bg-red-500/10">
                            <p className="text-2xl font-bold text-red-400">
                                {events.filter((e) => new Date(e.date) < today && e.status !== "completed").length}
                            </p>
                            <p className="text-sm text-foreground/50">Overdue</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Detail Popup */}
            <EventDetailPopup event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </DashboardLayout>
    );
}
