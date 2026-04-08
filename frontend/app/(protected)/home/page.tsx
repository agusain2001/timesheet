"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPersonalDashboard, type PersonalDashboard, type DateFilter } from "@/services/dashboard";
import { getToken } from "@/lib/auth";
import AddTaskModal from "@/components/AddTaskModal";
import { HowItWorks } from "@/components/ui/HowItWorks";
import DateFilterDropdown, { type DateRange, type FilterPreset } from "@/components/DateFilterDropdown";
import { Search } from "lucide-react";

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
        open: "#3b82f6",
        done: "#22c55e",
    };
    return m[status] || "#6b7280";
}

// ============ Cards ============

function buildCardHref(base: string, filter: DateFilter): string {
    const params = new URLSearchParams();
    if (filter.startDate) params.set("start_date", filter.startDate);
    if (filter.endDate) params.set("end_date", filter.endDate);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

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

// ============ Activity Overlay ============

interface ActivityOverlayProps {
    activity: PersonalDashboard["recent_activity"][0] | null;
    onClose: () => void;
}

function ActivityOverlay({ activity, onClose }: ActivityOverlayProps) {
    if (!activity) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-md rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Activity Detail</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-foreground/10 flex items-center justify-center text-foreground/60 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p className="text-foreground font-medium text-sm">
                    {activity.type === "task_completed" ? "Task Completed" : activity.type === "task_created" ? "Task Created" : activity.type}
                </p>
                <p className="text-foreground/60 text-sm mt-2">{activity.message}</p>
                <p className="text-foreground/40 text-xs mt-4">{formatTimestamp(activity.timestamp)}</p>
            </div>
        </div>
    );
}

// ============ Time Entry Modal ============

function TimeEntryModal({ onClose }: { onClose: () => void }) {
    const [hours, setHours] = useState("");
    const [note, setNote] = useState("");

    const handleSave = () => {
        // TODO: POST to /api/time-tracking with hours + note
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Log Time</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-foreground/10 flex items-center justify-center text-foreground/60 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <label className="block text-xs text-foreground/60 mb-1">Hours worked</label>
                <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="e.g. 2.5"
                    className="w-full rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 mb-3"
                />
                <label className="block text-xs text-foreground/60 mb-1">Note (optional)</label>
                <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you work on?"
                    className="w-full rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 mb-4"
                />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-foreground/15 text-xs text-foreground/60 hover:bg-foreground/5 transition">Cancel</button>
                    <button onClick={handleSave} disabled={!hours} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-40 transition">Log Time</button>
                </div>
            </div>
        </div>
    );
}

// ============ Sections ============

