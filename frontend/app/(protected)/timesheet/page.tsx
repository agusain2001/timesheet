"use client";

import { useState, useEffect } from "react";
import {
    getActiveTimer,
    startTimer,
    stopTimer,
    getCapacity,
    getWeeklyTimesheet,
    TimerSession,
    WeeklyTimeSheet,
} from "@/services/time-tracking";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Icons ===============

const PlayIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
    </svg>
);

const StopIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 6h12v12H6z" />
    </svg>
);

const PauseIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

// =============== Components ===============

interface TimerDisplayProps {
    timer: TimerSession | null;
    onStart: () => void;
    onStop: () => void;
}

function TimerDisplay({ timer, onStart, onStop }: TimerDisplayProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!timer) {
            setElapsed(0);
            return;
        }

        const startTime = new Date(timer.start_time).getTime();
        const updateElapsed = () => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6">
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Time Tracker</h2>
                    {timer && (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
                            Recording
                        </span>
                    )}
                </div>

                <div className="text-center mb-6">
                    <p className="text-5xl font-mono font-bold text-foreground mb-2">
                        {formatTime(elapsed)}
                    </p>
                    {timer && timer.task_id && (
                        <p className="text-sm text-foreground/60">
                            Working on: <span className="text-foreground">{timer.task_id}</span>
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-center gap-3">
                    {!timer ? (
                        <button
                            onClick={onStart}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-600/30"
                        >
                            <PlayIcon />
                            Start Timer
                        </button>
                    ) : (
                        <button
                            onClick={onStop}
                            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-600/30"
                        >
                            <StopIcon />
                            Stop Timer
                        </button>
                    )}
                    <button className="p-3 bg-foreground/10 hover:bg-foreground/20 rounded-xl transition-colors">
                        <PlusIcon />
                    </button>
                </div>
            </div>
        </div>
    );
}

interface DayColumnProps {
    day: {
        date: string;
        day_name: string;
        total_hours: number;
        entries: Array<{
            task_id?: string;
            task_name?: string;
            project_name?: string;
            hours: number;
            description?: string;
        }>;
    };
    isToday: boolean;
}

