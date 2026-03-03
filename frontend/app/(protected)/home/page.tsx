"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPersonalDashboard, type PersonalDashboard } from "@/services/dashboard";
import { getToken } from "@/lib/auth";
import AddTaskModal from "@/components/AddTaskModal";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ============ Helper ============

function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0 && m === 0) return "NA";
    return `${h} hour ${m}min`;
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return iso;
    }
}

function formatTimestamp(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        return isToday ? `Today, ${time}` : `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, ${time}`;
    } catch {
        return iso;
    }
}

function statusLabel(status: string): string {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(status: string): string {
    const m: Record<string, string> = {
        in_progress: "#3b82f6",
        completed: "#22c55e",
        review: "#eab308",
        todo: "#6b7280",
        blocked: "#ef4444",
        on_hold: "#f97316",
        draft: "#6b7280",
        archived: "#9ca3af",
    };
    return m[status] || "#6b7280";
}

// ============ Cards ============

interface StatCardProps {
    label: string;
    value: number | string;
    color: string;
    href: string;
}

function StatCard({ label, value, color, href }: StatCardProps) {
    return (
        <Link
            href={href}
            className="relative flex flex-col justify-between rounded-xl p-5 min-h-[110px] overflow-hidden transition hover:scale-[1.02] hover:shadow-lg cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`, border: `1px solid ${color}30` }}
        >
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color }}>{label}</span>
            <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-bold text-foreground">{value}</span>
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: `${color}20` }}
                >
                    <svg className="w-4 h-4" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    );
}

// ============ Sections ============