function UpcomingDeadlinesSection({ deadlines }: { deadlines: PersonalDashboard["upcoming_deadlines"] }) {
    const empty = deadlines.length === 0;
    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 flex flex-col h-full">
            <h3 className="text-sm font-semibold text-foreground mb-4">Upcoming Deadlines</h3>
            {empty ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                    <p className="font-semibold text-foreground/80">No deadlines to show</p>
                    <p className="text-xs text-foreground/50 mt-1">Tasks with due dates will appear here automatically.</p>
                </div>
            ) : (
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-foreground/50 text-xs uppercase tracking-wider">
                                <th className="text-left pb-3 font-medium">Task</th>
                                <th className="text-left pb-3 font-medium">Project</th>
                                <th className="text-left pb-3 font-medium">Due Date</th>
                                <th className="text-left pb-3 font-medium">Priority</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deadlines.map((d) => (
                                <tr key={d.task_id} className="border-t border-foreground/5">
                                    <td className="py-3 text-foreground/90 font-medium">{d.task_name}</td>
                                    <td className="py-3 text-foreground/70">{d.project_name || "—"}</td>
                                    <td className="py-3 text-foreground/70">{formatDate(d.due_date)}</td>
                                    <td className="py-3">
                                        <span
                                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                            style={{
                                                background: `${statusColor(d.priority === "high" ? "blocked" : d.priority === "low" ? "archived" : "in_progress")}20`,
                                                color: statusColor(d.priority === "high" ? "blocked" : d.priority === "low" ? "archived" : "in_progress"),
                                            }}
                                        >
                                            {d.priority || "medium"}
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

    const statusOrder = ["in_progress", "on_hold", "draft", "completed", "archived", "todo", "review", "blocked", "open", "done"];
    const sortedEntries = Object.entries(tasksByStatus)
        .filter(([, count]) => count > 0)  // only show statuses with tasks
        .sort(
            ([a], [b]) => (statusOrder.indexOf(a) === -1 ? 99 : statusOrder.indexOf(a)) - (statusOrder.indexOf(b) === -1 ? 99 : statusOrder.indexOf(b))
        );

    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 flex flex-col h-full">
            <h3 className="text-sm font-semibold text-foreground mb-4">My Task&apos;s Status</h3>
            {empty ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                    <p className="font-semibold text-foreground/80">No task status data yet</p>
                    <p className="text-xs text-foreground/50 mt-1">Task status distribution will appear once tasks are assigned.</p>
                </div>
            ) : (
                <div className="space-y-3 flex-1">
                    {sortedEntries.map(([status, count]) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                            <div key={status} className="flex items-center gap-3">
                                <span className="text-xs text-foreground/70 w-24 shrink-0">{statusLabel(status)}</span>
                                <div className="flex-1 h-2 rounded-full bg-foreground/10 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: statusColor(status) }} />
                                </div>
                                <span className="text-xs text-foreground/50 w-16 text-right">{count} ({pct}%)</span>
                            </div>
                        );
                    })}
                    <p className="text-xs text-foreground/40 pt-2 border-t border-foreground/5">Total: {total} tasks</p>
                </div>
            )}
        </div>
    );
}

