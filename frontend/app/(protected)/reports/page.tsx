"use client";

import { useState, useCallback, useEffect } from "react";
import {
    BarChart2, TrendingUp, Users, Activity, Download, RefreshCw, Loader2,
    Flame, CheckCircle2, AlertTriangle, Clock, FolderKanban, Target,
    ChevronRight, TrendingDown, ArrowUpRight,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { getTeams } from "@/services/teams";
import { getProjects } from "@/services/projects";
import {
    getTaskAgingReport, getTaskCompletionReport, getTeamVelocityReport,
    getWorkloadDistributionReport, downloadReport,
    type ReportResult, type ReportFilters, type ExportFormat,
} from "@/services/reports";
import { useRouter } from "next/navigation";
import { HowItWorks } from "@/components/ui/HowItWorks";

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string) {
    const res = await fetch(`${API}/api${path}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("fetch failed");
    return res.json();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type ReportId = "dashboard" | "task_aging" | "completion_trends" | "team_velocity" | "workload" | "burn_chart" | "project_variance";

interface AnalyticsSummary {
    total_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    active_projects: number;
    total_hours_logged: number;
    avg_task_age_days: number;
    completion_rate: number;
    tasks_by_status: Record<string, number>;
    tasks_by_priority: Record<string, number>;
    completion_trend: { date: string; created: number; completed: number }[];
    project_summary: { id: string; name: string; status: string; progress: number; task_count: number; overdue_count: number }[];
    top_overdue_tasks: { id: string; name: string; priority: string; overdue_days: number; project_name: string | null; assignee_name: string | null }[];
}

const REPORT_MENU: { id: ReportId; label: string; Icon: any }[] = [
    { id: "dashboard", label: "Analytics Dashboard", Icon: BarChart2 },
    { id: "task_aging", label: "Task Aging", Icon: Activity },
    { id: "completion_trends", label: "Completion Trends", Icon: TrendingUp },
    { id: "team_velocity", label: "Team Velocity", Icon: Users },
    { id: "workload", label: "Workload Distribution", Icon: BarChart2 },
    { id: "project_variance", label: "Project Variance", Icon: TrendingUp },
    { id: "burn_chart", label: "Burn Chart", Icon: Flame },
];

// ─── Priority Badge ─────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
    const styles: Record<string, string> = {
        critical: "bg-red-500/20 text-red-400 border border-red-500/30",
        high: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
        urgent: "bg-red-500/20 text-red-400 border border-red-500/30",
        medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
        low: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${styles[priority] ?? "bg-foreground/10 text-foreground/50"}`}>
            {priority}
        </span>
    );
}

// ─── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        active: "bg-blue-500/20 text-blue-400",
        completed: "bg-emerald-500/20 text-emerald-400",
        on_hold: "bg-yellow-500/20 text-yellow-400",
        draft: "bg-foreground/10 text-foreground/50",
        archived: "bg-foreground/5 text-foreground/40",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${styles[status] ?? "bg-foreground/10 text-foreground/50"}`}>
            {status?.replace(/_/g, " ")}
        </span>
    );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, Icon, color }: { label: string; value: string | number; sub?: string; Icon: any; color: string }) {
    return (
        <div className={`relative p-4 rounded-2xl border border-white/8 bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-all duration-200 overflow-hidden group`}>
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${color} blur-2xl`} style={{ transform: "scale(0.5)" }} />
            <div className="relative flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${color} bg-opacity-20`}>
                    <Icon size={16} className={color.includes("blue") ? "text-blue-400" : color.includes("emerald") ? "text-emerald-400" : color.includes("red") ? "text-red-400" : color.includes("violet") ? "text-violet-400" : color.includes("amber") ? "text-amber-400" : "text-slate-400"} />
                </div>
                {sub && <span className="text-[10px] text-foreground/40">{sub}</span>}
            </div>
            <p className="text-2xl font-bold text-foreground/90 mb-0.5 tabular-nums">{value}</p>
            <p className="text-xs text-foreground/50">{label}</p>
        </div>
    );
}

// ─── Mini Line Chart ────────────────────────────────────────────────────────────

