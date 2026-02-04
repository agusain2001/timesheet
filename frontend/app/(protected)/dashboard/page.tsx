"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    getPersonalDashboard,
    getTodayStats,
    PersonalDashboard,
} from "@/services/dashboards";
import { createTask } from "@/services/tasks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";

// Icons
const CheckCircleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExclamationIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: "blue" | "green" | "yellow" | "red" | "purple";
    trend?: { value: number; isPositive: boolean };
}

function StatCard({ title, value, icon, color, trend }: StatCardProps) {
    const colors = {
        blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
        green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
        yellow: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400",
        red: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400",
        purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    };

    return (
        <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 ${colors[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-foreground/60 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-foreground">{value}</p>
                    {trend && (
                        <p className={`text-xs mt-1 ${trend.isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% from last week
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-lg bg-white/10 ${colors[color]}`}>{icon}</div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
        </div>
    );
}

interface TaskItemProps {
    task: {
        task_id: string;
        task_name: string;
        due_date: string;
        priority: string;
        project_name?: string;
    };
}

function TaskItem({ task }: TaskItemProps) {
    const priorityColors: Record<string, string> = {
        urgent: "bg-red-500/20 text-red-400 border-red-500/30",
        high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const isOverdue = new Date(task.due_date) < new Date();

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-foreground/30 bg-transparent cursor-pointer"
                />
                <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors">
                        {task.task_name}
                    </p>
                    {task.project_name && (
                        <p className="text-xs text-foreground/50">{task.project_name}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs rounded-full border ${priorityColors[task.priority] || priorityColors.medium}`}>
                    {task.priority}
                </span>
                <span className={`text-xs ${isOverdue ? "text-red-400" : "text-foreground/50"}`}>
                    {formatDate(task.due_date)}
                </span>
            </div>
        </div>
    );
}

interface ActivityItemProps {
    activity: {
        id: string;
        type: string;
        message: string;
        timestamp: string;
    };
}

function ActivityItem({ activity }: ActivityItemProps) {
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const activityIcons: Record<string, React.ReactNode> = {
        task_completed: <CheckCircleIcon />,
        task_created: <CalendarIcon />,
        comment: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    };

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-colors">
            <div className="p-2 rounded-lg bg-foreground/10 text-foreground/60">
                {activityIcons[activity.type] || <ClockIcon />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/80 truncate">{activity.message}</p>
                <p className="text-xs text-foreground/40 mt-0.5">{formatTime(activity.timestamp)}</p>
            </div>
        </div>
    );
}

function StatusDistributionChart({ data }: { data: Record<string, number> }) {
    const statusColors: Record<string, string> = {
        backlog: "#6b7280",
        todo: "#3b82f6",
        in_progress: "#8b5cf6",
        review: "#f59e0b",
        completed: "#10b981",
        blocked: "#ef4444",
    };

    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return (
        <div className="space-y-3">
            {Object.entries(data).map(([status, count]) => {
                const percentage = Math.round((count / total) * 100);
                return (
                    <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-foreground/60 capitalize">{status.replace("_", " ")}</span>
                            <span className="text-foreground/80">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-500"
                                style={{
                                    width: `${percentage}%`,
                                    backgroundColor: statusColors[status] || "#6b7280",
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const [dashboard, setDashboard] = useState<PersonalDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<"week" | "today">("week");
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({ name: "", description: "", priority: "medium" });
    const [creating, setCreating] = useState(false);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.name.trim()) return;

        try {
            setCreating(true);
            await createTask({
                name: taskForm.name,
                description: taskForm.description,
                priority: taskForm.priority as "low" | "medium" | "high" | "urgent",
            });
            toast.success("Task created successfully!");
            setShowNewTaskModal(false);
            setTaskForm({ name: "", description: "", priority: "medium" });
            // Refresh dashboard
            const data = await getPersonalDashboard();
            setDashboard(data);
        } catch (err) {
            console.error("Failed to create task:", err);
            toast.error("Failed to create task");
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        async function fetchDashboard() {
            try {
                setLoading(true);
                const data = await getPersonalDashboard();
                setDashboard(data);
            } catch (err) {
                console.error("Failed to fetch dashboard:", err);
                // Show empty structure if API fails
                setDashboard({
                    my_tasks_count: 0,
                    today_tasks_count: 0,
                    overdue_tasks_count: 0,
                    completed_today_count: 0,
                    upcoming_deadlines: [],
                    hours_logged_today: 0,
                    hours_logged_this_week: 0,
                    tasks_by_status: {
                        todo: 0,
                        in_progress: 0,
                        review: 0,
                        completed: 0,
                        blocked: 0,
                    },
                    recent_activity: [],
                });
            } finally {
                setLoading(false);
            }
        }

        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                </div>
            </DashboardLayout>
        );
    }

    if (!dashboard || error) {
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
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Welcome back! 👋</h1>
                        <p className="text-foreground/60 mt-1">Here's what's happening with your work today.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-foreground/10 rounded-lg p-1">
                            <button
                                onClick={() => setPeriod("today")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === "today" ? "bg-blue-600 text-white" : "hover:bg-foreground/10"
                                    }`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setPeriod("week")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === "week" ? "bg-blue-600 text-white" : "hover:bg-foreground/10"
                                    }`}
                            >
                                This Week
                            </button>
                        </div>
                        <button
                            onClick={() => setShowNewTaskModal(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Task
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="My Tasks"
                        value={dashboard.my_tasks_count}
                        icon={<CalendarIcon />}
                        color="blue"
                    />
                    <StatCard
                        title="Due Today"
                        value={dashboard.today_tasks_count}
                        icon={<ClockIcon />}
                        color="purple"
                    />
                    <StatCard
                        title="Completed Today"
                        value={dashboard.completed_today_count}
                        icon={<CheckCircleIcon />}
                        color="green"
                        trend={{ value: 15, isPositive: true }}
                    />
                    <StatCard
                        title="Overdue"
                        value={dashboard.overdue_tasks_count}
                        icon={<ExclamationIcon />}
                        color="red"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upcoming Deadlines */}
                    <div className="lg:col-span-2 rounded-xl border border-foreground/10 bg-background p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Upcoming Deadlines</h2>
                            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                View all →
                            </button>
                        </div>
                        <div className="space-y-2">
                            {dashboard.upcoming_deadlines.length > 0 ? (
                                dashboard.upcoming_deadlines.map((task) => (
                                    <TaskItem key={task.task_id} task={task} />
                                ))
                            ) : (
                                <p className="text-foreground/50 text-center py-8">No upcoming deadlines 🎉</p>
                            )}
                        </div>
                    </div>

                    {/* Task Status Distribution */}
                    <div className="rounded-xl border border-foreground/10 bg-background p-5">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Task Status</h2>
                        <StatusDistributionChart data={dashboard.tasks_by_status} />
                    </div>
                </div>

                {/* Activity and Time */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Activity */}
                    <div className="lg:col-span-2 rounded-xl border border-foreground/10 bg-background p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
                            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                View all →
                            </button>
                        </div>
                        <div className="space-y-1">
                            {dashboard.recent_activity.length > 0 ? (
                                dashboard.recent_activity.map((activity) => (
                                    <ActivityItem key={activity.id} activity={activity} />
                                ))
                            ) : (
                                <p className="text-foreground/50 text-center py-8">No recent activity</p>
                            )}
                        </div>
                    </div>

                    {/* Time Logged */}
                    <div className="rounded-xl border border-foreground/10 bg-background p-5">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Time Logged</h2>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30">
                                <p className="text-sm text-foreground/60">Today</p>
                                <p className="text-3xl font-bold text-foreground mt-1">
                                    {dashboard.hours_logged_today}h
                                </p>
                                <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${Math.min((dashboard.hours_logged_today / 8) * 100, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-foreground/50 mt-1">of 8h daily goal</p>
                            </div>
                            <div className="p-4 rounded-lg bg-foreground/5">
                                <p className="text-sm text-foreground/60">This Week</p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {dashboard.hours_logged_this_week}h
                                </p>
                                <div className="mt-2 h-2 bg-foreground/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${Math.min((dashboard.hours_logged_this_week / 40) * 100, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-foreground/50 mt-1">of 40h weekly capacity</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* New Task Modal */}
            <Modal
                isOpen={showNewTaskModal}
                onClose={() => setShowNewTaskModal(false)}
                title="Create New Task"
            >
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                            Task Name *
                        </label>
                        <input
                            type="text"
                            value={taskForm.name}
                            onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                            className="w-full px-3 py-2 bg-foreground/5 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter task name"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                            Description
                        </label>
                        <textarea
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            className="w-full px-3 py-2 bg-foreground/5 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                            placeholder="Enter task description (optional)"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                            Priority
                        </label>
                        <select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                            className="w-full px-3 py-2 bg-foreground/5 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowNewTaskModal(false)}
                            className="flex-1 px-4 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating || !taskForm.name.trim()}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {creating ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
