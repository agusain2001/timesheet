"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, AlertTriangle, TrendingUp, CheckCircle2, BarChart2, Loader2, RefreshCw } from "lucide-react";
import {
    getManagerDashboard,
    type ManagerDashboard,
} from "@/services/dashboards";
import { getTeams } from "@/services/teams";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, icon: Icon, color = "indigo",
}: {
    label: string; value: string | number; sub?: string;
    icon: React.FC<{ size: number; className?: string }>; color?: string;
}) {
    const colorMap: Record<string, string> = {
        indigo: "bg-indigo-500/10 text-indigo-400",
        amber: "bg-amber-500/10  text-amber-400",
        red: "bg-red-500/10    text-red-400",
        green: "bg-green-500/10  text-green-400",
    };
    return (
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
                <Icon size={20} />
            </div>
            <p className="text-3xl font-bold text-slate-200 mb-1">{value}</p>
            <p className="text-sm font-medium text-slate-400">{label}</p>
            {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
        </div>
    );
}

// ─── Workload Bar Row ─────────────────────────────────────────────────────────

function WorkloadRow({ member }: { member: ManagerDashboard["workload_distribution"][0] }) {
    const pct = Math.min(100, Math.round(member.utilization ?? 0));
    const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500";
    return (
        <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                {(member.user_name || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300 truncate">{member.user_name}</p>
                <p className="text-xs text-slate-600">{member.task_count} task{member.task_count !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-3 w-36 shrink-0">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
            </div>
        </div>
    );
}

// ─── Bottleneck Row ───────────────────────────────────────────────────────────

function BottleneckRow({ item }: { item: ManagerDashboard["bottlenecks"][0] }) {
    const sevColor: Record<string, string> = {
        high: "bg-red-500/20 text-red-400",
        medium: "bg-amber-500/20 text-amber-400",
        low: "bg-slate-500/20 text-slate-400",
    };
    return (
        <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 capitalize ${sevColor[item.severity] || sevColor.low}`}>
                {item.severity}
            </span>
            <p className="flex-1 text-sm text-slate-300 truncate">{item.message}</p>
            {item.related_name && (
                <span className="text-xs text-slate-600 shrink-0 truncate max-w-[100px]">{item.related_name}</span>
            )}
        </div>
    );
}

// ─── Manager Dashboard ────────────────────────────────────────────────────────

export default function ManagerDashboard() {
    const [data, setData] = useState<ManagerDashboard | null>(null);
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [dash, tms] = await Promise.all([
                getManagerDashboard(selectedTeam || undefined),
                getTeams({ limit: 50 }),
            ]);
            setData(dash);
            setTeams(tms);
            setLastRefresh(new Date());
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedTeam]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Manager Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Last refreshed: {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Team filter */}
                    {teams.length > 0 && (
                        <select
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm"
                        >
                            <option value="">All Teams</option>
                            {teams.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                </div>
            ) : !data ? (
                <div className="text-center py-16 text-slate-500">Failed to load dashboard data</div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Team Tasks" value={data.team_tasks_total ?? 0}
                            sub="total assigned" icon={CheckCircle2} color="indigo"
                        />
                        <StatCard
                            label="In Progress" value={data.team_tasks_in_progress ?? 0}
                            sub="actively worked" icon={TrendingUp} color="amber"
                        />
                        <StatCard
                            label="Blocked" value={data.team_tasks_blocked ?? 0}
                            sub="need unblocking" icon={AlertTriangle} color="red"
                        />
                        <StatCard
                            label="Completed This Week" value={data.team_tasks_completed_this_week ?? 0}
                            sub={`velocity: ${data.team_velocity ?? 0}`} icon={Users} color="green"
                        />
                    </div>

                    {/* Workload + Bottlenecks */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Team Workload */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                <Users size={16} className="text-indigo-400" /> Team Workload
                            </h2>
                            {!data.workload_distribution || data.workload_distribution.length === 0 ? (
                                <p className="text-sm text-slate-600 text-center py-8">No workload data</p>
                            ) : (
                                <div>
                                    {data.workload_distribution.slice(0, 10).map((m, i) => (
                                        <WorkloadRow key={m.user_id ?? i} member={m} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottlenecks */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-400" /> Bottlenecks
                            </h2>
                            {!data.bottlenecks || data.bottlenecks.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">No bottlenecks detected 🎉</p>
                                </div>
                            ) : (
                                <div>
                                    {data.bottlenecks.slice(0, 8).map((b, i) => (
                                        <BottleneckRow key={i} item={b} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SLA Breaches */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-red-400" /> SLA Breach Tasks
                        </h2>
                        {!data.sla_breaches || data.sla_breaches.length === 0 ? (
                            <div className="flex items-center justify-center py-6">
                                <div className="text-center">
                                    <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">All tasks within SLA</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {data.sla_breaches.slice(0, 6).map((t, i) => (
                                    <div
                                        key={t.task_id ?? i}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20"
                                    >
                                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-slate-300 truncate">{t.task_name}</p>
                                            <p className="text-xs text-red-400 capitalize">{t.breach_type?.replace(/_/g, " ")}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Task status bar chart — member breakdown */}
                    {data.workload_distribution && data.workload_distribution.length > 0 && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                <BarChart2 size={16} className="text-indigo-400" /> Utilization by Member
                            </h2>
                            <div className="space-y-3">
                                {data.workload_distribution.slice(0, 8).map((m, i) => {
                                    const pct = Math.min(100, Math.round(m.utilization ?? 0));
                                    return (
                                        <div key={m.user_id ?? i} className="flex items-center gap-4">
                                            <p className="text-sm text-slate-400 w-32 truncate">{m.user_name}</p>
                                            <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                                                <div
                                                    className={`h-full rounded ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-indigo-500"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