function TrendLine({ data, valueKey, color = "#6366f1" }: { data: any[]; valueKey: string; color?: string }) {
    if (!data || data.length === 0) return <p className="text-foreground/40 text-xs text-center py-6">No data</p>;
    const W = 500, H = 140, PAD = { top: 8, right: 12, bottom: 28, left: 32 };
    const vals = data.map(d => Number(d[valueKey]) || 0);
    const maxY = Math.max(...vals, 1);
    const sx = (i: number) => PAD.left + i * ((W - PAD.left - PAD.right) / Math.max(data.length - 1, 1));
    const sy = (v: number) => PAD.top + (1 - v / maxY) * (H - PAD.top - PAD.bottom);
    const pathD = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(v)}`).join(" ");
    const area = `${pathD} L ${sx(data.length - 1)} ${H - PAD.bottom} L ${sx(0)} ${H - PAD.bottom} Z`;

    const sampleLabels = data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ maxHeight: H }}>
            {[0, 0.5, 1].map(t => (
                <line key={t} x1={PAD.left} x2={W - PAD.right}
                    y1={sy(maxY * t)} y2={sy(maxY * t)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            ))}
            <defs>
                <linearGradient id={`grad-${valueKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#grad-${valueKey})`} />
            <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {sampleLabels.map((row, i) => {
                const idx = data.indexOf(row);
                return (
                    <text key={idx} x={sx(idx)} y={H - 6} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.3)">
                        {String(row.date).slice(5)}
                    </text>
                );
            })}
            {/* Dots at data points */}
            {vals.map((v, i) => (
                <circle key={i} cx={sx(i)} cy={sy(v)} r={data.length <= 15 ? 2.5 : 0} fill={color} />
            ))}
        </svg>
    );
}

// ─── Dual Line Chart ─────────────────────────────────────────────────────────────

