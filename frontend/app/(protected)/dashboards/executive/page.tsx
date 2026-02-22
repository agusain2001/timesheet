"use client";

import { useState, useEffect, useCallback } from "react";
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
    Loader2, RefreshCw, Activity,
} from "lucide-react";
import { getExecutiveDashboard, type ExecutiveDashboard } from "@/services/dashboards";

// ─── RAG Badge ────────────────────────────────────────────────────────────────

function RAGBadge({ score }: { score: number }) {
    if (score >= 70) return (
        <span className="px-2 py-0.5 text-xs rounded-full border font-medium bg-green-500/20 text-green-400 border-green-500/30">On Track</span>
    );
    if (score >= 40) return (
        <span className="px-2 py-0.5 text-xs rounded-full border font-medium bg-amber-500/20 text-amber-400 border-amber-500/30">At Risk</span>
    );
    return (
        <span className="px-2 py-0.5 text-xs rounded-full border font-medium bg-red-500/20 text-red-400 border-red-500/30">Critical</span>
    );
}

// ─── Project Health Card ──────────────────────────────────────────────────────

function ProjectHealthCard({ project }: { project: ExecutiveDashboard["projects_health"][0] }) {
    const score = Math.round(project.health_score ?? project.progress ?? 0);
    const progress = Math.round(project.progress ?? 0);
    const barColor = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";

    return (
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-200 truncate">{project.project_name}</h3>
                    {project.end_date && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            Due {new Date(project.end_date).toLocaleDateString()}
                            {project.is_overdue && " · "}
                            {project.is_overdue && <span className="text-red-400">Overdue</span>}
                        </p>
                    )}
                </div>
                <RAGBadge score={score} />
            </div>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Progress</span><span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}

// ─── Executive Dashboard ──────────────────────────────────────────────────────

export default function ExecutiveDashboard() {
    const [data, setData] = useState<ExecutiveDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const d = await getExecutiveDashboard();
            setData(d);
            setLastRefresh(new Date());
        } catch (err) {
            console.error("Executive dashboard error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Executive Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Organisation-wide view · {lastRefresh.toLocaleTimeString()}
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
            ) : !data ? (
                <div className="text-center py-16 text-slate-500">Failed to load dashboard data</div>
            ) : (
                <>
                    {/* KPI row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Total Projects", value: data.total_projects, icon: Activity, sub: "all statuses" },
                            { label: "Active Projects", value: data.active_projects, icon: TrendingUp, sub: "in progress" },
                            { label: "At Risk", value: data.projects_at_risk, icon: AlertTriangle, sub: "need attention" },
                            { label: "Delayed", value: data.projects_delayed, icon: TrendingDown, sub: "behind schedule" },
                        ].map(({ label, value, icon: Icon, sub }) => (
                            <div key={label} className="p-5 rounded-2xl border border-white/10 bg-white/5">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3">
                                    <Icon size={18} className="text-indigo-400" />
                                </div>
                                <p className="text-3xl font-bold text-slate-200 mb-1">{value ?? 0}</p>
                                <p className="text-sm text-slate-400">{label}</p>
                                <p className="text-xs text-slate-600 mt-1">{sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Budget Summary */}
                    {(data.total_budget > 0 || data.total_spent > 0) && (
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: "Total Budget", value: `$${(data.total_budget ?? 0).toLocaleString()}` },
                                { label: "Total Spent", value: `$${(data.total_spent ?? 0).toLocaleString()}` },
                                { label: "Budget Utilization", value: `${Math.round(data.budget_utilization ?? 0)}%` },
                            ].map(({ label, value }) => (
                                <div key={label} className="p-4 rounded-2xl border border-white/10 bg-white/5 text-center">
                                    <p className="text-2xl font-bold text-slate-200">{value}</p>
                                    <p className="text-sm text-slate-500 mt-1">{label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Project Health Grid */}
                    <div>
                        <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <Activity size={16} className="text-indigo-400" /> Project Health
                        </h2>
                        {!data.projects_health || data.projects_health.length === 0 ? (
                            <div className="text-center py-12 text-slate-600">No project health data</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {data.projects_health.map((p, i) => (
                                    <ProjectHealthCard key={p.project_id ?? i} project={p} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Delivery Trends */}
                    {data.delivery_trends && data.delivery_trends.length > 0 && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                <TrendingUp size={16} className="text-green-400" /> Delivery Trends
                            </h2>
                            <div className="space-y-3">
                                {data.delivery_trends.map((d, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <p className="text-sm text-slate-400 w-24 truncate">{d.period}</p>
                                        <div className="flex-1 flex gap-2 h-5 items-center">
                                            <div
                                                className="h-full bg-green-500 rounded"
                                                style={{ width: `${((d.completed ?? 0) / Math.max(d.planned ?? 1, 1)) * 100}%`, minWidth: d.completed > 0 ? "8px" : "0" }}
                                                title={`Completed: ${d.completed}`}
                                            />
                                            <div
                                                className="h-full bg-slate-600 rounded"
                                                style={{ width: `${Math.max(0, 100 - ((d.completed ?? 0) / Math.max(d.planned ?? 1, 1)) * 100)}%` }}
                                                title={`Planned: ${d.planned}`}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-500 w-12 text-right">
                                            {Math.round(d.on_time_percentage ?? 0)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Delivery insights by RAG */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl border border-green-500/20 bg-green-500/5">
                            <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                                <CheckCircle2 size={14} /> On Track
                            </h3>
                            <p className="text-4xl font-bold text-green-400">{data.projects_on_track ?? 0}</p>
                            <p className="text-xs text-slate-600 mt-1">projects</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                            <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                                <AlertTriangle size={14} /> At Risk
                            </h3>
                            <p className="text-4xl font-bold text-amber-400">{data.projects_at_risk ?? 0}</p>
                            <p className="text-xs text-slate-600 mt-1">projects</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
                            <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                                <TrendingDown size={14} /> Delayed
                            </h3>
                            <p className="text-4xl font-bold text-red-400">{data.projects_delayed ?? 0}</p>
                            <p className="text-xs text-slate-600 mt-1">projects</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