function RecentActivitySection({ activities }: { activities: PersonalDashboard["recent_activity"] }) {
    const [selectedActivity, setSelectedActivity] = useState<PersonalDashboard["recent_activity"][0] | null>(null);
    const empty = activities.length === 0;
    return (
        <>
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 flex flex-col h-full">
                <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
                {empty ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                        <p className="font-semibold text-foreground/80">No activity to show</p>
                        <p className="text-xs text-foreground/50 mt-1">Project updates, task changes, and notifications will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-1">
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
                                    <tr
                                        key={a.id}
                                        className="border-t border-foreground/5 hover:bg-foreground/5 cursor-pointer transition-colors"
                                        onClick={() => setSelectedActivity(a)}
                                        title="Click to view full message"
                                    >
                                        <td className="py-3">
                                            <p className="text-foreground/90 font-medium text-xs">{a.type === "task_completed" ? "Task completed" : a.type === "task_created" ? "Task created" : a.type}</p>
                                            <p className="text-foreground/50 text-xs mt-0.5 max-w-[200px] truncate">{a.message}</p>
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
            {/* #12 — Activity detail overlay */}
            <ActivityOverlay activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
        </>
    );
}

function TimeStatusSection({ hoursToday, hoursWeek }: { hoursToday: number; hoursWeek: number }) {
    const [showTimeEntry, setShowTimeEntry] = useState(false);
    const todayDisplay = hoursToday > 0 ? formatHours(hoursToday) : "NA";
    const weekDisplay = hoursWeek > 0 ? formatHours(hoursWeek) : "NA";

    return (
        <>
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 flex flex-col h-full">
                <h3 className="text-sm font-semibold text-foreground mb-4">My Time</h3>
                <div className="space-y-3 flex-1">
                    {/* Today */}
                    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
                        <span className="text-xs text-foreground/50">Today</span>
                        <div className="flex items-center justify-between mt-1">
                            <div>
                                <p className="text-2xl font-bold text-foreground">{todayDisplay}</p>
                                <p className="text-[11px] text-foreground/40 mt-0.5">of 8 hour daily</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* #16 — View My Time link fixed */}
                                <Link href="/my-time" className="text-xs text-foreground/60 border border-foreground/15 rounded-full px-3 py-1 hover:bg-foreground/5 transition">
                                    View My Time &gt;
                                </Link>
                                {/* #26 — Play button now opens time-entry modal */}
                                <button
                                    onClick={() => setShowTimeEntry(true)}
                                    title="Log time"
                                    className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer hover:bg-blue-500 transition"
                                >
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </button>
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
            {showTimeEntry && <TimeEntryModal onClose={() => setShowTimeEntry(false)} />}
        </>
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

function getThisMonthDefault(): DateFilter {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const toISO = (d: Date) => d.toISOString().split("T")[0];
    return { startDate: toISO(start), endDate: toISO(end) };
}

export default function HomePage() {
    const router = useRouter();
    const [data, setData] = useState<PersonalDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>(getThisMonthDefault());
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchDashboard = useCallback((filter?: DateFilter, searchStr?: string) => {
        const token = getToken();
        if (!token) {
            router.push("/login?redirect=/home");
            return;
        }

        const effectiveFilter = { ...filter };
        if (searchStr) effectiveFilter.search = searchStr;

        getPersonalDashboard(effectiveFilter)
            .then((d) => {
                setData(d);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Dashboard fetch error:", err);
                if (err?.status === 401 || err?.message?.includes("Not authenticated")) {
                    router.push("/login?redirect=/home");
                    return;
                }
                setError("Failed to load dashboard data");
                setLoading(false);
            });
    }, [router]);

    const handleFilterChange = useCallback((range: DateRange, _preset: FilterPreset) => {
        const filter: DateFilter = { startDate: range.startDate, endDate: range.endDate };
        setDateFilter(filter);
        setLoading(true);
        fetchDashboard(filter, debouncedSearch);
    }, [fetchDashboard, debouncedSearch]);

    // Refetch when search changes
    useEffect(() => {
        setLoading(true);
        fetchDashboard(dateFilter, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    useEffect(() => {
        fetchDashboard(dateFilter, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg pl-9 pr-4 py-2 text-sm bg-foreground/5 border border-foreground/15 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                        />
                    </div>
                    <DateFilterDropdown
                        initialPreset="this_month"
                        onFilterChange={handleFilterChange}
                    />
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
                    "Upcoming Deadlines shows tasks due within the next 30 days, sorted by due date.",
                    "Recent Activity logs the latest changes to your tasks — click any row for full details.",
                    "The time tracker shows hours logged today/this week. Click ▶ to log time.",
                    "Click Add Task to quickly create a new task from this dashboard.",
                ]}
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="My Tasks" value={dashboard.my_tasks_count ?? "NA"} color="#3b82f6" href={buildCardHref("/my-tasks", dateFilter)} />
                <StatCard label="Due Tasks" value={dashboard.due_tasks_count ?? "NA"} color="#6366f1" href={buildCardHref("/tasks/due", dateFilter)} />
                <StatCard label="Completed Tasks" value={dashboard.completed_tasks_count ?? "NA"} color="#06b6d4" href={buildCardHref("/tasks/completed", dateFilter)} />
                <StatCard label="Overdue" value={dashboard.overdue_tasks_count ?? "NA"} color="#ef4444" href={buildCardHref("/tasks/overdue", dateFilter)} />
            </div>

            {/* #1 — Fixed height: both columns use items-stretch so boxes have equal height */}
            {/* Upcoming Deadlines + Task Status */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
                <div className="lg:col-span-3">
                    <UpcomingDeadlinesSection deadlines={dashboard.upcoming_deadlines} />
                </div>
                <div className="lg:col-span-2">
                    <TaskStatusSection tasksByStatus={dashboard.tasks_by_status} />
                </div>
            </div>

            {/* Recent Activity + Time Status */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
                <div className="lg:col-span-3">
                    <RecentActivitySection activities={dashboard.recent_activity} />
                </div>
                <div className="lg:col-span-2">
                    <TimeStatusSection hoursToday={dashboard.hours_logged_today} hoursWeek={dashboard.hours_logged_this_week} />
                </div>
            </div>

            {/* Add Task Modal */}
            <AddTaskModal isOpen={showAddTask} onClose={() => setShowAddTask(false)} onTaskCreated={() => fetchDashboard(dateFilter)} />
        </div>
    );
}
