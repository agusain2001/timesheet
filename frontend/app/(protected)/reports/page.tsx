"use client";

import { useState, useCallback } from "react";
import {
    BarChart2, TrendingUp, Users, Activity, Download, RefreshCw, Loader2,
} from "lucide-react";
import {
    getTaskAgingReport, getTaskCompletionReport, getTeamVelocityReport,
    getWorkloadDistributionReport, downloadReport,
    type ReportResult, type ReportFilters, type ExportFormat,
} from "@/services/reports";
import { getTeams } from "@/services/teams";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportId = "task_aging" | "completion_trends" | "team_velocity" | "workload";

const REPORT_MENU: { id: ReportId; label: string; Icon: any }[] = [
    { id: "task_aging", label: "Task Aging", Icon: Activity },
    { id: "completion_trends", label: "Completion Trends", Icon: TrendingUp },
    { id: "team_velocity", label: "Team Velocity", Icon: Users },
    { id: "workload", label: "Workload Distribution", Icon: BarChart2 },
];

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

function LineChart({ data, xKey, yKey, label }: {
    data: Record<string, unknown>[];
    xKey: string; yKey: string; label?: string;
}) {
    if (!data || data.length === 0) return (
        <p className="text-slate-600 text-sm text-center py-8">No data</p>
    );
    const W = 600, H = 200, PAD = { top: 10, right: 20, bottom: 30, left: 40 };
    const vals = data.map((d) => Number(d[yKey]) || 0);
    const maxY = Math.max(...vals, 1);
    const scaleX = (i: number) => PAD.left + i * ((W - PAD.left - PAD.right) / Math.max(data.length - 1, 1));
    const scaleY = (v: number) => H - PAD.bottom - (v / maxY) * (H - PAD.top - PAD.bottom);
    const d = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(v)}`).join(" ");
    const area = `${d} L ${scaleX(vals.length - 1)} ${H - PAD.bottom} L ${scaleX(0)} ${H - PAD.bottom} Z`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ maxHeight: 200 }}>
            {/* gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <line key={t}
                    x1={PAD.left} x2={W - PAD.right}
                    y1={scaleY(maxY * t)} y2={scaleY(maxY * t)}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={1}
                />
            ))}
            <path d={area} fill="rgba(99,102,241,0.12)" />
            <path d={d} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {/* x labels */}
            {data.filter((_, i) => data.length <= 8 || i % Math.ceil(data.length / 8) === 0).map((row, i) => {
                const idx = data.indexOf(row);
                return (
                    <text key={idx} x={scaleX(idx)} y={H - 8} textAnchor="middle" fontSize={10} fill="#64748b">
                        {String(row[xKey]).slice(0, 8)}
                    </text>
                );
            })}
        </svg>
    );
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data, labelKey, valueKey }: {
    data: Record<string, unknown>[]; labelKey: string; valueKey: string;
}) {
    if (!data || data.length === 0) return <p className="text-slate-600 text-sm text-center py-8">No data</p>;
    const W = 600, H = 200, PAD = { top: 10, right: 10, bottom: 30, left: 40 };
    const vals = data.map((d) => Number(d[valueKey]) || 0);
    const maxY = Math.max(...vals, 1);
    const barW = (W - PAD.left - PAD.right) / data.length - 4;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ maxHeight: 200 }}>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <line key={t}
                    x1={PAD.left} x2={W - PAD.right}
                    y1={PAD.top + (1 - t) * (H - PAD.top - PAD.bottom)}
                    y2={PAD.top + (1 - t) * (H - PAD.top - PAD.bottom)}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={1}
                />
            ))}
            {data.map((row, i) => {
                const v = vals[i];
                const barH = (v / maxY) * (H - PAD.top - PAD.bottom);
                const x = PAD.left + i * ((W - PAD.left - PAD.right) / data.length) + 2;
                return (
                    <g key={i}>
                        <rect
                            x={x} y={H - PAD.bottom - barH} width={barW} height={Math.max(barH, 1)}
                            rx={3} fill="#6366f1" opacity={0.8}
                        />
                        <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#64748b">
                            {String(row[labelKey]).slice(0, 6)}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Data Table ───────────────────────────────────────────────────────────────

function DataTable({ data }: { data: Record<string, unknown>[] }) {
    if (!data || data.length === 0) return <p className="text-slate-600 text-sm text-center py-4">No rows</p>;
    const keys = Object.keys(data[0] || {}).slice(0, 8);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        {keys.map((k) => (
                            <th key={k} className="text-left px-3 py-2 text-xs text-slate-500 border-b border-white/10 font-medium capitalize">
                                {k.replace(/_/g, " ")}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                            {keys.map((k) => (
                                <td key={k} className="px-3 py-2 text-slate-400 text-xs truncate max-w-[150px]">
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

// ─── Reports Page ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
    const [activeReport, setActiveReport] = useState<ReportId>("task_aging");
    const [result, setResult] = useState<ReportResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState<ExportFormat | null>(null);

    // Filters
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [teamId, setTeamId] = useState("");
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

    // Load teams for filter
    const loadTeams = useCallback(async () => {
        try {
            const t = await getTeams({ limit: 50 });
            setTeams(t);
        } catch { }
    }, []);

    useState(() => { loadTeams(); });

    const buildFilters = (): ReportFilters => ({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        team_ids: teamId ? [teamId] : undefined,
    });

    const fetchReport = useCallback(async (id: ReportId = activeReport) => {
        setLoading(true);
        setError("");
        setResult(null);
        const filters = buildFilters();
        try {
            let r: ReportResult;
            if (id === "task_aging") r = await getTaskAgingReport(filters);
            else if (id === "completion_trends") r = await getTaskCompletionReport(filters);
            else if (id === "team_velocity") r = await getTeamVelocityReport(teamId || "all", filters);
            else r = await getWorkloadDistributionReport(filters);
            setResult(r);
        } catch (e: any) {
            setError(e?.message || "Failed to load report");
        } finally {
            setLoading(false);
        }
    }, [activeReport, dateFrom, dateTo, teamId]);

    const handleExport = async (fmt: ExportFormat) => {
        setExporting(fmt);
        try {
            await downloadReport(activeReport as any, fmt, buildFilters());
        } catch { /* silent */ }
        finally { setExporting(null); }
    };

    const handleSelectReport = (id: ReportId) => {
        setActiveReport(id);
        setResult(null);
    };

    // Determine chart type & keys
    const isLineChart = ["completion_trends"].includes(activeReport);
    const chartData = result?.data ?? result?.charts?.[0]?.data ?? [];
    const xKey = isLineChart ? "date" : (Object.keys(chartData[0] || {})[0] ?? "name");
    const yKey = isLineChart ? "completed" : (Object.keys(chartData[0] || {})[1] ?? "value");

    return (
        <div className="min-h-screen flex bg-background text-foreground">
            {/* Sidebar */}
            <aside className="w-56 border-r border-white/10 bg-white/3 p-4 flex flex-col gap-1 shrink-0">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Reports</h2>
                {REPORT_MENU.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        onClick={() => handleSelectReport(id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${activeReport === id
                                ? "bg-indigo-600/20 text-indigo-300 font-medium"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            }`}
                    >
                        <Icon size={14} />
                        {label}
                    </button>
                ))}
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col p-6 gap-6 min-w-0">
                {/* Filters + Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                    <input
                        type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm"
                    />
                    <span className="text-slate-600 text-sm">to</span>
                    <input
                        type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm"
                    />
                    {teams.length > 0 && (
                        <select
                            value={teamId} onChange={(e) => setTeamId(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm"
                        >
                            <option value="">All Teams</option>
                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    )}
                    <button
                        onClick={() => fetchReport()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Run Report
                    </button>

                    {/* Export */}
                    {result && (
                        <>
                            {(["csv", "excel", "pdf"] as ExportFormat[]).map((fmt) => (
                                <button
                                    key={fmt}
                                    onClick={() => handleExport(fmt)}
                                    disabled={!!exporting}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-xs transition-colors disabled:opacity-50 uppercase"
                                >
                                    {exporting === fmt ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                    {fmt}
                                </button>
                            ))}
                        </>
                    )}
                </div>

                {/* Content area */}
                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 size={28} className="animate-spin text-indigo-400" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-400 text-sm">{error}</div>
                    ) : !result ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <BarChart2 size={40} className="text-slate-700" />
                            <p className="text-slate-500 text-sm">Run the report to view results</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary */}
                            {result.summary && Object.keys(result.summary).length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {Object.entries(result.summary).slice(0, 4).map(([k, v]) => (
                                        <div key={k} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                            <p className="text-xs text-slate-500 mb-1 capitalize">{k.replace(/_/g, " ")}</p>
                                            <p className="text-lg font-bold text-slate-200">{String(v)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Chart */}
                            {chartData.length > 0 && (
                                <div className="p-4 rounded-xl bg-white/3 border border-white/8">
                                    {isLineChart
                                        ? <LineChart data={chartData as any} xKey={xKey} yKey={yKey} />
                                        : <BarChart data={chartData as any} labelKey={xKey} valueKey={yKey} />
                                    }
                                </div>
                            )}

                            {/* Table */}
                            {result.data && result.data.length > 0 && (
                                <DataTable data={result.data} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
