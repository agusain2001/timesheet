"use client";

import { useState, useEffect } from "react";
import {
    getTaskAgingReport,
    getTeamVelocityReport,
    getWorkloadDistributionReport,
    getTimeTrackingReport,
    ReportResult,
    ReportFilters,
    ReportType,
    ExportFormat,
    downloadReport,
} from "@/services/reports";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Icons ===============

const ChartBarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const ChartPieIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
);

const TrendingUpIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

// =============== Components ===============

interface ReportCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
    isSelected: boolean;
}

function ReportCard({ title, description, icon, color, onClick, isSelected }: ReportCardProps) {
    return (
        <button
            onClick={onClick}
            className={`text-left p-4 rounded-xl border transition-all duration-200 ${isSelected
                ? `border-${color}-500/50 bg-${color}-500/10 ring-2 ring-${color}-500/30`
                : "border-foreground/10 bg-background hover:border-foreground/20 hover:bg-foreground/5"
                }`}
        >
            <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 text-${color}-400 flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-foreground/60">{description}</p>
        </button>
    );
}

interface MetricCardProps {
    label: string;
    value: string | number;
    change?: { value: number; isPositive: boolean };
    color?: string;
}

function MetricCard({ label, value, change, color = "blue" }: MetricCardProps) {
    return (
        <div className="p-4 rounded-xl border border-foreground/10 bg-background">
            <p className="text-sm text-foreground/60 mb-1">{label}</p>
            <p className={`text-2xl font-bold text-foreground`}>{value}</p>
            {change && (
                <p className={`text-xs mt-1 ${change.isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {change.isPositive ? "↑" : "↓"} {Math.abs(change.value)}% from last period
                </p>
            )}
        </div>
    );
}

interface BarChartProps {
    data: Array<{ label: string; value: number; color?: string }>;
    maxValue?: number;
}

function SimpleBarChart({ data, maxValue }: BarChartProps) {
    const max = maxValue || Math.max(...data.map(d => d.value));

    return (
        <div className="space-y-3">
            {data.map((item, idx) => (
                <div key={idx}>
                    <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground/70">{item.label}</span>
                        <span className="font-medium text-foreground">{item.value}</span>
                    </div>
                    <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${item.color || "bg-blue-500"}`}
                            style={{ width: `${(item.value / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

interface ReportViewerProps {
    report: ReportResult | null;
    loading: boolean;
    onExport: (format: ExportFormat) => void;
}

function ReportViewer({ report, loading, onExport }: ReportViewerProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-foreground/50">
                <ChartBarIcon />
                <p className="mt-2">Select a report type to view</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground capitalize">
                        {report.report_type.replace(/_/g, " ")} Report
                    </h3>
                    <p className="text-sm text-foreground/50">
                        Generated {new Date(report.generated_at).toLocaleString()}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onExport("pdf")}
                        className="flex items-center gap-2 px-3 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-sm transition-colors"
                    >
                        <DownloadIcon />
                        PDF
                    </button>
                    <button
                        onClick={() => onExport("excel")}
                        className="flex items-center gap-2 px-3 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-sm transition-colors"
                    >
                        <DownloadIcon />
                        Excel
                    </button>
                </div>
            </div>

            {/* Summary Metrics */}
            {report.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(report.summary).slice(0, 4).map(([key, value]) => (
                        <MetricCard
                            key={key}
                            label={key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            value={value}
                        />
                    ))}
                </div>
            )}

            {/* Charts */}
            {report.charts && report.charts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {report.charts.map((chart, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-foreground/10 bg-background">
                            <h4 className="font-medium text-foreground mb-4">{chart.title}</h4>
                            <SimpleBarChart
                                data={chart.data.map((d: Record<string, unknown>) => ({
                                    label: String(d.label || d.name || Object.values(d)[0]),
                                    value: Number(d.value || d.count || Object.values(d)[1]),
                                }))}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Data Table */}
            {report.data && report.data.length > 0 && (
                <div className="rounded-xl border border-foreground/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-foreground/5">
                                <tr>
                                    {Object.keys(report.data[0]).slice(0, 6).map((key) => (
                                        <th key={key} className="px-4 py-3 text-left text-sm font-medium text-foreground/70">
                                            {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-foreground/10">
                                {report.data.slice(0, 10).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-foreground/5 transition-colors">
                                        {Object.values(row).slice(0, 6).map((value, cellIdx) => (
                                            <td key={cellIdx} className="px-4 py-3 text-sm text-foreground">
                                                {String(value)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {report.data.length > 10 && (
                        <div className="px-4 py-3 bg-foreground/5 text-center">
                            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                View all {report.data.length} rows
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// =============== Main Component ===============

// Subset of ReportType that we display in the UI
type ReportTypeKey = Extract<ReportType, "task_aging" | "team_velocity" | "workload_distribution" | "time_tracking">;

export default function ReportsPage() {
    const [selectedReport, setSelectedReport] = useState<ReportTypeKey | null>(null);
    const [reportData, setReportData] = useState<ReportResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<ReportFilters>({
        date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        date_to: new Date().toISOString().split("T")[0],
    });

    const reportTypes: Array<{ key: ReportTypeKey; title: string; description: string; icon: React.ReactNode; color: string }> = [
        {
            key: "task_aging",
            title: "Task Aging",
            description: "View tasks by age and identify bottlenecks",
            icon: <ClockIcon />,
            color: "blue",
        },
        {
            key: "team_velocity",
            title: "Team Velocity",
            description: "Track team performance over time",
            icon: <TrendingUpIcon />,
            color: "emerald",
        },
        {
            key: "workload_distribution",
            title: "Workload Distribution",
            description: "Analyze work distribution across team members",
            icon: <UsersIcon />,
            color: "purple",
        },
        {
            key: "time_tracking",
            title: "Time Tracking",
            description: "Detailed time tracking and utilization report",
            icon: <ChartPieIcon />,
            color: "amber",
        },
    ];

    const loadReport = async (reportType: ReportTypeKey) => {
        setLoading(true);
        setSelectedReport(reportType);

        try {
            let data: ReportResult;

            switch (reportType) {
                case "task_aging":
                    data = await getTaskAgingReport(filters);
                    break;
                case "team_velocity":
                    data = await getTeamVelocityReport("team-1", filters);
                    break;
                case "workload_distribution":
                    data = await getWorkloadDistributionReport(filters);
                    break;
                case "time_tracking":
                    data = await getTimeTrackingReport(filters);
                    break;
                default:
                    throw new Error("Unknown report type");
            }

            setReportData(data);
        } catch (error) {
            console.error("Failed to load report:", error);
            // Set mock data for demo
            setReportData({
                report_type: reportType,
                generated_at: new Date().toISOString(),
                filters_applied: filters,
                summary: {
                    total_items: 156,
                    completed_on_time: 124,
                    overdue: 18,
                    in_progress: 14,
                },
                data: [
                    { name: "Backend API", tasks: 45, completed: 38, avg_age_days: 5.2 },
                    { name: "Frontend", tasks: 52, completed: 42, avg_age_days: 4.8 },
                    { name: "Mobile App", tasks: 28, completed: 20, avg_age_days: 7.1 },
                    { name: "DevOps", tasks: 18, completed: 15, avg_age_days: 3.5 },
                    { name: "QA", tasks: 13, completed: 9, avg_age_days: 6.3 },
                ],
                charts: [
                    {
                        chart_type: "bar",
                        title: "Tasks by Status",
                        data: [
                            { label: "Completed", value: 124, color: "bg-emerald-500" },
                            { label: "In Progress", value: 14, color: "bg-blue-500" },
                            { label: "Overdue", value: 18, color: "bg-red-500" },
                        ],
                    },
                    {
                        chart_type: "bar",
                        title: "Tasks by Priority",
                        data: [
                            { label: "Critical", value: 8, color: "bg-red-500" },
                            { label: "High", value: 32, color: "bg-orange-500" },
                            { label: "Medium", value: 78, color: "bg-blue-500" },
                            { label: "Low", value: 38, color: "bg-gray-500" },
                        ],
                    },
                ],
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: ExportFormat) => {
        if (!selectedReport) return;

        try {
            await downloadReport(selectedReport, format, filters);
        } catch (error) {
            console.error("Failed to export report:", error);
            alert("Export functionality not available in demo mode");
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
                        <p className="text-foreground/60 mt-1">Generate and analyze detailed reports</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-foreground/10 bg-background">
                    <div className="flex items-center gap-2">
                        <CalendarIcon />
                        <span className="text-sm text-foreground/60">Date Range:</span>
                    </div>
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                        className="px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground"
                    />
                    <span className="text-foreground/40">to</span>
                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                        className="px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground"
                    />
                    {selectedReport && (
                        <button
                            onClick={() => loadReport(selectedReport)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Apply Filters
                        </button>
                    )}
                </div>

                {/* Report Types */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {reportTypes.map((report) => (
                        <ReportCard
                            key={report.key}
                            title={report.title}
                            description={report.description}
                            icon={report.icon}
                            color={report.color}
                            isSelected={selectedReport === report.key}
                            onClick={() => loadReport(report.key)}
                        />
                    ))}
                </div>

                {/* Report Viewer */}
                <div className="rounded-xl border border-foreground/10 bg-background p-6">
                    <ReportViewer
                        report={reportData}
                        loading={loading}
                        onExport={handleExport}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
