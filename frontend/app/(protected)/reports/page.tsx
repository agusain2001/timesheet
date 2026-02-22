"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart2, Download, RefreshCw, ChevronRight,
    Loader2, Calendar, Filter,
} from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) return null;
    return res.json();
}

// ─── Report Definitions ───────────────────────────────────────────────────────

const REPORTS = [
    { id: "task-aging", label: "Task Aging", description: "How long tasks have been open by status", endpoint: "/reports/task-aging" },
    { id: "completion-trend", label: "Completion Trends", description: "Tasks completed over time", endpoint: "/reports/completion-trends" },
    { id: "team-velocity", label: "Team Velocity", description: "Story points / tasks completed per sprint", endpoint: "/reports/team-velocity" },
    { id: "project-variance", label: "Project Variance", description: "Planned vs actual delivery", endpoint: "/reports/project-variance" },
    { id: "workload", label: "Workload Distribution", description: "Task count per team member", endpoint: "/reports/workload-distribution" },
    { id: "burndown", label: "Burn-Down", description: "Remaining work over time", endpoint: "/reports/burndown" },
    { id: "burnup", label: "Burn-Up", description: "Completed work over time", endpoint: "/reports/burnup" },
];

// ─── Simple Bar Chart ─────────────────────────────────────────────────────────

