"use client";

import { useState, useEffect } from "react";
import { Users, AlertTriangle, TrendingUp, Clock, BarChart2, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = "indigo" }: {
    label: string; value: string | number; sub?: string;
    icon: any; color?: string;
}) {
    const COLORS: Record<string, string> = {
        indigo: "bg-indigo-500/10 text-indigo-400",
        amber: "bg-amber-500/10 text-amber-400",
        red: "bg-red-500/10 text-red-400",
        green: "bg-green-500/10 text-green-400",
    };
    return (
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${COLORS[color]}`}>
                <Icon size={20} />
            </div>
            <p className="text-3xl font-bold text-slate-200 mb-1">{value}</p>
            <p className="text-sm font-medium text-slate-400">{label}</p>
            {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
        </div>
    );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberWorkloadRow({ member }: { member: any }) {
    const pct = Math.min(100, Math.round(member.utilization_percentage || 0));
    const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500";

    return (
        <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                {(member.full_name || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300 truncate">{member.full_name}</p>
                <p className="text-xs text-slate-600">{member.active_tasks || 0} active tasks</p>
            </div>
            <div className="flex items-center gap-3 w-40 shrink-0">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
            </div>
        </div>
    );
}

// ─── Bottleneck Row ───────────────────────────────────────────────────────────

function BottleneckRow({ task }: { task: any }) {
    const STATUS_COLOR: Record<string, string> = {
        blocked: "bg-red-500/20 text-red-400",
        overdue: "bg-orange-500/20 text-orange-400",
        waiting: "bg-yellow-500/20 text-yellow-400",
    };
    const type = task.bottleneck_type || "blocked";
    const daysStuck = task.days_stuck || 0;

    return (
        <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[type] || STATUS_COLOR.blocked} capitalize shrink-0`}>
                {type}
            </span>
            <p className="flex-1 text-sm text-slate-300 truncate">{task.name}</p>
            <p className="text-xs text-slate-500 shrink-0">{daysStuck}d stuck</p>
        </div>
    );
}

// ─── Manager Dashboard ────────────────────────────────────────────────────────

export default function ManagerDashboard() {
    const [data, setData] = useState<any>(null);
    const [workload, setWorkload] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dash, wl] = await Promise.all([
                apiFetch("/dashboard/manager"),
                apiFetch("/workload/team-overview"),
            ]);
            setData(dash);
            setWorkload(wl?.members || []);
            setLastRefresh(new Date());
        } catch {
            /* silent — show empty state */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Manager Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Last refreshed: {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {loading && !data ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Active Tasks"
                            value={data?.active_tasks ?? "—"}
                            sub="across all projects"
                            icon={CheckCircle2}
                            color="indigo"
                        />
                        <StatCard
                            label="Overdue"
                            value={data?.overdue_tasks ?? "—"}
                            sub="need attention"
                            icon={AlertTriangle}
                            color="red"
                        />
                        <StatCard
                            label="Team Members"
                            value={data?.team_size ?? workload.length}
                            sub="active contributors"
                            icon={Users}
                            color="green"
                        />
                        <StatCard
                            label="Completion Rate"
                            value={data?.completion_rate ? `${Math.round(data.completion_rate)}%` : "—"}
                            sub="this month"
                            icon={TrendingUp}
                            color="amber"
                        />
                    </div>

                    {/* Workload + Bottlenecks */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Team workload */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                <Users size={16} className="text-indigo-400" /> Team Workload
                            </h2>
                            {workload.length === 0 ? (
                                <p className="text-sm text-slate-600 text-center py-8">No workload data available</p>
                            ) : (
                                <div>
                                    {workload.slice(0, 10).map((m: any, i: number) => (
                                        <MemberWorkloadRow key={i} member={m} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottlenecks */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-orange-400" /> Bottlenecks
                            </h2>
                            {!data?.bottlenecks || data.bottlenecks.length === 0 ? (
                                <p className="text-sm text-slate-600 text-center py-8">No bottlenecks detected 🎉</p>
                            ) : (
                                <div>
                                    {data.bottlenecks.slice(0, 8).map((t: any, i: number) => (
                                        <BottleneckRow key={i} task={t} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SLA Breaches */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <Clock size={16} className="text-red-400" /> SLA Breach Risk
                        </h2>
                        {!data?.sla_risks || data.sla_risks.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">All tasks within SLA</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {data.sla_risks.slice(0, 6).map((t: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20"
                                    >
                                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-slate-300 truncate">{t.name}</p>
                                            <p className="text-xs text-red-400">{t.hours_until_breach}h until breach</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Task Status by Team */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <BarChart2 size={16} className="text-indigo-400" /> Task Status by Member
                        </h2>
                        {workload.length === 0 ? (
                            <p className="text-sm text-slate-600 text-center py-8">No data available</p>
                        ) : (
                            <div className="space-y-3">
                                {workload.slice(0, 6).map((m: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <p className="text-sm text-slate-400 w-32 truncate">{m.full_name}</p>
                                        <div className="flex-1 flex gap-1 h-6">
                                            {[
                                                { status: "completed", color: "bg-green-500", count: m.completed_count || 0 },
                                                { status: "in_progress", color: "bg-amber-500", count: m.in_progress_count || 0 },
                                                { status: "todo", color: "bg-indigo-500", count: m.todo_count || 0 },
                                                { status: "blocked", color: "bg-red-500", count: m.blocked_count || 0 },
                                            ].map(({ status, color, count }) => count > 0 ? (
                                                <div
                                                    key={status}
                                                    className={`h-full rounded ${color} flex items-center justify-center text-[9px] text-white`}
                                                    style={{ width: `${(count / Math.max(m.total_tasks || 1, 1)) * 100}%`, minWidth: count > 0 ? "20px" : "0" }}
                                                    title={`${status}: ${count}`}
                                                >
                                                    {count}
                                                </div>
                                            ) : null)}
                                        </div>
                                        <p className="text-xs text-slate-600 w-8 text-right">{m.total_tasks || 0}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
