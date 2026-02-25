"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Mail, Phone, MapPin, Clock, Briefcase, Star,
    CheckCircle2, AlertTriangle, TrendingUp, Users, FolderOpen,
    BarChart2, Activity, Calendar, Zap, Shield, Loader2,
    ChevronRight, RefreshCw, ExternalLink
} from "lucide-react";
import { apiGet, apiPut } from "@/services/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TaskItem {
    id: string; name: string; status: string; priority: string;
    due_date?: string | null; completed_at?: string | null;
    project_name?: string | null; project_id?: string | null;
    estimated_hours?: number | null; actual_hours?: number;
    updated_at?: string | null;
}

interface ProjectItem {
    id: string; name: string; code?: string | null; status: string;
    priority: string; progress: number; total_tasks: number;
    completed_tasks: number; start_date?: string | null;
    end_date?: string | null; role: string;
}

interface TeamItem {
    id: string; name: string; description?: string | null;
    role: string; member_count: number; lead_name?: string | null;
    allocation_percentage?: number;
}

interface ProfileSummary {
    user: {
        id: string; full_name: string; email: string; role: string;
        position?: string | null; avatar_url?: string | null;
        phone?: string | null; bio?: string | null;
        skills?: string[]; expertise_level?: string | null;
        timezone?: string; working_hours_start?: string;
        working_hours_end?: string; availability_status?: string;
        capacity_hours_week?: number; is_active: boolean;
        created_at?: string | null; last_login_at?: string | null;
        department?: { id: string; name: string } | null;
    };
    active_tasks: TaskItem[];
    completed_tasks_last_30d: TaskItem[];
    projects: { active: ProjectItem[]; past: ProjectItem[] };
    teams: TeamItem[];
    hours: {
        this_week: number; this_month: number; total: number;
        by_week: { week: string; hours: number }[];
    };
    task_stats: {
        total: number; active: number; completed_total: number;
        overdue: number; in_progress: number;
        by_status: Record<string, number>;
        by_priority: Record<string, number>;
    };
    recent_activity: {
        type: string; task_name: string; task_id?: string | null;
        description: string; timestamp?: string | null;
    }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
    todo: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    blocked: "bg-red-500/20 text-red-400 border-red-500/30",
    waiting: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    review: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    done: "bg-green-500/20 text-green-400 border-green-500/30",
    cancelled: "bg-gray-500/20 text-gray-500 border-gray-500/30",
};

const PRIORITY_COLOR: Record<string, string> = {
    low: "bg-slate-500", medium: "bg-blue-400", high: "bg-amber-400",
    urgent: "bg-red-500", critical: "bg-red-600",
};

const AVAIL_COLOR: Record<string, string> = {
    available: "bg-green-400", busy: "bg-amber-400",
    away: "bg-slate-400", offline: "bg-gray-400",
};