function SimpleBarChart({ data, labelKey, valueKey, color = "indigo" }: {
    data: any[]; labelKey: string; valueKey: string; color?: string;
}) {
    if (!data || data.length === 0) {
        return <p className="text-sm text-slate-600 text-center py-8">No data available</p>;
    }

    const max = Math.max(...data.map((d) => d[valueKey] || 0)) || 1;
    const BAR_COLORS: Record<string, string> = {
        indigo: "bg-indigo-500",
        green: "bg-green-500",
        amber: "bg-amber-500",
        violet: "bg-violet-500",
    };

    return (
        <div className="space-y-2">
            {data.slice(0, 10).map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                    <p className="text-xs text-slate-500 w-28 truncate text-right">{String(row[labelKey])}</p>
                    <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
                        <div
                            className={`h-full rounded ${BAR_COLORS[color] || BAR_COLORS.indigo} transition-all duration-500`}
                            style={{ width: `${(row[valueKey] / max) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 w-8 text-right">{row[valueKey]}</p>
                </div>
            ))}
        </div>
    );
}

// ─── Simple Line Chart ────────────────────────────────────────────────────────

function SimpleLineChart({ data, labelKey, valueKey }: { data: any[]; labelKey: string; valueKey: string }) {
    if (!data || data.length === 0) {
        return <p className="text-sm text-slate-600 text-center py-8">No data available</p>;
    }

    const max = Math.max(...data.map((d) => d[valueKey] || 0)) || 1;
    const width = 600;
    const height = 160;
    const padX = 40;
    const padY = 16;

    const points = data.map((d, i) => ({
        x: padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2),
        y: padY + (1 - d[valueKey] / max) * (height - padY * 2),
        label: String(d[labelKey]),
        value: d[valueKey],
    }));

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

    return (
        <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 300, height: 160 }}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                    <line
                        key={frac}
                        x1={padX} y1={padY + frac * (height - padY * 2)}
                        x2={width - padX} y2={padY + frac * (height - padY * 2)}
                        stroke="rgba(255,255,255,0.05)" strokeWidth={1}
                    />
                ))}
                {/* Area fill */}
                <path d={areaD} fill="url(#grad)" opacity={0.3} />
                <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                </defs>
                {/* Line */}
                <path d={pathD} stroke="#6366f1" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {/* Points */}
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" stroke="#1e293b" strokeWidth={1.5}>
                        <title>{`${p.label}: ${p.value}`}</title>
                    </circle>
                ))}
                {/* X labels (every nth) */}
                {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0).map((p, i) => (
                    <text key={i} x={p.x} y={height - 2} textAnchor="middle" fontSize={8} fill="#64748b">
                        {p.label.length > 8 ? p.label.slice(0, 8) : p.label}
                    </text>
                ))}
            </svg>
        </div>
    );
}

// ─── Report Viewer ────────────────────────────────────────────────────────────

function ReportViewer({ reportId }: { reportId: string }) {
    const def = REPORTS.find((r) => r.id === reportId);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    const fetchReport = useCallback(async () => {
        if (!def) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateRange.start) params.set("start_date", dateRange.start);
            if (dateRange.end) params.set("end_date", dateRange.end);
            const result = await apiFetch(`${def.endpoint}?${params.toString()}`);
            setData(result);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [def, dateRange]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    const handleExport = async (format: "pdf" | "excel" | "csv") => {
        try {
            const token = getToken();
            const res = await fetch(`${API}/api/reports/export?report=${reportId}&format=${format}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) { alert("Export failed"); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${reportId}.${format === "excel" ? "xlsx" : format}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert("Export is not available yet for this report");
        }
    };

    if (!def) return null;

    // Determine chart type
    const isLine = ["completion-trend", "burndown", "burnup", "team-velocity"].includes(reportId);
    const chartData = data?.data || data?.items || data?.results || (Array.isArray(data) ? data : []);
    const labelKey = data?.label_key || "label" in (chartData[0] || {}) ? "label" : Object.keys(chartData[0] || {})[0] || "label";
    const valueKey = data?.value_key || "value" in (chartData[0] || {}) ? "value" : Object.keys(chartData[0] || {})[1] || "value";

    return (
        <div className="flex-1 space-y-4">
            {/* Report header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-lg font-semibold text-slate-200">{def.label}</h2>
                    <p className="text-sm text-slate-500">{def.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Date range */}
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                        <Calendar size={12} className="text-slate-500" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
                            className="bg-transparent text-xs text-slate-400 w-28 outline-none"
                        />
                        <span className="text-slate-600">—</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
                            className="bg-transparent text-xs text-slate-400 w-28 outline-none"
                        />
                    </div>
                    <button
                        onClick={fetchReport}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-slate-300"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                    {/* Exports */}
                    {["csv", "excel", "pdf"].map((fmt) => (
                        <button
                            key={fmt}
                            onClick={() => handleExport(fmt as any)}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                        >
                            <Download size={12} /> {fmt.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart area */}
            <div className="p-5 rounded-2xl border border-white/10 bg-white/5 min-h-[240px] flex flex-col justify-center">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={28} className="animate-spin text-indigo-400" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="text-center py-12">
                        <BarChart2 size={40} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-600 text-sm">No data for the selected period</p>
                        <p className="text-slate-700 text-xs mt-1">Try adjusting the date range or ensure data is available</p>
                    </div>
                ) : isLine ? (
                    <SimpleLineChart data={chartData} labelKey={labelKey} valueKey={valueKey} />
                ) : (
                    <SimpleBarChart data={chartData} labelKey={labelKey} valueKey={valueKey} />
                )}
            </div>

            {/* Data table */}
            {chartData.length > 0 && (
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    {Object.keys(chartData[0] || {}).map((key) => (
                                        <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            {key.replace(/_/g, " ")}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {chartData.slice(0, 20).map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/3 transition-colors">
                                        {Object.values(row).map((val: any, j: number) => (
                                            <td key={j} className="px-4 py-3 text-xs text-slate-400">
                                                {String(val ?? "—")}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
    const [selectedReport, setSelectedReport] = useState(REPORTS[0].id);

    return (
        <div className="flex h-full min-h-screen bg-slate-950 text-slate-200">
            {/* Sidebar */}
            <div className="w-64 shrink-0 border-r border-white/10 p-4 bg-slate-900/30 space-y-1">
                <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 mb-3">Reports</h2>
                {REPORTS.map((r) => (
                    <button
                        key={r.id}
                        onClick={() => setSelectedReport(r.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm transition-colors ${selectedReport === r.id
                                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            }`}
                    >
                        <span className="truncate">{r.label}</span>
                        {selectedReport === r.id && <ChevronRight size={12} />}
                    </button>
                ))}
            </div>

            {/* Main */}
            <div className="flex-1 overflow-auto p-6">
                <ReportViewer reportId={selectedReport} />
            </div>
        </div>
    );
}
