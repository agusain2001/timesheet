"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Loader2, RefreshCw, FolderOpen, TrendingUp,
    AlertTriangle, CheckCircle2, BarChart2, Activity
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { ProjectDetailModal } from "@/components/DashboardPanels";
import { HowItWorks } from "@/components/ui/HowItWorks";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProjectHealth {
    project_id: string; project_name: string; status: string;
    health_score: string; progress: number; total_tasks: number;
    completed_tasks: number; overdue_tasks: number;
    budget_utilization?: number | null;
}

interface DeliveryTrend {
    month: string; on_time: number; delayed: number; cancelled: number;
}

interface ResourceUtil {
    team_name: string; utilization_percentage: number;
    capacity_hours: number; allocated_hours: number;
}

interface ExecutiveDashboard {
    project_health: ProjectHealth[];
    delivery_trends: DeliveryTrend[];
    resource_utilization: ResourceUtil[];
    summary: {
        total_projects: number; healthy_projects: number;
        at_risk_projects: number; critical_projects: number; avg_completion: number;
    };
}

// ─── Health badge ─────────────────────────────────────────────────────────────

const HEALTH: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    healthy: { bg: "bg-green-500/5", border: "border-green-500/20", text: "text-green-400", dot: "bg-green-500" },
    at_risk: { bg: "bg-amber-500/5", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-500" },
    critical: { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-500" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Executive Dashboard Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function ExecutiveDashboard() {
    const [data, setData] = useState<ExecutiveDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "healthy" | "at_risk" | "critical">("all");
    const [projectModal, setProjectModal] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const t = getToken();
            const r = await fetch(`${API}/api/dashboard/executive`, { headers: { Authorization: `Bearer ${t}` } });
            if (r.ok) setData(await r.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const d = data;
    const s = d?.summary;
    const filtered = d?.project_health.filter(p => filter === "all" || p.health_score === filter) ?? [];

    const KPI_CARDS = s ? [
        { label: "Total Projects", value: s.total_projects, filter: "all" as const, icon: FolderOpen, accent: "blue" },
        { label: "Healthy", value: s.healthy_projects, filter: "healthy" as const, icon: CheckCircle2, accent: "green" },
        { label: "At Risk", value: s.at_risk_projects, filter: "at_risk" as const, icon: AlertTriangle, accent: "amber" },
        { label: "Critical", value: s.critical_projects, filter: "critical" as const, icon: TrendingUp, accent: "red" },
    ] : [];

    return (
        <div className="space-y-6 bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
                    <p className="text-xs text-foreground/40 mt-1" suppressHydrationWarning>Organisation-wide view · {new Date().toLocaleTimeString()}</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/60 hover:text-foreground/90 text-sm transition-colors">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* How It Works */}
            <HowItWorks
                pageKey="executive-dashboard"
                color="purple"
                description="The Executive Dashboard gives a bird's-eye view of all projects, their health, delivery trends, and team utilization."
                bullets={[
                    "Click KPI cards (Healthy / At Risk / Critical) to filter the project health grid below.",
                    "Each project card is clickable — click one to see a detailed breakdown.",
                    "Delivery Trends shows month-by-month on-time vs delayed vs cancelled tasks.",
                    "Health score is calculated from task completion rate, overdue count, and SLA status.",
                ]}
            />

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-blue-400" />
                </div>
            ) : (
                <>
                    {/* KPI Cards — click to filter */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {KPI_CARDS.map(({ label, value, filter: f, icon: Icon, accent }) => {
                            const accents: Record<string, string> = {
                                blue: "bg-blue-500/10 text-blue-400", green: "bg-green-500/10 text-green-400",
                                amber: "bg-amber-500/10 text-amber-400", red: "bg-red-500/10 text-red-400",
                            };
                            const isActive = filter === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(isActive ? "all" : f)}
                                    className={`p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.99] ${isActive ? "border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20" : "border-foreground/10 bg-foreground/[0.02] hover:border-blue-500/20"}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accents[accent]}`}>
                                        <Icon size={20} />
                                    </div>
                                    <p className="text-3xl font-bold text-foreground/90 mb-0.5">{value}</p>
                                    <p className="text-sm text-foreground/55 font-medium">{label}</p>
                                    {isActive && <p className="text-[10px] text-blue-400 mt-1">Filtering · click to clear</p>}
                                </button>
                            );
                        })}
                    </div>

                    {s && (
                        <div className="p-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] flex items-center gap-6 flex-wrap">
                            <div className="flex items-center gap-2">
                                <BarChart2 size={16} className="text-blue-400" />
                                <span className="text-sm text-foreground/65">Avg Completion: <strong className="text-foreground/90">{s.avg_completion}%</strong></span>
                            </div>
                            {[
                                { label: "Healthy", pct: s.total_projects > 0 ? Math.round((s.healthy_projects / s.total_projects) * 100) : 0, color: "bg-green-500" },
                                { label: "At Risk", pct: s.total_projects > 0 ? Math.round((s.at_risk_projects / s.total_projects) * 100) : 0, color: "bg-amber-500" },
                                { label: "Critical", pct: s.total_projects > 0 ? Math.round((s.critical_projects / s.total_projects) * 100) : 0, color: "bg-red-500" },
                            ].map(({ label, pct, color }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${color}`} />
                                    <span className="text-xs text-foreground/50">{label}: <strong className="text-foreground/75">{pct}%</strong></span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Project Health Grid — click opens centered modal */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                                    <Activity size={14} className="text-blue-400" /> Project Health
                                </h2>
                                {filter !== "all" && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold capitalize">
                                        {filter.replace(/_/g, " ")} only
                                    </span>
                                )}
                                <span className="text-[10px] text-foreground/35 ml-auto">Click a card for details</span>
                            </div>

                            {filtered.length === 0 ? (
                                <div className="text-center py-16">
                                    <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
                                    <p className="text-sm text-foreground/45">No project health data</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {filtered.map(p => {
                                        const h = HEALTH[p.health_score] || HEALTH.at_risk;
                                        const barC = p.health_score === "healthy" ? "bg-green-500" : p.health_score === "at_risk" ? "bg-amber-500" : "bg-red-500";
                                        return (
                                            <button
                                                key={p.project_id}
                                                onClick={() => setProjectModal(p.project_id)}
                                                className={`w-full text-left p-4 rounded-2xl border ${h.bg} ${h.border} hover:brightness-110 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${h.dot}`} />
                                                    <span className="text-xs font-semibold text-foreground/75 truncate flex-1">{p.project_name}</span>
                                                    <span className={`text-[10px] font-bold ${h.text} shrink-0`}>{p.progress}%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden mb-2">
                                                    <div className={`h-full rounded-full ${barC}`} style={{ width: `${p.progress}%` }} />
                                                </div>
                                                <div className="flex justify-between text-[10px] text-foreground/40">
                                                    <span>{p.completed_tasks}/{p.total_tasks} tasks</span>
                                                    {p.overdue_tasks > 0 && <span className="text-red-400">{p.overdue_tasks} overdue</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Delivery Trends */}
                        <div className="space-y-4">
                            <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                                <h2 className="text-sm font-semibold text-foreground/70 mb-4 flex items-center gap-2">
                                    <TrendingUp size={14} className="text-blue-400" /> Delivery Trends
                                </h2>
                                {!d?.delivery_trends?.length ? (
                                    <p className="text-xs text-foreground/40 text-center py-4">No trend data</p>
                                ) : (
                                    <div className="space-y-3">
                                        {d.delivery_trends.map((t, i) => {
                                            const total = Math.max(t.on_time + t.delayed + t.cancelled, 1);
                                            return (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-foreground/45">{t.month}</span>
                                                        <span className="text-foreground/40">{t.on_time + t.delayed} tasks</span>
                                                    </div>
                                                    <div className="flex h-3 rounded-full overflow-hidden bg-foreground/[0.04] gap-0.5">
                                                        {t.on_time > 0 && <div className="bg-green-500 h-full" style={{ width: `${(t.on_time / total) * 100}%` }} title={`On time: ${t.on_time}`} />}
                                                        {t.delayed > 0 && <div className="bg-amber-500 h-full" style={{ width: `${(t.delayed / total) * 100}%` }} title={`Delayed: ${t.delayed}`} />}
                                                        {t.cancelled > 0 && <div className="bg-red-500/60 h-full" style={{ width: `${(t.cancelled / total) * 100}%` }} title={`Cancelled: ${t.cancelled}`} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-foreground/35">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> On time</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" /> Delayed</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/60 rounded-full" /> Cancelled</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Resource utilization by team */}
                            {d?.resource_utilization && d.resource_utilization.length > 0 && (
                                <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                                    <h2 className="text-sm font-semibold text-foreground/70 mb-3 flex items-center gap-2">
                                        <Activity size={14} className="text-blue-400" /> Team Utilization
                                    </h2>
                                    <div className="space-y-2.5">
                                        {d.resource_utilization.map((r, i) => (
                                            <div key={i} className="space-y-1">
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-foreground/55 truncate">{r.team_name}</span>
                                                    <span className={`font-bold ${r.utilization_percentage > 90 ? "text-red-400" : r.utilization_percentage > 70 ? "text-amber-400" : "text-green-400"}`}>{r.utilization_percentage}%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${r.utilization_percentage > 90 ? "bg-red-500" : r.utilization_percentage > 70 ? "bg-amber-500" : "bg-green-500"}`}
                                                        style={{ width: `${Math.min(r.utilization_percentage, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Centered Project Modal */}
            {projectModal && (
                <ProjectDetailModal
                    projectId={projectModal}
                    onClose={() => setProjectModal(null)}
                />
            )}
        </div>
    );
}