function DayColumn({ day, isToday }: DayColumnProps) {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.getDate();
    };

    return (
        <div className={`flex flex-col rounded-xl border transition-colors ${isToday ? "border-blue-500/50 bg-blue-500/5" : "border-foreground/10 bg-background"
            }`}>
            {/* Day Header */}
            <div className={`p-3 border-b ${isToday ? "border-blue-500/30" : "border-foreground/10"}`}>
                <div className="text-center">
                    <p className={`text-xs uppercase ${isToday ? "text-blue-400" : "text-foreground/50"}`}>
                        {day.day_name}
                    </p>
                    <p className={`text-2xl font-bold ${isToday ? "text-blue-400" : "text-foreground"}`}>
                        {formatDate(day.date)}
                    </p>
                </div>
            </div>

            {/* Entries */}
            <div className="flex-1 p-2 space-y-1 min-h-[200px]">
                {day.entries.map((entry, idx) => (
                    <div
                        key={idx}
                        className="p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 cursor-pointer transition-colors"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">{entry.hours}h</span>
                        </div>
                        {entry.task_name && (
                            <p className="text-xs text-foreground/70 truncate">{entry.task_name}</p>
                        )}
                        {entry.project_name && (
                            <p className="text-xs text-foreground/40 truncate">{entry.project_name}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className={`p-3 border-t ${isToday ? "border-blue-500/30" : "border-foreground/10"}`}>
                <div className="text-center">
                    <p className={`text-lg font-bold ${day.total_hours >= 8 ? "text-emerald-400" : "text-foreground"
                        }`}>
                        {day.total_hours}h
                    </p>
                </div>
            </div>
        </div>
    );
}

interface CapacityCardProps {
    title: string;
    current: number;
    capacity: number;
    unit?: string;
}

function CapacityCard({ title, current, capacity, unit = "h" }: CapacityCardProps) {
    const percentage = Math.min((current / capacity) * 100, 100);
    const isOver = current > capacity;

    return (
        <div className="p-4 rounded-xl border border-foreground/10 bg-background">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-foreground/60">{title}</span>
                <span className={`text-sm font-medium ${isOver ? "text-red-400" : "text-foreground"}`}>
                    {current}{unit} / {capacity}{unit}
                </span>
            </div>
            <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${isOver ? "bg-red-500" :
                        percentage >= 80 ? "bg-emerald-500" :
                            percentage >= 50 ? "bg-blue-500" :
                                "bg-gray-500"
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {isOver && (
                <p className="text-xs text-red-400 mt-1">
                    {current - capacity}{unit} over capacity
                </p>
            )}
        </div>
    );
}

// =============== Main Component ===============

export default function TimesheetPage() {
    const [activeTimer, setActiveTimer] = useState<TimerSession | null>(null);
    const [weeklyData, setWeeklyData] = useState<WeeklyTimeSheet | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentWeek, setCurrentWeek] = useState<Date>(new Date());

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [activeTimerData, weekly] = await Promise.all([
                    getActiveTimer().catch(() => null),
                    getWeeklyTimesheet(currentWeek.toISOString().split("T")[0]).catch(() => null),
                ]);
                // Convert ActiveTimer to TimerSession format
                if (activeTimerData) {
                    setActiveTimer({
                        id: activeTimerData.id,
                        task_id: activeTimerData.task_id,
                        project_id: activeTimerData.project_id,
                        start_time: activeTimerData.started_at,
                        notes: activeTimerData.notes,
                    });
                } else {
                    setActiveTimer(null);
                }
                setWeeklyData(weekly);
            } catch (error) {
                console.error("Failed to fetch timesheet data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [currentWeek]);

    useEffect(() => {
        // Set mock data for demo
        if (!weeklyData) {
            const today = new Date();
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const mockDays = [];

            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - today.getDay() + i);
                mockDays.push({
                    date: date.toISOString().split("T")[0],
                    day_name: days[i],
                    total_hours: i === 0 || i === 6 ? 0 : Math.floor(Math.random() * 4) + 5,
                    entries: i === 0 || i === 6 ? [] : [
                        { task_name: "API Development", project_name: "Backend", hours: 3 },
                        { task_name: "Code Review", project_name: "Backend", hours: 2 },
                        { task_name: "Meetings", hours: 1 },
                    ],
                });
            }

            setWeeklyData({
                week_start: mockDays[0].date,
                week_end: mockDays[6].date,
                total_hours: mockDays.reduce((sum, d) => sum + d.total_hours, 0),
                expected_hours: 40,
                days: mockDays,
            });
        }
    }, [weeklyData]);

    const handleStartTimer = async () => {
        try {
            const activeTimerData = await startTimer();
            setActiveTimer({
                id: activeTimerData.id,
                task_id: activeTimerData.task_id,
                project_id: activeTimerData.project_id,
                start_time: activeTimerData.started_at,
                notes: activeTimerData.notes,
            });
        } catch (error) {
            console.error("Failed to start timer:", error);
            // Mock for demo
            setActiveTimer({
                id: "mock",
                start_time: new Date().toISOString(),
            });
        }
    };

    const handleStopTimer = async () => {
        if (!activeTimer) return;
        try {
            await stopTimer();
            setActiveTimer(null);
        } catch (error) {
            console.error("Failed to stop timer:", error);
            setActiveTimer(null);
        }
    };

    const navigateWeek = (direction: number) => {
        const newDate = new Date(currentWeek);
        newDate.setDate(newDate.getDate() + direction * 7);
        setCurrentWeek(newDate);
    };

    if (loading && !weeklyData) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                </div>
            </DashboardLayout>
        );
    }

    const today = new Date().toISOString().split("T")[0];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Timesheet</h1>
                        <p className="text-foreground/60 mt-1">Track your work hours and manage time entries</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="px-4 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-sm font-medium transition-colors">
                            Export
                        </button>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <PlusIcon />
                            Add Entry
                        </button>
                    </div>
                </div>

                {/* Timer and Capacity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <TimerDisplay
                        timer={activeTimer}
                        onStart={handleStartTimer}
                        onStop={handleStopTimer}
                    />
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CapacityCard
                                title="This Week"
                                current={weeklyData?.total_hours || 0}
                                capacity={40}
                            />
                            <CapacityCard
                                title="Today"
                                current={weeklyData?.days.find(d => d.date === today)?.total_hours || 0}
                                capacity={8}
                            />
                        </div>
                        <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                        <ClockIcon />
                                    </div>
                                    <div>
                                        <p className="text-sm text-foreground/60">Average per day</p>
                                        <p className="text-xl font-bold text-foreground">
                                            {weeklyData ? (weeklyData.total_hours / 5).toFixed(1) : 0}h
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                        <CalendarIcon />
                                    </div>
                                    <div>
                                        <p className="text-sm text-foreground/60">Remaining this week</p>
                                        <p className="text-xl font-bold text-foreground">
                                            {weeklyData ? Math.max(40 - weeklyData.total_hours, 0) : 40}h
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Weekly View */}
                <div className="rounded-xl border border-foreground/10 bg-background p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">Weekly Overview</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigateWeek(-1)}
                                className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="px-4 py-2 bg-foreground/5 rounded-lg text-sm font-medium">
                                {weeklyData?.week_start && new Date(weeklyData.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                {" - "}
                                {weeklyData?.week_end && new Date(weeklyData.week_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <button
                                onClick={() => navigateWeek(1)}
                                className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setCurrentWeek(new Date())}
                                className="px-3 py-2 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            >
                                Today
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {weeklyData?.days.map((day) => (
                            <DayColumn
                                key={day.date}
                                day={day}
                                isToday={day.date === today}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
