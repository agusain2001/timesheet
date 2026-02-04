"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
    getActiveTimer,
    startTimer,
    stopTimer,
    getCapacity,
    getWeeklyTimesheet,
    ActiveTimer,
    WeeklyTimeSheet,
    Capacity,
} from "@/services/time-tracking";
import { Clock, Play, Pause, Calendar, TrendingUp, Target } from "lucide-react";

export default function MyTimePage() {
    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
    const [weeklyData, setWeeklyData] = useState<WeeklyTimeSheet | null>(null);
    const [capacity, setCapacity] = useState<Capacity | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [loading, setLoading] = useState(true);

    // Load initial data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [timer, weekly, cap] = await Promise.all([
                getActiveTimer(),
                getWeeklyTimesheet(),
                getCapacity(),
            ]);
            setActiveTimer(timer);
            setWeeklyData(weekly);
            setCapacity(cap);
        } catch (error) {
            console.error("Failed to load time data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Timer elapsed time
    useEffect(() => {
        if (!activeTimer) {
            setElapsed(0);
            return;
        }

        const startTime = new Date(activeTimer.started_at).getTime();
        const updateElapsed = () => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [activeTimer]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const formatHours = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    const handleStartTimer = async () => {
        try {
            const timer = await startTimer();
            setActiveTimer(timer);
        } catch (error) {
            console.error("Failed to start timer:", error);
            alert("Failed to start timer");
        }
    };

    const handleStopTimer = async () => {
        if (!activeTimer) return;
        try {
            await stopTimer();
            setActiveTimer(null);
            loadData(); // Refresh data
        } catch (error) {
            console.error("Failed to stop timer:", error);
            alert("Failed to stop timer");
        }
    };

    // Calculate stats
    const todayHours = weeklyData?.days?.find(d => {
        const today = new Date().toISOString().split('T')[0];
        return d.date === today;
    })?.total_hours || 0;

    const weeklyHours = weeklyData?.total_hours || 0;
    const weeklyTarget = capacity?.available_hours || 40;
    const dailyTarget = 8;
    const weekProgress = Math.min((weeklyHours / weeklyTarget) * 100, 100);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">My Time</h1>
                    <p className="text-foreground/60 text-sm mt-1">
                        Track your work hours and stay productive
                    </p>
                </div>

                {/* Timer Card */}
                <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6">
                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl" />

                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Time Tracker</h2>
                            {activeTimer && (
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
                                    Recording
                                </span>
                            )}
                        </div>

                        <div className="text-center py-8">
                            <div className="text-6xl font-mono font-bold text-foreground mb-4">
                                {formatTime(elapsed)}
                            </div>
                            {activeTimer?.task_id && (
                                <p className="text-sm text-foreground/60 mb-4">
                                    Working on task
                                </p>
                            )}

                            <button
                                onClick={activeTimer ? handleStopTimer : handleStartTimer}
                                className={`px-8 py-3 rounded-xl font-medium text-lg transition-all flex items-center gap-2 mx-auto ${activeTimer
                                        ? "bg-red-500 hover:bg-red-600 text-white"
                                        : "bg-blue-500 hover:bg-blue-600 text-white"
                                    }`}
                            >
                                {activeTimer ? (
                                    <>
                                        <Pause className="w-5 h-5" />
                                        Stop Timer
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5" />
                                        Start Timer
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-foreground/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-foreground/60 mb-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">Today</span>
                        </div>
                        <p className="text-2xl font-bold">{formatHours(todayHours)}</p>
                        <p className="text-xs text-foreground/50">of {dailyTarget}h target</p>
                    </div>

                    <div className="bg-foreground/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-foreground/60 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">This Week</span>
                        </div>
                        <p className="text-2xl font-bold">{formatHours(weeklyHours)}</p>
                        <p className="text-xs text-foreground/50">of {weeklyTarget}h target</p>
                    </div>

                    <div className="bg-foreground/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-foreground/60 mb-2">
                            <Target className="w-4 h-4" />
                            <span className="text-sm">Progress</span>
                        </div>
                        <p className="text-2xl font-bold">{Math.round(weekProgress)}%</p>
                        <div className="mt-2 h-2 bg-foreground/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                                style={{ width: `${weekProgress}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-foreground/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-foreground/60 mb-2">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm">Remaining</span>
                        </div>
                        <p className="text-2xl font-bold">{formatHours(Math.max(0, weeklyTarget - weeklyHours))}</p>
                        <p className="text-xs text-foreground/50">to reach target</p>
                    </div>
                </div>

                {/* Weekly Breakdown */}
                {weeklyData?.days && weeklyData.days.length > 0 && (
                    <div className="bg-foreground/5 rounded-xl p-6">
                        <h3 className="font-semibold mb-4">Weekly Breakdown</h3>
                        <div className="grid grid-cols-7 gap-2">
                            {weeklyData.days.map((day, i) => {
                                const percent = Math.min((day.total_hours / dailyTarget) * 100, 100);
                                const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
                                const isToday = day.date === new Date().toISOString().split('T')[0];

                                return (
                                    <div key={i} className="text-center">
                                        <p className={`text-xs mb-2 ${isToday ? 'text-blue-400 font-medium' : 'text-foreground/60'}`}>
                                            {dayName}
                                        </p>
                                        <div className="h-24 bg-foreground/10 rounded-lg overflow-hidden flex flex-col justify-end">
                                            <div
                                                className={`transition-all ${isToday ? 'bg-blue-500' : 'bg-foreground/30'}`}
                                                style={{ height: `${percent}%` }}
                                            />
                                        </div>
                                        <p className="text-xs mt-2 text-foreground/60">
                                            {day.total_hours.toFixed(1)}h
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
