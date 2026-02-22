"use client";

import { useState, useEffect } from "react";
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
    Loader2, RefreshCw, DollarSign, BarChart2, Activity,
} from "lucide-react";
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

// ─── RAG Status ───────────────────────────────────────────────────────────────

function RAGBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; color: string }> = {
        green: { label: "On Track", color: "bg-green-500/20 text-green-400 border-green-500/30" },
        amber: { label: "At Risk", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
        red: { label: "Critical", color: "bg-red-500/20 text-red-400 border-red-500/30" },
    };
    const cfg = map[status] || map.green;
    return (
        <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

// ─── Project Health Card ──────────────────────────────────────────────────────

function ProjectHealthCard({ project }: { project: any }) {
    const health = Math.round(project.ai_health_score ?? project.progress ?? 0);
    const rag = health >= 70 ? "green" : health >= 40 ? "amber" : "red";
    const progress = Math.round(project.progress || 0);

    return (
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-200 truncate">{project.name}</h3>
                    {project.client_name && (
                        <p className="text-xs text-slate-500 mt-0.5">{project.client_name}</p>
                    )}
                </div>
                <RAGBadge status={rag} />
            </div>

            {/* Progress bar */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progress</span><span>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${rag === "red" ? "bg-red-500" : rag === "amber" ? "bg-amber-500" : "bg-green-500"
                            }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Risk factors */}
            {project.ai_risk_factors && project.ai_risk_factors.length > 0 && (
                <div className="flex items-start gap-1.5">
                    <AlertTriangle size={11} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                        {project.ai_risk_factors.slice(0, 2).join(" · ")}
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, trend, trendPositive, icon: Icon, unit = "" }: {
    label: string; value: string | number; trend?: number;
    trendPositive?: boolean; icon: any; unit?: string;
}) {
    return (
        <div className="p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/3">
            <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Icon size={18} className="text-indigo-400" />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs ${trendPositive ? "text-green-400" : "text-red-400"}`}>
                        {trendPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <p className="text-3xl font-bold text-slate-200">
                {value}{unit}
            </p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
        </div>
    );
}

// ─── Executive Dashboard ──────────────────────────────────────────────────────

export default function ExecutiveDashboard() {
    const [projects, setProjects] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchData = async () => {
        setLoading(true);
        try {
            const [proj, exec] = await Promise.all([
                apiFetch("/projects?limit=50"),
                apiFetch("/dashboard/executive"),
            ]);
            setProjects(proj || []);
            setSummary(exec);
            setLastRefresh(new Date());
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const activeProjects = projects.filter((p) => p.status === "active");
    const atRiskProjects = projects.filter((p) => (p.progress || 0) < 40 && p.status === "active");
    const completedProjects = projects.filter((p) => p.status === "completed");

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Executive Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Organisation-wide view · refreshed {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                </div>
            ) : (
                <>
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                            label="Active Projects"
                            value={activeProjects.length}
                            icon={Activity}
                        />
                        <KPICard
                            label="Completed Projects"
                            value={completedProjects.length}
                            icon={CheckCircle2}
                        />
                        <KPICard
                            label="At Risk"
                            value={atRiskProjects.length}
                            icon={AlertTriangle}
                        />
                        <KPICard
                            label="Portfolio Progress"
                            value={
                                projects.length > 0
                                    ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
                                    : 0
                            }
                            unit="%"
                            icon={TrendingUp}
                        />
                    </div>

                    {/* Project Health Grid */}
                    <div>
                        <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <Activity size={16} className="text-indigo-400" /> Project Health
                        </h2>
                        {projects.length === 0 ? (
                            <div className="text-center py-12 text-slate-600">No projects found</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {activeProjects.slice(0, 12).map((p) => (
                                    <ProjectHealthCard key={p.id} project={p} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Budget Overview */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <DollarSign size={16} className="text-green-400" /> Budget Overview
                        </h2>
                        {projects.filter((p) => p.budget).length === 0 ? (
                            <p className="text-sm text-slate-600 text-center py-6">No budget data configured</p>
                        ) : (
                            <div className="space-y-3">
                                {projects.filter((p) => p.budget).slice(0, 6).map((p) => {
                                    const used = ((p.actual_cost || 0) / p.budget) * 100;
                                    return (
                                        <div key={p.id} className="flex items-center gap-4">
                                            <p className="text-sm text-slate-400 w-40 truncate">{p.name}</p>
                                            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${used > 90 ? "bg-red-500" : used > 70 ? "bg-amber-500" : "bg-green-500"}`}
                                                    style={{ width: `${Math.min(100, used)}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500 w-20 text-right">
                                                ${(p.actual_cost || 0).toLocaleString()} / ${p.budget.toLocaleString()}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Delivery Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl border border-green-500/20 bg-green-500/5">
                            <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                                <CheckCircle2 size={14} /> On Track
                            </h3>
                            <p className="text-4xl font-bold text-green-400">
                                {projects.filter((p) => (p.progress || 0) >= 70 && p.status === "active").length}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">projects</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                            <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                                <AlertTriangle size={14} /> At Risk
                            </h3>
                            <p className="text-4xl font-bold text-amber-400">
                                {projects.filter((p) => (p.progress || 0) >= 30 && (p.progress || 0) < 70 && p.status === "active").length}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">projects</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
                            <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                                <TrendingDown size={14} /> Critical
                            </h3>
                            <p className="text-4xl font-bold text-red-400">
                                {projects.filter((p) => (p.progress || 0) < 30 && p.status === "active").length}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">projects</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