function DualTrendChart({ data }: { data: { date: string; created: number; completed: number }[] }) {
    if (!data || data.length === 0) return <p className="text-foreground/40 text-xs text-center py-6">No data</p>;
    const W = 500, H = 140, PAD = { top: 8, right: 12, bottom: 28, left: 32 };
    const allVals = data.flatMap(d => [d.created, d.completed]);
    const maxY = Math.max(...allVals, 1);
    const sx = (i: number) => PAD.left + i * ((W - PAD.left - PAD.right) / Math.max(data.length - 1, 1));
    const sy = (v: number) => PAD.top + (1 - v / maxY) * (H - PAD.top - PAD.bottom);
    const makePath = (key: "created" | "completed") =>
        data.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(d[key])}`).join(" ");

    const sampleIdxs = [0, Math.floor(data.length / 2), data.length - 1];

    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ maxHeight: H }}>
                {[0, 0.5, 1].map(t => (
                    <line key={t} x1={PAD.left} x2={W - PAD.right}
                        y1={sy(maxY * t)} y2={sy(maxY * t)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                ))}
                <path d={makePath("created")} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" />
                <path d={makePath("completed")} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" />
                {sampleIdxs.map(i => (
                    <text key={i} x={sx(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.3)">
                        {String(data[i]?.date).slice(5)}
                    </text>
                ))}
            </svg>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-foreground/50">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-500 block rounded" />Created</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 block rounded" />Completed</span>
            </div>
        </div>
    );
}

// ─── SVG Bar Chart ──────────────────────────────────────────────────────────────

function BarChart({ data, labelKey, valueKey, colors: barColors }: {
    data: Record<string, unknown>[]; labelKey: string; valueKey: string; colors?: string[];
}) {
    if (!data || data.length === 0) return <p className="text-foreground/40 text-sm text-center py-8">No data</p>;
    const W = 500, H = 180, PAD = { top: 10, right: 10, bottom: 32, left: 36 };
    const vals = data.map(d => Number(d[valueKey]) || 0);
    const maxY = Math.max(...vals, 1);
    const barW = ((W - PAD.left - PAD.right) / data.length) - 6;
    const defaultColors = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#f97316", "#14b8a6"];

    const sx = (i: number) => PAD.left + i * ((W - PAD.left - PAD.right) / data.length) + 3;
    const sy = (v: number) => PAD.top + (1 - v / maxY) * (H - PAD.top - PAD.bottom);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ maxHeight: H }}>
            {[0, 0.5, 1].map(t => (
                <line key={t} x1={PAD.left} x2={W - PAD.right}
                    y1={sy(maxY * t)} y2={sy(maxY * t)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            ))}
            {data.map((row, i) => {
                const v = vals[i];
                const barH = (v / maxY) * (H - PAD.top - PAD.bottom);
                const col = (barColors ?? defaultColors)[i % (barColors ?? defaultColors).length];
                return (
                    <g key={i}>
                        <rect x={sx(i)} y={sy(v)} width={barW} height={Math.max(barH, 2)} rx={4} fill={col} opacity={0.85} />
                        <text x={sx(i) + barW / 2} y={H - 10} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.35)">
                            {String(row[labelKey]).slice(0, 10).replace(/_/g, " ")}
                        </text>
                        {barH > 20 && (
                            <text x={sx(i) + barW / 2} y={sy(v) - 4} textAnchor="middle" fontSize={9} fill={col}>
                                {v}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Data Table ─────────────────────────────────────────────────────────────────

function DataTable({ data, onRowClick }: { data: Record<string, unknown>[]; onRowClick?: (row: Record<string, unknown>) => void }) {
    if (!data || data.length === 0) return <p className="text-foreground/40 text-sm text-center py-4">No rows</p>;
    const keys = Object.keys(data[0] || {}).slice(0, 8);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        {keys.map(k => (
                            <th key={k} className="text-left px-3 py-2 text-xs text-foreground/50 border-b border-foreground/10 font-medium capitalize">
                                {k.replace(/_/g, " ")}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.slice(0, 50).map((row, i) => (
                        <tr key={i}
                            className={`border-b border-foreground/5 hover:bg-foreground/[0.02] transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                            onClick={() => onRowClick?.(row)}>
                            {keys.map(k => (
                                <td key={k} className="px-3 py-2 text-foreground/60 text-xs truncate max-w-[150px]">
                                    {String(row[k] ?? "—")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Burn Chart Panel ────────────────────────────────────────────────────────────

function BurnChartPanel({ projectId }: { projectId: string }) {
    const [type, setType] = useState<"down" | "up">("down");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const endpoint = type === "down" ? "burn-down" : "burn-up";
            const r = await apiFetch(`/reports/${endpoint}?project_id=${projectId}`);
            setData(r.data || []);
        } catch { setData([]); }
        finally { setLoading(false); }
    }, [projectId, type]);

    useEffect(() => { load(); }, [load]);

    if (!projectId) return (
        <div className="flex items-center justify-center h-48 text-foreground/50 text-sm">
            Select a project to view the burn chart.
        </div>
    );
    if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-400" /></div>;
    if (data.length === 0) return <div className="text-center py-16 text-foreground/40 text-sm">No data found for this project.</div>;

    const W = 540, H = 180, PAD = 30;
    const dates = data.map(d => d.date);
    const idealVals = data.map(d => d.ideal_remaining ?? d.total_scope ?? 0);
    const actualVals = data.map(d => d.actual_remaining ?? d.completed ?? 0);
    const allVals = [...idealVals, ...actualVals];
    const maxV = Math.max(...allVals, 1);
    const scaleX = (i: number) => PAD + (i / Math.max(dates.length - 1, 1)) * (W - PAD * 2);
    const scaleY = (v: number) => PAD + (1 - v / maxV) * (H - PAD * 2);
    const toPath = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(" ");

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {(["down", "up"] as const).map(t => (
                    <button key={t} onClick={() => setType(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${type === t ? "bg-blue-600 text-white" : "text-foreground/50 hover:text-foreground/80 bg-foreground/[0.02]"}`}>
                        Burn-{t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>
            <div className="rounded-xl bg-foreground/[0.01] border border-white/8 p-4">
                <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
                    {[0, 0.25, 0.5, 0.75, 1].map(p => (
                        <line key={p} x1={PAD} y1={scaleY(maxV * p)} x2={W - PAD} y2={scaleY(maxV * p)}
                            stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                    ))}
                    <path d={toPath(idealVals)} fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
                    <path d={toPath(actualVals)} fill="none" stroke="#22c55e" strokeWidth={2} />
                    <path d={`${toPath(actualVals)} L${scaleX(dates.length - 1)},${H - PAD} L${scaleX(0)},${H - PAD} Z`}
                        fill="url(#actualGrad)" opacity={0.15} />
                    <defs>
                        <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {[0, Math.floor(dates.length / 2), dates.length - 1].map(i => (
                        <text key={i} x={scaleX(i)} y={H - 4} textAnchor="middle"
                            fontSize={9} fill="rgba(255,255,255,0.3)">{dates[i]?.slice(5)}</text>
                    ))}
                </svg>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-foreground/50">
                    <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-blue-500 block opacity-60" style={{ borderTop: '1.5px dashed' }} />Ideal</span>
                    <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-green-500 block" />Actual</span>
                </div>
            </div>
        </div>
    );
}

// ─── Analytics Dashboard Panel ──────────────────────────────────────────────────

function AnalyticsDashboard() {
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const router = useRouter();

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await apiFetch("/reports/analytics-summary");
            setSummary(data);
        } catch (e: any) {
            setError(e?.message || "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
                <Loader2 size={28} className="animate-spin text-blue-400 mx-auto" />
                <p className="text-foreground/50 text-sm">Loading analytics...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertTriangle size={32} className="text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={load} className="text-xs text-blue-400 hover:text-blue-300">Retry</button>
        </div>
    );

    if (!summary) return null;

    const statusColors: Record<string, string> = {
        todo: "#6366f1", in_progress: "#3b82f6", review: "#8b5cf6",
        completed: "#22c55e", done: "#10b981", blocked: "#ef4444",
        cancelled: "#6b7280", waiting: "#f59e0b", backlog: "#94a3b8",
        draft: "#475569", open: "#60a5fa", overdue: "#f97316",
    };

    const statusData = Object.entries(summary.tasks_by_status).map(([k, v]) => ({ label: k, value: v }));
    const priorityData = Object.entries(summary.tasks_by_priority).map(([k, v]) => ({ label: k, value: v }));
    const priorityColors = ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#6b7280"];

    return (
        <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                <KpiCard label="Total Tasks" value={summary.total_tasks} Icon={Activity} color="bg-violet-500/10" />
                <KpiCard label="Completed" value={summary.completed_tasks} sub={`${summary.completion_rate}%`} Icon={CheckCircle2} color="bg-emerald-500/10" />
                <KpiCard label="Overdue" value={summary.overdue_tasks} Icon={AlertTriangle} color="bg-red-500/10" />
                <KpiCard label="Active Projects" value={summary.active_projects} Icon={FolderKanban} color="bg-blue-500/10" />
                <KpiCard label="Hours Logged" value={`${summary.total_hours_logged}h`} sub="last 30 days" Icon={Clock} color="bg-amber-500/10" />
                <KpiCard label="Avg Task Age" value={`${summary.avg_task_age_days}d`} Icon={TrendingDown} color="bg-slate-500/10" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Completion Trend */}
                <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground/80">Completion Trend</h3>
                            <p className="text-xs text-foreground/40 mt-0.5">Tasks created vs completed — last 30 days</p>
                        </div>
                        <TrendingUp size={14} className="text-foreground/30" />
                    </div>
                    <DualTrendChart data={summary.completion_trend} />
                </div>

                {/* Tasks by Status */}
                <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground/80">Tasks by Status</h3>
                            <p className="text-xs text-foreground/40 mt-0.5">Distribution across all task statuses</p>
                        </div>
                        <BarChart2 size={14} className="text-foreground/30" />
                    </div>
                    <BarChart
                        data={statusData}
                        labelKey="label"
                        valueKey="value"
                        colors={statusData.map(d => statusColors[d.label] ?? "#6366f1")}
                    />
                </div>
            </div>

            {/* Priority Breakdown + Project Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Priority = 2 cols */}
                <div className="lg:col-span-2 p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-4">Tasks by Priority</h3>
                    <BarChart
                        data={priorityData}
                        labelKey="label"
                        valueKey="value"
                        colors={priorityColors}
                    />
                </div>

                {/* Projects = 3 cols */}
                <div className="lg:col-span-3 p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-foreground/80">Project Summary</h3>
                        <button onClick={() => router.push("/projects")} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                            View all <ChevronRight size={10} />
                        </button>
                    </div>
                    {summary.project_summary.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">No projects found</div>
                    ) : (
                        <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
                            {summary.project_summary.map(p => (
                                <div key={p.id}
                                    onClick={() => router.push("/projects")}
                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition-colors cursor-pointer group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-xs font-medium text-foreground/80 truncate">{p.name}</p>
                                            <StatusBadge status={p.status} />
                                        </div>
                                        <div className="w-full bg-foreground/10 rounded-full h-1">
                                            <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${Math.min(p.progress, 100)}%` }} />
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-foreground/60 tabular-nums">{p.task_count} tasks</p>
                                        {p.overdue_count > 0 && (
                                            <p className="text-[10px] text-red-400">{p.overdue_count} overdue</p>
                                        )}
                                    </div>
                                    <ArrowUpRight size={12} className="text-foreground/20 group-hover:text-foreground/50 transition-colors shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Top Overdue Tasks */}
            {summary.top_overdue_tasks.length > 0 && (
                <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/[0.02]">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={14} className="text-red-400" />
                        <h3 className="text-sm font-semibold text-foreground/80">Top Overdue Tasks</h3>
                        <span className="ml-auto text-xs text-foreground/40">Most overdue first</span>
                    </div>
                    <div className="space-y-2">
                        {summary.top_overdue_tasks.map(t => (
                            <div key={t.id}
                                onClick={() => router.push("/tasks/all")}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition-colors cursor-pointer group">
                                <PriorityBadge priority={t.priority} />
                                <p className="text-xs text-foreground/75 flex-1 truncate">{t.name}</p>
                                {t.project_name && (
                                    <span className="text-[10px] text-foreground/40 shrink-0">{t.project_name}</span>
                                )}
                                <span className="text-[10px] text-red-400 shrink-0 font-medium tabular-nums">
                                    {t.overdue_days}d overdue
                                </span>
                                {t.assignee_name && (
                                    <span className="text-[10px] text-foreground/40 shrink-0">{t.assignee_name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Refresh */}
            <div className="flex justify-end">
                <button onClick={load} className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/70 transition-colors">
                    <RefreshCw size={12} />Refresh
                </button>
            </div>
        </div>
    );
}

// ─── Reports Page ───────────────────────────────────────────────────────────────

export default function ReportsPage() {
    const [activeReport, setActiveReport] = useState<ReportId>("dashboard");
    const [result, setResult] = useState<ReportResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState<ExportFormat | null>(null);

    // Filters
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [teamId, setTeamId] = useState("");
    const [burnProjectId, setBurnProjectId] = useState("");
    const [varianceProjectId, setVarianceProjectId] = useState("");
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const router = useRouter();

    useEffect(() => {
        getTeams({ limit: 50 }).then(t => setTeams(t)).catch(() => { });
        getProjects({ limit: 50 }).then((r: any) => setProjects(r?.items ?? r ?? [])).catch(() => { });
    }, []);

    const buildFilters = (): ReportFilters => ({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        team_ids: teamId ? [teamId] : undefined,
    });

    const fetchReport = useCallback(async (id: ReportId = activeReport) => {
        if (id === "dashboard") return;
        setLoading(true);
        setError("");
        setResult(null);
        const filters = buildFilters();
        try {
            let r: ReportResult;
            if (id === "task_aging") r = await getTaskAgingReport(filters);
            else if (id === "completion_trends") r = await getTaskCompletionReport(filters);
            else if (id === "team_velocity") r = await getTeamVelocityReport(teamId || "all", filters);
            else if (id === "project_variance") {
                if (!varianceProjectId) { setError("Select a project first"); return; }
                r = await apiFetch(`/reports/project/${varianceProjectId}/variance?include_tasks=true`) as ReportResult;
            }
            else r = await getWorkloadDistributionReport(filters);
            setResult(r);
        } catch (e: any) {
            setError(e?.message || "Failed to load report");
        } finally {
            setLoading(false);
        }
    }, [activeReport, dateFrom, dateTo, teamId, varianceProjectId]);

    const handleExport = async (fmt: ExportFormat) => {
        setExporting(fmt);
        try { await downloadReport(activeReport as any, fmt, buildFilters()); }
        catch { /* silent */ }
        finally { setExporting(null); }
    };

    const handleSelectReport = (id: ReportId) => {
        setActiveReport(id);
        setResult(null);
        setError("");
    };

    const isLineChart = ["completion_trends"].includes(activeReport);
    const chartData = result?.data ?? result?.charts?.[0]?.data ?? [];
    const xKey = isLineChart ? "date" : (Object.keys(chartData[0] || {})[0] ?? "name");
    const yKey = isLineChart ? "completed" : (Object.keys(chartData[0] || {})[1] ?? "value");

    return (
        <div className="min-h-screen flex bg-background text-foreground">
            {/* Sidebar */}
            <aside className="w-56 border-r border-foreground/10 bg-foreground/[0.01] p-4 flex flex-col gap-1 shrink-0">
                <h2 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3">Reports</h2>
                {REPORT_MENU.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => handleSelectReport(id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${activeReport === id
                            ? "bg-blue-600/20 text-blue-300 font-medium"
                            : "text-foreground/60 hover:bg-foreground/[0.02] hover:text-foreground/90"}`}>
                        <Icon size={14} />{label}
                    </button>
                ))}
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col p-6 gap-6 min-w-0 overflow-y-auto">
                <HowItWorks
                    pageKey="reports"
                    description="Generate analytics reports by selecting a report type from the left sidebar, applying filters, and clicking Run Report."
                    bullets={[
                        "Analytics Dashboard: auto-loads live KPIs, charts, and project summaries.",
                        "Task Aging: shows tasks that have been open too long — helps surface stale work.",
                        "Team Velocity: measures how many tasks are completed per sprint/week.",
                        "Burn Chart: requires selecting a project, then shows burn-down/up progress.",
                        "Export to CSV or Excel once a report is generated.",
                    ]}
                />
                {activeReport === "dashboard" ? (
                    <AnalyticsDashboard />
                ) : (
                    <>
                        {/* Filters + Actions */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {activeReport === "burn_chart" ? (
                                <select
                                    value={burnProjectId} onChange={e => setBurnProjectId(e.target.value)}
                                    className="px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/80 text-sm w-64">
                                    <option value="">Select project...</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            ) : activeReport === "project_variance" ? (
                                <select
                                    value={varianceProjectId} onChange={e => setVarianceProjectId(e.target.value)}
                                    className="px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/80 text-sm w-64">
                                    <option value="">Select project for variance...</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            ) : (
                                <>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                        className="px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/80 text-sm" />
                                    <span className="text-foreground/40 text-sm">to</span>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                        className="px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/80 text-sm" />
                                    {teams.length > 0 && (
                                        <select value={teamId} onChange={e => setTeamId(e.target.value)}
                                            className="px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/80 text-sm">
                                            <option value="">All Teams</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    )}
                                </>
                            )}

                            {activeReport !== "burn_chart" && (
                                <button onClick={() => fetchReport()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Run Report
                                </button>
                            )}

                            {result && (
                                <>
                                    {(["csv", "excel"] as ExportFormat[]).map(fmt => (
                                        <button key={fmt} onClick={() => handleExport(fmt)} disabled={!!exporting}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/60 hover:text-foreground/90 text-xs transition-colors disabled:opacity-50 uppercase">
                                            {exporting === fmt ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                            {fmt}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Report Content */}
                        <div className="flex-1 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
                            {activeReport === "burn_chart" ? (
                                <BurnChartPanel projectId={burnProjectId} />
                            ) : loading ? (
                                <div className="flex items-center justify-center h-48">
                                    <Loader2 size={28} className="animate-spin text-blue-400" />
                                </div>
                            ) : error ? (
                                <div className="text-center py-12 text-red-400 text-sm">{error}</div>
                            ) : !result ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-3">
                                    <BarChart2 size={40} className="text-foreground/30" />
                                    <p className="text-foreground/50 text-sm">Configure filters and click Run Report</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {result.summary && Object.keys(result.summary).length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {Object.entries(result.summary).slice(0, 4).map(([k, v]) => (
                                                <div key={k} className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10">
                                                    <p className="text-xs text-foreground/50 mb-1 capitalize">{k.replace(/_/g, " ")}</p>
                                                    <p className="text-lg font-bold text-foreground/90">{String(v)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {chartData.length > 0 && (
                                        <div className="p-4 rounded-xl bg-foreground/[0.01] border border-white/8">
                                            {isLineChart
                                                ? <TrendLine data={chartData as any} valueKey={yKey} />
                                                : <BarChart data={chartData as any} labelKey={xKey} valueKey={yKey} />
                                            }
                                        </div>
                                    )}
                                    {result.data && result.data.length > 0 && (
                                        <DataTable data={result.data} onRowClick={row => {
                                            if (row.id || row.task_id) router.push("/tasks/all");
                                            else if (row.project_id) router.push("/projects");
                                            else if (row.user_id) router.push("/employees");
                                        }} />
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