function UpcomingDeadlinesSection({ deadlines }: { deadlines: PersonalDashboard["upcoming_deadlines"] }) {
    const empty = deadlines.length === 0;
    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-foreground mb-4">Upcoming Deadlines</h3>
            {empty ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                    <p className="font-semibold text-foreground/80">No deadlines to show</p>
                    <p className="text-xs text-foreground/50 mt-1">Tasks with due dates will appear here automatically.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-foreground/50 text-xs uppercase tracking-wider">
                                <th className="text-left pb-3 font-medium">Task</th>
                                <th className="text-left pb-3 font-medium">Project Name</th>
                                <th className="text-left pb-3 font-medium">Due Date</th>
                                <th className="text-left pb-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deadlines.map((d) => (
                                <tr key={d.task_id} className="border-t border-foreground/5">
                                    <td className="py-3 text-foreground/90">{d.task_name}</td>
                                    <td className="py-3 text-foreground/70">{d.project_name || "—"}</td>
                                    <td className="py-3 text-foreground/70">{formatDate(d.due_date)}</td>
                                    <td className="py-3">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            In Progress
                                            <svg className="w-3 h-3 ml-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
                                            </svg>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function TaskStatusSection({ tasksByStatus }: { tasksByStatus: Record<string, number> }) {
    const total = Object.values(tasksByStatus).reduce((a, b) => a + b, 0);
    const empty = total === 0;

    const statusOrder = ["in_progress", "on_hold", "draft", "completed", "archived", "todo", "review", "blocked"];
    const sortedEntries = Object.entries(tasksByStatus).sort(
        ([a], [b]) => (statusOrder.indexOf(a) === -1 ? 99 : statusOrder.indexOf(a)) - (statusOrder.indexOf(b) === -1 ? 99 : statusOrder.indexOf(b))
    );

    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-foreground mb-4">My Task&apos;s Status</h3>
            {empty ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                    <p className="font-semibold text-foreground/80">No task status data yet</p>
                    <p className="text-xs text-foreground/50 mt-1">Task status distribution will appear once tasks are assigned.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedEntries.map(([status, count]) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                            <div key={status} className="flex items-center gap-3">
                                <span className="text-xs text-foreground/70 w-24 shrink-0">{statusLabel(status)}</span>
                                <div className="flex-1 h-2 rounded-full bg-foreground/10 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: statusColor(status) }} />
                                </div>
                                <span className="text-xs text-foreground/50 w-10 text-right">{pct}%</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function RecentActivitySection({ activities }: { activities: PersonalDashboard["recent_activity"] }) {
    const empty = activities.length === 0;
    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
            {empty ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                    <p className="font-semibold text-foreground/80">No activity to show</p>
                    <p className="text-xs text-foreground/50 mt-1">Project updates, task changes, and notifications will appear here.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-foreground/50 text-xs uppercase tracking-wider">
                                <th className="text-left pb-3 font-medium">Activity</th>
                                <th className="text-left pb-3 font-medium">Source</th>
                                <th className="text-left pb-3 font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activities.map((a) => (
                                <tr key={a.id} className="border-t border-foreground/5">
                                    <td className="py-3">
                                        <p className="text-foreground/90 font-medium text-xs">{a.type === "task_completed" ? "Task completed" : a.type === "task_created" ? "Task created" : a.type}</p>
                                        <p className="text-foreground/50 text-xs mt-0.5">{a.message}</p>
                                    </td>
                                    <td className="py-3">
                                        <span className="text-xs text-foreground/50">System</span>
                                    </td>
                                    <td className="py-3 text-xs text-foreground/50 whitespace-nowrap">
                                        {formatTimestamp(a.timestamp)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function TimeStatusSection({ hoursToday, hoursWeek }: { hoursToday: number; hoursWeek: number }) {
    const todayDisplay = hoursToday > 0 ? formatHours(hoursToday) : "NA";
    const weekDisplay = hoursWeek > 0 ? formatHours(hoursWeek) : "NA";

    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-foreground mb-4">My Task&apos;s Status</h3>
            <div className="space-y-3">
                {/* Today */}
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
                    <span className="text-xs text-foreground/50">Today</span>
                    <div className="flex items-center justify-between mt-1">
                        <div>
                            <p className="text-2xl font-bold text-foreground">{todayDisplay}</p>
                            <p className="text-[11px] text-foreground/40 mt-0.5">of 8 hour daily</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/my-time" className="text-xs text-foreground/60 border border-foreground/15 rounded-full px-3 py-1 hover:bg-foreground/5 transition">
                                View My Time &gt;
                            </Link>
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer hover:bg-blue-500 transition">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                {/* This Week */}
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
                    <span className="text-xs text-foreground/50">This Week</span>
                    <div className="flex items-center justify-between mt-1">
                        <div>
                            <p className="text-2xl font-bold text-foreground">{weekDisplay}</p>
                            <p className="text-[11px] text-foreground/40 mt-0.5">of 40 hour weekly work</p>
                        </div>
                        <Link href="/my-time" className="text-xs text-foreground/60 border border-foreground/15 rounded-full px-3 py-1 hover:bg-foreground/5 transition">
                            View My Time &gt;
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============ Loading Skeleton ============

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-foreground/10 rounded ${className || ""}`} />;
}

function HomeSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72 mt-2" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                    <Skeleton className="h-10 w-28 rounded-lg" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <Skeleton className="h-64 rounded-xl lg:col-span-3" />
                <Skeleton className="h-64 rounded-xl lg:col-span-2" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <Skeleton className="h-64 rounded-xl lg:col-span-3" />
                <Skeleton className="h-64 rounded-xl lg:col-span-2" />
            </div>
        </div>
    );
}

// ============ Main Page ============

export default function HomePage() {
    const router = useRouter();
    const [data, setData] = useState<PersonalDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddTask, setShowAddTask] = useState(false);

    const fetchDashboard = useCallback(() => {
        const token = getToken();
        if (!token) {
            router.push("/login?redirect=/home");
            return;
        }

        getPersonalDashboard()
            .then((d) => {
                setData(d);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Dashboard fetch error:", err);
                // Redirect to login on 401
                if (err?.status === 401 || err?.message?.includes("Not authenticated")) {
                    router.push("/login?redirect=/home");
                    return;
                }
                setError("Failed to load dashboard data");
                setLoading(false);
            });
    }, [router]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    if (loading) return <HomeSkeleton />;

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-foreground/60 text-sm">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const dashboard = data!;

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Welcome!</h1>
                    <p className="text-sm text-foreground/50 mt-1">Here&apos;s what&apos;s happening with your work today.</p>
                </div>
                <div className="flex gap-3">
                    <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">
                        This Month
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <button onClick={() => setShowAddTask(true)} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Task
                    </button>
                </div>
            </div>

            {/* How It Works */}
            <HowItWorks
                pageKey="home"
                description="Your personal dashboard shows tasks assigned to you, upcoming deadlines, and your logged hours — all in one place."
                bullets={[
                    "Stat cards at the top are clickable — they filter your tasks by status.",
                    "Upcoming Deadlines shows tasks due within the next 7 days, sorted by due date.",
                    "Recent Activity logs the latest changes to your tasks and projects.",
                    "The time tracker shows hours logged today and this week vs your target.",
                    "Click Add Task to quickly create a new task from this dashboard.",
                ]}
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="My Tasks" value={dashboard.my_tasks_count ?? "NA"} color="#3b82f6" href="/tasks/all" />
                <StatCard label="Due Tasks" value={dashboard.due_tasks_count ?? "NA"} color="#6366f1" href="/tasks/due" />
                <StatCard label="Completed Tasks" value={dashboard.completed_tasks_count ?? "NA"} color="#06b6d4" href="/tasks/completed" />
                <StatCard label="Overdue" value={dashboard.overdue_tasks_count ?? "NA"} color="#ef4444" href="/tasks/overdue" />
            </div>

            {/* Upcoming Deadlines + Task Status */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                    <UpcomingDeadlinesSection deadlines={dashboard.upcoming_deadlines} />
                </div>
                <div className="lg:col-span-2">
                    <TaskStatusSection tasksByStatus={dashboard.tasks_by_status} />
                </div>
            </div>

            {/* Recent Activity + Time Status */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                    <RecentActivitySection activities={dashboard.recent_activity} />
                </div>
                <div className="lg:col-span-2">
                    <TimeStatusSection hoursToday={dashboard.hours_logged_today} hoursWeek={dashboard.hours_logged_this_week} />
                </div>
            </div>

            {/* Add Task Modal */}
            <AddTaskModal isOpen={showAddTask} onClose={() => setShowAddTask(false)} onTaskCreated={fetchDashboard} />
        </div>
    );
}
