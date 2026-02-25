"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Loader2, RefreshCw, CheckCircle2, AlertTriangle,
    TrendingUp, Users, Activity, BarChart2, ChevronRight, Sparkles
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { TaskListModal, TaskDetailModal } from "@/components/DashboardPanels";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ManagerDashboard {
    team_tasks_total: number;
    team_tasks_in_progress: number;
    team_tasks_blocked: number;
    team_tasks_completed_this_week: number;
    team_velocity: number;
    velocity_trend: "up" | "down" | "stable";
    bottlenecks: Array<{
        type: string; severity: string; message: string;
        related_id?: string; related_name?: string;
    }>;
    sla_breaches: Array<{
        task_id: string; task_name: string; breach_type: string; breached_at: string;
    }>;
    workload_distribution: Array<{
        user_id: string; user_name: string; avatar_url?: string;
        task_count: number; allocated_hours: number;
        capacity_hours: number; utilization: number;
    }>;
}

interface AIRecommendation {
    type: string; title: string; description: string; priority: string; affected_users?: string[];
}

// ─── Utilization Bar ──────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct?: number }) {
    const safePct = pct ?? 0;
    const color = safePct > 100 ? "#ef4444" : safePct > 80 ? "#f97316" : safePct > 60 ? "#eab308" : "#22c55e";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(safePct, 100)}%`, background: color }} />
            </div>
            <span className="text-xs font-semibold w-10 text-right" style={{ color }}>{safePct.toFixed(0)}%</span>
        </div>
    );
}

const SEVERITY_COLOR: Record<string, string> = {
    high: "border-red-500/30 bg-red-500/5 text-red-400",
    medium: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    low: "border-blue-500/30 bg-blue-500/5 text-blue-400",
};

const STAT_CARDS = [
    { key: "total" as const, label: "Team Tasks", sub: "total assigned", icon: BarChart2, accent: "blue", status: "total" },
    { key: "in_progress" as const, label: "In Progress", sub: "actively worked", icon: Activity, accent: "purple", status: "in_progress" },
    { key: "blocked" as const, label: "Blocked", sub: "need unblocking", icon: AlertTriangle, accent: "red", status: "blocked" },
    { key: "completed" as const, label: "Completed", sub: "this week", icon: CheckCircle2, accent: "green", status: "completed_week" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Manager Dashboard Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function ManagerDashboard() {
    const router = useRouter();
    const [data, setData] = useState<ManagerDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"overview" | "ai">("overview");
    const [aiRecs, setAiRecs] = useState<AIRecommendation[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

    // Modal state
    const [taskListModal, setTaskListModal] = useState<{ title: string; status: string } | null>(null);
    const [taskDetailModal, setTaskDetailModal] = useState<{ id: string; name: string } | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const t = getToken();
            const r = await fetch(`${API}/api/dashboard/manager`, { headers: { Authorization: `Bearer ${t}` } });
            if (r.ok) setData(await r.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchAI = async () => {
        if (aiRecs.length) return;
        setAiLoading(true);
        try {
            const t = getToken();
            const r = await fetch(`${API}/api/dashboard/manager/ai-recommendations`, { headers: { Authorization: `Bearer ${t}` } });
            if (r.ok) setAiRecs(await r.json());
        } catch { setAiRecs([]); }
        finally { setAiLoading(false); }
    };

    useEffect(() => { if (tab === "ai") fetchAI(); }, [tab]);

    const d = data;
    const statValues = d ? {
        total: d.team_tasks_total,
        in_progress: d.team_tasks_in_progress,
        blocked: d.team_tasks_blocked,
        completed: d.team_tasks_completed_this_week,
    } : { total: 0, in_progress: 0, blocked: 0, completed: 0 };

    return (
        <div className="min-h-screen p-6 bg-background text-foreground space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manager Dashboard</h1>
                    <p className="text-xs text-foreground/40 mt-1 flex items-center gap-1">
                        <Activity size={10} className="text-green-400" />
                        Last refreshed: <span suppressHydrationWarning>{new Date().toLocaleTimeString()}</span>
                    </p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/60 hover:text-foreground/90 text-sm transition-colors">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-foreground/[0.02] border border-foreground/10 rounded-xl w-fit">
                <button onClick={() => setTab("overview")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "overview" ? "bg-blue-600 text-white" : "text-foreground/60 hover:text-foreground/90"}`}>
                    Overview
                </button>
                <button onClick={() => setTab("ai")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "ai" ? "bg-blue-600 text-white" : "text-foreground/60 hover:text-foreground/90"}`}>
                    <Sparkles size={12} />AI Optimization
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-blue-400" />
                </div>
            ) : (
                <>
                    {/* ── OVERVIEW ── */}
                    {tab === "overview" && (
                        <div className="space-y-6">
                            {/* KPI Stat cards — click to open centered modal */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {STAT_CARDS.map(({ key, label, sub, icon: Icon, accent, status }) => {
                                    const accents: Record<string, string> = {
                                        blue: "bg-blue-500/10 text-blue-400",
                                        purple: "bg-purple-500/10 text-purple-400",
                                        red: "bg-red-500/10 text-red-400",
                                        green: "bg-green-500/10 text-green-400",
                                    };
                                    const isAlert = (key === "blocked" && statValues.blocked > 0) || (key === "in_progress" && statValues.in_progress > 5);
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setTaskListModal({ title: label, status })}
                                            className={`p-5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.99] ${isAlert ? "border-red-500/20 bg-red-500/[0.02]" : "border-foreground/10 bg-foreground/[0.02] hover:border-blue-500/20"}`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accents[accent]}`}>
                                                <Icon size={20} />
                                            </div>
                                            <p className="text-3xl font-bold text-foreground/90 mb-0.5">{statValues[key]}</p>
                                            <p className="text-sm text-foreground/55 font-medium">{label}</p>
                                            <p className="text-xs text-foreground/35 mt-0.5">{sub}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Team Workload — click row → navigate to /employees/[id] */}
                                <div className="lg:col-span-2 p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                                    <h2 className="text-sm font-semibold text-foreground/70 mb-4 flex items-center gap-2">
                                        <Users size={14} className="text-blue-400" /> Team Workload
                                        <span className="text-[10px] text-foreground/35 ml-auto font-normal">Click member for full profile</span>
                                    </h2>

                                    {(!d?.workload_distribution || d.workload_distribution.length === 0) ? (
                                        <p className="text-sm text-foreground/40 text-center py-8">No team workload data</p>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-[1fr_60px_120px_40px] gap-3 px-3 pb-2 border-b border-foreground/5 text-[10px] text-foreground/35 uppercase font-semibold">
                                                <span>Member</span>
                                                <span className="text-right">Tasks</span>
                                                <span>Utilization</span>
                                                <span></span>
                                            </div>
                                            {d.workload_distribution.map(u => (
                                                <div
                                                    key={u.user_id}
                                                    onClick={() => router.push(`/employees/${u.user_id}`)}
                                                    className="grid grid-cols-[1fr_60px_120px_40px] gap-3 items-center py-2.5 px-3 rounded-xl cursor-pointer hover:bg-foreground/[0.04] hover:border hover:border-blue-500/10 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                                                            {u.user_name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-foreground/80 truncate">{u.user_name}</p>
                                                            <p className="text-[10px] text-foreground/40">{u.allocated_hours}h / {u.capacity_hours}h</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-foreground/50 text-right">{u.task_count}</span>
                                                    <UtilBar pct={u.utilization} />
                                                    <div className="flex justify-end">
                                                        <ChevronRight size={13} className="text-foreground/25 group-hover:text-blue-400 transition-colors" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Bottlenecks & SLA */}
                                <div className="space-y-4">
                                    {/* Bottlenecks */}
                                    <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                                        <h2 className="text-sm font-semibold text-foreground/70 mb-3 flex items-center gap-2">
                                            <AlertTriangle size={14} className="text-amber-400" /> Bottlenecks
                                        </h2>
                                        {!d?.bottlenecks?.length ? (
                                            <div className="text-center py-4">
                                                <CheckCircle2 size={24} className="text-green-500 mx-auto mb-1" />
                                                <p className="text-xs text-foreground/40">None detected 🎉</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {d.bottlenecks.slice(0, 4).map((b, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => b.related_id && setTaskDetailModal({ id: b.related_id, name: b.related_name || "Task" })}
                                                        disabled={!b.related_id}
                                                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${SEVERITY_COLOR[b.severity] || SEVERITY_COLOR.low} ${b.related_id ? "hover:brightness-110 cursor-pointer" : "cursor-default"}`}
                                                    >
                                                        <p className="font-semibold mb-0.5 capitalize">{b.type.replace(/_/g, " ")}</p>
                                                        <p className="opacity-60 line-clamp-2 leading-relaxed text-foreground/70">{b.message}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* SLA Breaches */}
                                    <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                                        <h2 className="text-sm font-semibold text-foreground/70 mb-3 flex items-center gap-2">
                                            <AlertTriangle size={14} className="text-red-400" /> SLA Breaches
                                        </h2>
                                        {!d?.sla_breaches?.length ? (
                                            <div className="text-center py-4">
                                                <CheckCircle2 size={24} className="text-green-500 mx-auto mb-1" />
                                                <p className="text-xs text-foreground/40">All on track</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {d.sla_breaches.slice(0, 4).map((b, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setTaskDetailModal({ id: b.task_id, name: b.task_name })}
                                                        className="w-full text-left p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs hover:brightness-110 transition-all cursor-pointer"
                                                    >
                                                        <p className="font-semibold text-foreground/80 truncate">{b.task_name}</p>
                                                        <p className="text-red-400 capitalize mt-0.5">{b.breach_type?.replace(/_/g, " ") || "Unknown breach"}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Velocity */}
                            {d?.team_velocity !== undefined && (
                                <div className="p-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.velocity_trend === "up" ? "bg-green-500/10 text-green-400" : d.velocity_trend === "down" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                                        <TrendingUp size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground/80">Team Velocity: {d.team_velocity} tasks/week</p>
                                        <p className="text-xs text-foreground/45 capitalize">Trend: {d.velocity_trend || "stable"}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── AI OPTIMIZATION ── */}
                    {tab === "ai" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <Sparkles size={15} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-foreground/85">AI Workload Recommendations</h2>
                                    <p className="text-xs text-foreground/40">Powered by team activity analysis</p>
                                </div>
                            </div>
                            {aiLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 size={24} className="animate-spin text-blue-400" />
                                </div>
                            ) : aiRecs.length === 0 ? (
                                <div className="p-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] text-center">
                                    <Sparkles size={28} className="text-blue-400/30 mx-auto mb-2" />
                                    <p className="text-sm text-foreground/40">No recommendations available at this time.</p>
                                    <p className="text-xs text-foreground/30 mt-1">Check back after more team activity.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {aiRecs.map((r, i) => (
                                        <div key={i} className={`p-5 rounded-2xl border ${r.priority === "high" ? "border-red-500/20 bg-red-500/[0.02]" : r.priority === "medium" ? "border-amber-500/20 bg-amber-500/[0.02]" : "border-blue-500/20 bg-blue-500/[0.02]"}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${r.priority === "high" ? "bg-red-500/20 text-red-400" : r.priority === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
                                                    {r.priority}
                                                </span>
                                                <span className="text-[10px] text-foreground/35 capitalize">{r.type?.replace(/_/g, " ")}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-foreground/85 mb-1">{r.title}</p>
                                            <p className="text-xs text-foreground/55 leading-relaxed">{r.description}</p>
                                            {r.affected_users?.length && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {r.affected_users.map((u, j) => (<span key={j} className="text-[10px] px-1.5 py-0.5 bg-foreground/5 text-foreground/40 rounded">{u}</span>))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ── Centered Modals (not sidebars!) ── */}
            {taskListModal && (
                <TaskListModal
                    title={taskListModal.title}
                    statusFilter={taskListModal.status}
                    onClose={() => setTaskListModal(null)}
                    onTaskUpdate={fetchData}
                />
            )}
            {taskDetailModal && (
                <TaskDetailModal
                    taskId={taskDetailModal.id}
                    taskName={taskDetailModal.name}
                    onClose={() => setTaskDetailModal(null)}
                    onUpdate={fetchData}
                />
            )}
        </div>
    );
}