function fmt(d?: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtShort(d?: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent = "blue" }: {
    label: string; value: string | number; sub?: string;
    icon: React.FC<{ size: number; className?: string }>; accent?: string;
}) {
    const accents: Record<string, string> = {
        blue: "text-blue-400 bg-blue-500/10",
        green: "text-green-400 bg-green-500/10",
        amber: "text-amber-400 bg-amber-500/10",
        red: "text-red-400 bg-red-500/10",
        purple: "text-purple-400 bg-purple-500/10",
    };
    return (
        <div className="p-4 rounded-2xl border border-foreground/8 bg-foreground/[0.02]">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${accents[accent]}`}>
                <Icon size={16} />
            </div>
            <p className="text-2xl font-bold text-foreground/90">{value}</p>
            <p className="text-xs font-medium text-foreground/55 mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-foreground/35 mt-0.5">{sub}</p>}
        </div>
    );
}

function TaskRow({ task, onStatusChange }: {
    task: TaskItem;
    onStatusChange?: (id: string, status: string) => void;
}) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date()
        && !["done", "completed"].includes(task.status);
    return (
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-foreground/[0.03] transition-colors group">
            <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLOR[task.priority] || "bg-slate-500"}`} title={task.priority} />
            <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/80 truncate">{task.name}</p>
                {task.project_name && (
                    <p className="text-[10px] text-foreground/40 truncate">{task.project_name}</p>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {isOverdue && <AlertTriangle size={11} className="text-red-400" />}
                <span className={`text-[10px] ${isOverdue ? "text-red-400 font-medium" : "text-foreground/40"}`}>
                    {fmtShort(task.due_date)}
                </span>
                {onStatusChange ? (
                    <select
                        value={task.status}
                        onChange={e => { e.stopPropagation(); onStatusChange(task.id, e.target.value); }}
                        className="text-[10px] bg-foreground/[0.04] border border-foreground/10 rounded-lg px-1.5 py-0.5 text-foreground/60 outline-none focus:border-blue-500"
                    >
                        {["todo", "in_progress", "blocked", "waiting", "review", "completed"].map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                    </select>
                ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLOR[task.status] || STATUS_COLOR.todo}`}>
                        {task.status.replace(/_/g, " ")}
                    </span>
                )}
            </div>
        </div>
    );
}

function ProjectCard({ project }: { project: ProjectItem }) {
    const barColor = project.progress >= 70 ? "bg-green-500" : project.progress >= 40 ? "bg-amber-500" : "bg-red-500";
    const statusColor: Record<string, string> = {
        active: "text-green-400 bg-green-500/10",
        planning: "text-blue-400 bg-blue-500/10",
        completed: "text-slate-400 bg-slate-500/10",
        on_hold: "text-amber-400 bg-amber-500/10",
        cancelled: "text-red-400 bg-red-500/10",
    };
    return (
        <div className="p-4 rounded-2xl border border-foreground/8 bg-foreground/[0.02] hover:border-blue-500/20 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-semibold text-foreground/85 truncate">{project.name}</h4>
                        {project.code && <span className="text-[10px] text-foreground/30 font-mono shrink-0">{project.code}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium capitalize ${statusColor[project.status] || "text-foreground/40 bg-foreground/5"}`}>
                            {project.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-foreground/30 font-medium capitalize border border-foreground/10 px-1.5 py-0.5 rounded-md">
                            {project.role}
                        </span>
                    </div>
                </div>
                <p className="text-lg font-bold text-foreground/70 shrink-0 ml-2">{project.progress}%</p>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden mb-2">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${project.progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-foreground/35">
                <span>{project.completed_tasks}/{project.total_tasks} tasks done</span>
                {project.end_date && <span>Due {fmtShort(project.end_date)}</span>}
            </div>
        </div>
    );
}

// ─── Utilization Ring ──────────────────────────────────────────────────────────

function UtilizationRing({ pct }: { pct: number }) {
    const capped = Math.min(pct, 100);
    const r = 30;
    const circ = 2 * Math.PI * r;
    const color = pct > 100 ? "#ef4444" : pct > 80 ? "#f97316" : pct > 50 ? "#3b82f6" : "#22c55e";
    return (
        <div className="relative w-16 h-16 shrink-0">
            <svg className="rotate-[-90deg]" width="64" height="64">
                <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-foreground/10" />
                <circle cx="32" cy="32" r={r} fill="none" strokeWidth="4"
                    stroke={color}
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - capped / 100)}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground/80">{pct}%</span>
            </div>
        </div>
    );
}

// ─── Hours Bar Chart ───────────────────────────────────────────────────────────

function HoursChart({ data }: { data: { week: string; hours: number }[] }) {
    const maxH = Math.max(...data.map(d => d.hours), 1);
    return (
        <div className="space-y-2">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-foreground/40 w-16 shrink-0">{d.week}</span>
                    <div className="flex-1 h-5 bg-foreground/[0.04] rounded-lg overflow-hidden relative">
                        <div
                            className="absolute h-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
                            style={{ width: `${(d.hours / maxH) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs text-foreground/50 w-10 text-right shrink-0">{d.hours}h</span>
                </div>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE PROFILE PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const TABS = ["Overview", "Tasks", "Projects", "Teams", "Hours"] as const;
type Tab = typeof TABS[number];

export default function EmployeeProfilePage() {
    const params = useParams();
    const router = useRouter();
    const userId = params?.id as string;

    const [data, setData] = useState<ProfileSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>("Overview");
    const [taskFilter, setTaskFilter] = useState<"active" | "completed">("active");
    const [projectFilter, setProjectFilter] = useState<"active" | "past">("active");

    const fetchData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const d = await apiGet<ProfileSummary>(`/api/users/${userId}/profile-summary`);
            setData(d);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [userId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            await apiPut(`/api/dashboard/manager/tasks/${taskId}/quick-update`, { status: newStatus });
            fetchData();
        } catch (e) { console.error(e); }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 size={36} className="animate-spin text-blue-400 mx-auto mb-3" />
                    <p className="text-sm text-foreground/50">Loading employee profile…</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <AlertTriangle size={36} className="text-amber-400 mx-auto mb-3" />
                    <p className="text-foreground/60">Employee not found</p>
                    <button onClick={() => router.back()} className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const u = data.user;
    const utilPct = u.capacity_hours_week
        ? Math.min(Math.round((data.hours.this_week / u.capacity_hours_week) * 100), 200)
        : 0;
    const displayTasks = taskFilter === "active" ? data.active_tasks : data.completed_tasks_last_30d;
    const displayProjects = projectFilter === "active" ? data.projects.active : data.projects.past;

    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-500/5 to-transparent" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

                <div className="relative px-6 pt-6 pb-8">
                    {/* Back nav */}
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground/80 transition-colors mb-6 group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        Back to Dashboard
                    </button>

                    <div className="flex items-start gap-6 flex-wrap">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-blue-500/20">
                                {u.full_name.charAt(0)}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background ${AVAIL_COLOR[u.availability_status || "offline"] || "bg-gray-400"}`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                <h1 className="text-2xl font-bold text-foreground">{u.full_name}</h1>
                                {!u.is_active && (
                                    <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">Inactive</span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 flex-wrap mb-3">
                                <span className="text-sm text-foreground/55 font-medium capitalize">{u.position || u.role}</span>
                                {u.department && (
                                    <span className="flex items-center gap-1 text-sm text-foreground/40">
                                        <Briefcase size={12} /> {u.department.name}
                                    </span>
                                )}
                                {u.expertise_level && (
                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium capitalize">
                                        <Star size={10} /> {u.expertise_level}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-5 flex-wrap text-sm text-foreground/45">
                                {u.email && <span className="flex items-center gap-1.5"><Mail size={13} />{u.email}</span>}
                                {u.phone && <span className="flex items-center gap-1.5"><Phone size={13} />{u.phone}</span>}
                                {u.timezone && <span className="flex items-center gap-1.5"><MapPin size={13} />{u.timezone}</span>}
                                {u.working_hours_start && u.working_hours_end && (
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={13} />{u.working_hours_start} – {u.working_hours_end}
                                    </span>
                                )}
                            </div>
                            {/* Skills */}
                            {u.skills && u.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {u.skills.slice(0, 8).map((s, i) => (
                                        <span key={i} className="px-2 py-0.5 text-[11px] rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                                            {s}
                                        </span>
                                    ))}
                                    {u.skills.length > 8 && (
                                        <span className="px-2 py-0.5 text-[11px] rounded-full bg-foreground/5 text-foreground/40 border border-foreground/10">
                                            +{u.skills.length - 8} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Utilization ring + actions */}
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="text-center">
                                <UtilizationRing pct={utilPct} />
                                <p className="text-[10px] text-foreground/40 mt-1">this week</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={fetchData} className="p-2 rounded-xl bg-foreground/[0.03] border border-foreground/10 text-foreground/50 hover:text-foreground/80 transition-colors">
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    {u.bio && (
                        <p className="mt-4 text-sm text-foreground/50 max-w-2xl leading-relaxed border-l-2 border-blue-500/30 pl-3">
                            {u.bio}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="px-6 border-b border-foreground/8 sticky top-0 bg-background/95 backdrop-blur z-20">
                <div className="flex items-center gap-0 overflow-x-auto">
                    {TABS.map(tab => {
                        const badges: Partial<Record<Tab, number>> = {
                            Tasks: data.task_stats.active,
                            Projects: data.projects.active.length + data.projects.past.length,
                            Teams: data.teams.length,
                        };
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab
                                    ? "text-blue-400"
                                    : "text-foreground/50 hover:text-foreground/75"
                                    }`}
                            >
                                {tab}
                                {badges[tab] !== undefined && badges[tab]! > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab ? "bg-blue-500/20 text-blue-400" : "bg-foreground/10 text-foreground/40"}`}>
                                        {badges[tab]}
                                    </span>
                                )}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab Content ── */}
            <div className="p-6">

                {/* ── OVERVIEW ── */}
                {activeTab === "Overview" && (
                    <div className="space-y-6">
                        {/* Stat cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <StatCard label="Total Tasks" value={data.task_stats.total} icon={CheckCircle2} accent="blue" />
                            <StatCard label="Active" value={data.task_stats.active} icon={Activity} accent="purple" />
                            <StatCard label="Completed" value={data.task_stats.completed_total} icon={TrendingUp} accent="green" sub="all time" />
                            <StatCard label="Overdue" value={data.task_stats.overdue} icon={AlertTriangle} accent={data.task_stats.overdue > 0 ? "red" : "green"} />
                            <StatCard label="Hours/week" value={`${data.hours.this_week}h`} icon={Clock} accent="amber" sub={`of ${u.capacity_hours_week}h cap.`} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Task status breakdown */}
                            <div className="col-span-1 p-5 rounded-2xl border border-foreground/8 bg-foreground/[0.02]">
                                <h3 className="text-sm font-semibold text-foreground/70 mb-4 flex items-center gap-2">
                                    <BarChart2 size={14} className="text-blue-400" /> Task Status
                                </h3>
                                {Object.entries(data.task_stats.by_status).length === 0 ? (
                                    <p className="text-xs text-foreground/40 text-center py-6">No tasks yet</p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {Object.entries(data.task_stats.by_status).map(([status, count]) => {
                                            const total = data.task_stats.total || 1;
                                            return (
                                                <div key={status} className="flex items-center gap-3">
                                                    <span className="text-xs text-foreground/50 w-20 truncate capitalize">{status.replace(/_/g, " ")}</span>
                                                    <div className="flex-1 h-3 bg-foreground/[0.04] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${["done", "completed"].includes(status) ? "bg-green-500" : status === "in_progress" ? "bg-blue-500" : status === "blocked" ? "bg-red-500" : "bg-slate-500"}`}
                                                            style={{ width: `${(count / total) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-foreground/50 w-5 text-right">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Recent activity */}
                            <div className="col-span-2 p-5 rounded-2xl border border-foreground/8 bg-foreground/[0.02]">
                                <h3 className="text-sm font-semibold text-foreground/70 mb-4 flex items-center gap-2">
                                    <Zap size={14} className="text-amber-400" /> Recent Activity
                                </h3>
                                {data.recent_activity.length === 0 ? (
                                    <p className="text-xs text-foreground/40 text-center py-6">No recent activity</p>
                                ) : (
                                    <div className="space-y-2">
                                        {data.recent_activity.map((a, i) => (
                                            <div key={i} className="flex items-start gap-3 py-2 border-b border-foreground/5 last:border-0">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${a.type === "status_change" ? "bg-blue-500/20" : a.type === "comment" ? "bg-purple-500/20" : "bg-foreground/10"}`}>
                                                    <Activity size={10} className="text-blue-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-foreground/70 truncate">{a.description}</p>
                                                    <p className="text-[10px] text-foreground/35">{a.task_name} · {a.timestamp ? new Date(a.timestamp).toLocaleDateString() : "—"}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick links to other tabs */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { label: "Active Tasks", count: data.active_tasks.length, tab: "Tasks" as Tab, icon: CheckCircle2, color: "blue" },
                                { label: "Active Projects", count: data.projects.active.length, tab: "Projects" as Tab, icon: FolderOpen, color: "purple" },
                                { label: "Teams", count: data.teams.length, tab: "Teams" as Tab, icon: Users, color: "green" },
                                { label: "Hours This Month", count: `${data.hours.this_month}h`, tab: "Hours" as Tab, icon: BarChart2, color: "amber" },
                            ].map(({ label, count, tab, icon: Icon, color }) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className="flex items-center gap-3 p-4 rounded-2xl border border-foreground/8 bg-foreground/[0.02] hover:border-blue-500/20 hover:bg-blue-500/[0.02] transition-all text-left group"
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-${color}-500/10`}>
                                        <Icon size={15} className={`text-${color}-400`} />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-foreground/80">{count}</p>
                                        <p className="text-xs text-foreground/45">{label}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-foreground/30 ml-auto group-hover:text-blue-400 transition-colors" />
                                </button>
                            ))}
                        </div>

                        {/* Account info */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { label: "Member Since", value: fmt(u.created_at) },
                                { label: "Last Login", value: fmt(u.last_login_at) },
                                { label: "Availability", value: u.availability_status?.replace(/_/g, " ") || "—" },
                                { label: "Capacity", value: `${u.capacity_hours_week || 40}h/week` },
                            ].map(({ label, value }) => (
                                <div key={label} className="p-3 rounded-xl border border-foreground/8 bg-foreground/[0.02]">
                                    <p className="text-[10px] text-foreground/40 uppercase font-semibold mb-1">{label}</p>
                                    <p className="text-sm text-foreground/70 capitalize">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── TASKS ── */}
                {activeTab === "Tasks" && (
                    <div className="space-y-4">
                        {/* Toggle */}
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1 p-1 bg-foreground/[0.02] border border-foreground/10 rounded-xl">
                                <button onClick={() => setTaskFilter("active")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${taskFilter === "active" ? "bg-blue-600 text-white" : "text-foreground/55 hover:text-foreground/85"}`}>
                                    Active ({data.active_tasks.length})
                                </button>
                                <button onClick={() => setTaskFilter("completed")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${taskFilter === "completed" ? "bg-blue-600 text-white" : "text-foreground/55 hover:text-foreground/85"}`}>
                                    Completed — 30d ({data.completed_tasks_last_30d.length})
                                </button>
                            </div>
                        </div>

                        {displayTasks.length === 0 ? (
                            <div className="text-center py-16">
                                <CheckCircle2 size={36} className="text-green-500 mx-auto mb-2" />
                                <p className="text-foreground/50 text-sm">No {taskFilter} tasks</p>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-foreground/8 bg-foreground/[0.02] overflow-hidden">
                                <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 border-b border-foreground/5 text-[10px] text-foreground/40 uppercase font-semibold">
                                    <span>Task</span><span>Project</span><span>Due</span><span>Status</span>
                                </div>
                                <div className="divide-y divide-foreground/5">
                                    {displayTasks.map(t => (
                                        <TaskRow
                                            key={t.id}
                                            task={t}
                                            onStatusChange={taskFilter === "active" ? handleStatusChange : undefined}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── PROJECTS ── */}
                {activeTab === "Projects" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1 p-1 bg-foreground/[0.02] border border-foreground/10 rounded-xl">
                                <button onClick={() => setProjectFilter("active")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${projectFilter === "active" ? "bg-blue-600 text-white" : "text-foreground/55 hover:text-foreground/85"}`}>
                                    Active ({data.projects.active.length})
                                </button>
                                <button onClick={() => setProjectFilter("past")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${projectFilter === "past" ? "bg-blue-600 text-white" : "text-foreground/55 hover:text-foreground/85"}`}>
                                    Past ({data.projects.past.length})
                                </button>
                            </div>
                        </div>

                        {displayProjects.length === 0 ? (
                            <div className="text-center py-16">
                                <FolderOpen size={36} className="text-foreground/20 mx-auto mb-2" />
                                <p className="text-foreground/50 text-sm">No {projectFilter} projects</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {displayProjects.map(p => (
                                    <ProjectCard key={p.id} project={p} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TEAMS ── */}
                {activeTab === "Teams" && (
                    <div className="space-y-4">
                        {data.teams.length === 0 ? (
                            <div className="text-center py-16">
                                <Users size={36} className="text-foreground/20 mx-auto mb-2" />
                                <p className="text-foreground/50 text-sm">Not a member of any team</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.teams.map(team => (
                                    <div key={team.id} className="p-5 rounded-2xl border border-foreground/8 bg-foreground/[0.02] hover:border-blue-500/20 transition-colors">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
                                                    <Users size={16} className="text-blue-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold text-foreground/85 truncate">{team.name}</h3>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20 capitalize">
                                                        {team.role}
                                                    </span>
                                                </div>
                                            </div>
                                            {team.allocation_percentage && (
                                                <span className="text-xs font-bold text-foreground/50 shrink-0">
                                                    {team.allocation_percentage}%
                                                </span>
                                            )}
                                        </div>
                                        {team.description && (
                                            <p className="text-xs text-foreground/45 mb-3 line-clamp-2">{team.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-[11px] text-foreground/40">
                                            <span className="flex items-center gap-1"><Users size={10} />{team.member_count} members</span>
                                            {team.lead_name && <span className="flex items-center gap-1"><Shield size={10} />Lead: {team.lead_name}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── HOURS ── */}
                {activeTab === "Hours" && (
                    <div className="space-y-6">
                        {/* Summary cards */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: "This Week", value: `${data.hours.this_week}h`, sub: `of ${u.capacity_hours_week}h capacity`, accent: "blue" },
                                { label: "This Month", value: `${data.hours.this_month}h`, sub: "last 30 days", accent: "amber" },
                                { label: "All Time", value: `${data.hours.total}h`, sub: "logged total", accent: "purple" },
                            ].map(({ label, value, sub, accent }) => (
                                <div key={label} className={`p-5 rounded-2xl border border-foreground/8 bg-foreground/[0.02] text-center`}>
                                    <p className={`text-3xl font-bold mb-1 ${accent === "blue" ? "text-blue-400" : accent === "amber" ? "text-amber-400" : "text-purple-400"}`}>{value}</p>
                                    <p className="text-sm text-foreground/60 font-medium">{label}</p>
                                    <p className="text-xs text-foreground/40 mt-0.5">{sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Bar chart */}
                        <div className="p-5 rounded-2xl border border-foreground/8 bg-foreground/[0.02]">
                            <h3 className="text-sm font-semibold text-foreground/70 mb-5 flex items-center gap-2">
                                <BarChart2 size={14} className="text-blue-400" /> Hours — Last 8 Weeks
                            </h3>
                            {data.hours.by_week.every(w => w.hours === 0) ? (
                                <p className="text-xs text-foreground/40 text-center py-6">No time logs recorded</p>
                            ) : (
                                <HoursChart data={data.hours.by_week} />
                            )}
                        </div>

                        {/* Working preferences */}
                        <div className="rounded-2xl border border-foreground/8 bg-foreground/[0.02] p-5">
                            <h3 className="text-sm font-semibold text-foreground/70 mb-4">Work Schedule</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {[
                                    { label: "Start Time", value: u.working_hours_start || "09:00" },
                                    { label: "End Time", value: u.working_hours_end || "17:00" },
                                    { label: "Timezone", value: u.timezone || "—" },
                                    { label: "Capacity", value: `${u.capacity_hours_week || 40}h/week` },
                                    { label: "Utilization", value: `${utilPct}%` },
                                    { label: "Availability", value: u.availability_status?.replace(/_/g, " ") || "—" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="p-3 rounded-xl border border-foreground/8 bg-foreground/[0.01]">
                                        <p className="text-[10px] text-foreground/40 uppercase font-semibold mb-1">{label}</p>
                                        <p className="text-sm text-foreground/70 capitalize">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
