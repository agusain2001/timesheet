"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Types ===============

interface ProjectHealth {
    id: string;
    name: string;
    status: "on_track" | "at_risk" | "delayed" | "completed";
    progress: number;
    health: number; // 0-100
    budget: { spent: number; total: number };
    deadline: string;
    team: string;
}

interface DeliveryTrend {
    month: string;
    planned: number;
    delivered: number;
}

interface RiskIndicator {
    id: string;
    category: "budget" | "timeline" | "resource" | "scope" | "quality";
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    affectedProjects: string[];
    mitigation?: string;
}

interface DepartmentMetric {
    name: string;
    tasksCompleted: number;
    productivity: number;
    utilization: number;
}

// =============== Icons ===============

const ProjectIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const TrendIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
);

const AlertIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const DollarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const TargetIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

// =============== Mock Data ===============

const mockProjects: ProjectHealth[] = [
    { id: "1", name: "E-Commerce Platform", status: "on_track", progress: 72, health: 85, budget: { spent: 85000, total: 120000 }, deadline: "2024-03-15", team: "Frontend Team" },
    { id: "2", name: "Mobile App v2", status: "at_risk", progress: 45, health: 58, budget: { spent: 62000, total: 80000 }, deadline: "2024-02-28", team: "Mobile Team" },
    { id: "3", name: "API Gateway", status: "on_track", progress: 88, health: 92, budget: { spent: 38000, total: 50000 }, deadline: "2024-02-10", team: "Backend Team" },
    { id: "4", name: "Dashboard Redesign", status: "delayed", progress: 35, health: 42, budget: { spent: 28000, total: 35000 }, deadline: "2024-02-01", team: "Design Team" },
    { id: "5", name: "Data Analytics", status: "completed", progress: 100, health: 95, budget: { spent: 45000, total: 48000 }, deadline: "2024-01-20", team: "Data Team" },
];

const mockDeliveryTrends: DeliveryTrend[] = [
    { month: "Aug", planned: 12, delivered: 10 },
    { month: "Sep", planned: 15, delivered: 14 },
    { month: "Oct", planned: 18, delivered: 16 },
    { month: "Nov", planned: 20, delivered: 22 },
    { month: "Dec", planned: 16, delivered: 15 },
    { month: "Jan", planned: 22, delivered: 19 },
];

const mockRisks: RiskIndicator[] = [
    { id: "1", category: "timeline", severity: "high", title: "Dashboard Redesign Delay", description: "Project is 2 weeks behind schedule due to scope creep", affectedProjects: ["Dashboard Redesign"], mitigation: "Add 2 resources, reduce scope for v1" },
    { id: "2", category: "budget", severity: "medium", title: "Mobile App Budget Overrun", description: "Currently at 77% budget with only 45% progress", affectedProjects: ["Mobile App v2"], mitigation: "Review remaining features, prioritize MVP" },
    { id: "3", category: "resource", severity: "low", title: "Backend Developer Shortage", description: "2 open positions affecting velocity", affectedProjects: ["API Gateway", "E-Commerce Platform"] },
];

const mockDepartments: DepartmentMetric[] = [
    { name: "Engineering", tasksCompleted: 156, productivity: 88, utilization: 92 },
    { name: "Design", tasksCompleted: 78, productivity: 82, utilization: 75 },
    { name: "QA", tasksCompleted: 234, productivity: 91, utilization: 88 },
    { name: "DevOps", tasksCompleted: 45, productivity: 95, utilization: 70 },
];

// =============== Components ===============

function KPICard({ title, value, subtitle, icon, color }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: "blue" | "green" | "orange" | "red" | "purple";
}) {
    const colorClasses = {
        blue: "bg-blue-500/10 text-blue-500",
        green: "bg-emerald-500/10 text-emerald-500",
        orange: "bg-orange-500/10 text-orange-500",
        red: "bg-red-500/10 text-red-500",
        purple: "bg-purple-500/10 text-purple-500",
    };

    return (
        <div className="bg-background border border-foreground/10 rounded-xl p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-foreground/60">{title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-foreground/40 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function ProjectHealthRow({ project }: { project: ProjectHealth }) {
    const statusColors = {
        on_track: "bg-emerald-500",
        at_risk: "bg-amber-500",
        delayed: "bg-red-500",
        completed: "bg-blue-500",
    };

    const statusLabels = {
        on_track: "On Track",
        at_risk: "At Risk",
        delayed: "Delayed",
        completed: "Completed",
    };

    const healthColor = project.health >= 80 ? "text-emerald-500" : project.health >= 60 ? "text-amber-500" : "text-red-500";
    const budgetPercent = (project.budget.spent / project.budget.total) * 100;

    return (
        <div className="flex items-center gap-4 p-4 bg-foreground/[0.02] rounded-lg hover:bg-foreground/[0.04] transition-colors">
            {/* Status dot */}
            <div className={`w-3 h-3 rounded-full ${statusColors[project.status]}`} />

            {/* Project info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{project.name}</p>
                <p className="text-sm text-foreground/50">{project.team}</p>
            </div>

            {/* Progress */}
            <div className="w-24 hidden md:block">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground/50">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                </div>
                <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${project.progress}%` }}
                    />
                </div>
            </div>

            {/* Budget */}
            <div className="w-24 hidden lg:block">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground/50">Budget</span>
                    <span className={`font-medium ${budgetPercent > 80 ? "text-amber-500" : ""}`}>
                        {Math.round(budgetPercent)}%
                    </span>
                </div>
                <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${budgetPercent > 90 ? "bg-red-500" : budgetPercent > 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(100, budgetPercent)}%` }}
                    />
                </div>
            </div>

            {/* Health Score */}
            <div className="w-16 text-right">
                <p className={`text-lg font-bold ${healthColor}`}>{project.health}</p>
                <p className="text-xs text-foreground/40">Health</p>
            </div>

            {/* Status Badge */}
            <span className={`px-2 py-1 rounded text-xs font-medium ${project.status === "on_track" ? "bg-emerald-500/20 text-emerald-400" :
                    project.status === "at_risk" ? "bg-amber-500/20 text-amber-400" :
                        project.status === "delayed" ? "bg-red-500/20 text-red-400" :
                            "bg-blue-500/20 text-blue-400"
                }`}>
                {statusLabels[project.status]}
            </span>
        </div>
    );
}

function DeliveryChart({ data }: { data: DeliveryTrend[] }) {
    const maxValue = Math.max(...data.flatMap(d => [d.planned, d.delivered]));

    return (
        <div className="space-y-4">
            {/* Chart */}
            <div className="flex items-end justify-between gap-4 h-40">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center gap-1 h-32">
                            {/* Planned */}
                            <div
                                className="w-3 bg-foreground/20 rounded-t transition-all"
                                style={{ height: `${(item.planned / maxValue) * 100}%` }}
                                title={`Planned: ${item.planned}`}
                            />
                            {/* Delivered */}
                            <div
                                className={`w-3 rounded-t transition-all ${item.delivered >= item.planned ? "bg-emerald-500" : "bg-amber-500"
                                    }`}
                                style={{ height: `${(item.delivered / maxValue) * 100}%` }}
                                title={`Delivered: ${item.delivered}`}
                            />
                        </div>
                        <span className="text-xs text-foreground/50">{item.month}</span>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-foreground/20" />
                    <span className="text-foreground/50">Planned</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-foreground/50">Delivered</span>
                </div>
            </div>
        </div>
    );
}

function RiskCard({ risk }: { risk: RiskIndicator }) {
    const severityColors = {
        low: "border-blue-500/30 bg-blue-500/5",
        medium: "border-amber-500/30 bg-amber-500/5",
        high: "border-orange-500/30 bg-orange-500/5",
        critical: "border-red-500/30 bg-red-500/5",
    };

    const severityBadge = {
        low: "bg-blue-500/20 text-blue-400",
        medium: "bg-amber-500/20 text-amber-400",
        high: "bg-orange-500/20 text-orange-400",
        critical: "bg-red-500/20 text-red-400",
    };

    const categoryIcons = {
        budget: <DollarIcon />,
        timeline: <ClockIcon />,
        resource: <UsersIcon />,
        scope: <TargetIcon />,
        quality: <CheckIcon />,
    };

    return (
        <div className={`p-4 rounded-xl border ${severityColors[risk.severity]}`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${severityBadge[risk.severity]}`}>
                    {categoryIcons[risk.category]}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-foreground">{risk.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${severityBadge[risk.severity]}`}>
                            {risk.severity}
                        </span>
                    </div>
                    <p className="text-sm text-foreground/60 mt-1">{risk.description}</p>
                    {risk.mitigation && (
                        <p className="text-sm text-blue-400 mt-2">💡 {risk.mitigation}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                        {risk.affectedProjects.map((project, i) => (
                            <span key={i} className="px-2 py-0.5 bg-foreground/10 rounded text-xs text-foreground/60">
                                {project}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DepartmentRow({ dept }: { dept: DepartmentMetric }) {
    return (
        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-foreground/5 transition-colors">
            <div className="flex-1">
                <p className="font-medium text-foreground">{dept.name}</p>
            </div>
            <div className="text-center">
                <p className="font-bold text-foreground">{dept.tasksCompleted}</p>
                <p className="text-xs text-foreground/40">Tasks</p>
            </div>
            <div className="w-20">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground/50">Prod.</span>
                    <span className={`font-medium ${dept.productivity >= 85 ? "text-emerald-500" : "text-amber-500"}`}>
                        {dept.productivity}%
                    </span>
                </div>
                <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${dept.productivity >= 85 ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${dept.productivity}%` }}
                    />
                </div>
            </div>
            <div className="w-20">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground/50">Util.</span>
                    <span className="font-medium">{dept.utilization}%</span>
                </div>
                <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${dept.utilization}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// =============== Main Component ===============

export default function ExecutiveDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<ProjectHealth[]>([]);
    const [trends, setTrends] = useState<DeliveryTrend[]>([]);
    const [risks, setRisks] = useState<RiskIndicator[]>([]);
    const [departments, setDepartments] = useState<DepartmentMetric[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setProjects(mockProjects);
            setTrends(mockDeliveryTrends);
            setRisks(mockRisks);
            setDepartments(mockDepartments);
            setLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    // Calculate KPIs
    const onTrackProjects = projects.filter(p => p.status === "on_track" || p.status === "completed").length;
    const atRiskProjects = projects.filter(p => p.status === "at_risk" || p.status === "delayed").length;
    const avgHealth = projects.length > 0
        ? Math.round(projects.reduce((a, b) => a + b.health, 0) / projects.length)
        : 0;
    const totalBudget = projects.reduce((a, b) => a + b.budget.total, 0);
    const spentBudget = projects.reduce((a, b) => a + b.budget.spent, 0);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Executive Dashboard</h1>
                        <p className="text-foreground/60 mt-1">Portfolio health and strategic insights</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm font-medium transition-colors">
                            Export Report
                        </button>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                            Schedule Meeting
                        </button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        title="Active Projects"
                        value={projects.length}
                        subtitle={`${onTrackProjects} on track`}
                        icon={<ProjectIcon />}
                        color="blue"
                    />
                    <KPICard
                        title="Portfolio Health"
                        value={`${avgHealth}%`}
                        subtitle="Average score"
                        icon={<CheckIcon />}
                        color="green"
                    />
                    <KPICard
                        title="At Risk"
                        value={atRiskProjects}
                        subtitle="Projects need attention"
                        icon={<AlertIcon />}
                        color="orange"
                    />
                    <KPICard
                        title="Budget Utilization"
                        value={`${Math.round((spentBudget / totalBudget) * 100)}%`}
                        subtitle={`$${(spentBudget / 1000).toFixed(0)}k / $${(totalBudget / 1000).toFixed(0)}k`}
                        icon={<DollarIcon />}
                        color="purple"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Project Health - 2 columns */}
                    <div className="lg:col-span-2 bg-background border border-foreground/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Project Health Overview</h2>
                            <span className="text-sm text-foreground/50">{projects.length} projects</span>
                        </div>
                        <div className="space-y-2">
                            {projects.map((project) => (
                                <ProjectHealthRow key={project.id} project={project} />
                            ))}
                        </div>
                    </div>

                    {/* Delivery Trends - 1 column */}
                    <div className="bg-background border border-foreground/10 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Delivery Trends</h2>
                        <DeliveryChart data={trends} />
                        <div className="mt-4 pt-4 border-t border-foreground/10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground/50">Delivery Rate</span>
                                <span className="font-medium text-emerald-500">
                                    {Math.round((trends.reduce((a, b) => a + b.delivered, 0) / trends.reduce((a, b) => a + b.planned, 0)) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Risks & Departments */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Risk Indicators */}
                    <div className="bg-background border border-foreground/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Risk Indicators</h2>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${risks.some(r => r.severity === "critical" || r.severity === "high")
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-emerald-500/20 text-emerald-400"
                                }`}>
                                {risks.length} active
                            </span>
                        </div>
                        <div className="space-y-3">
                            {risks.map((risk) => (
                                <RiskCard key={risk.id} risk={risk} />
                            ))}
                        </div>
                    </div>

                    {/* Department Performance */}
                    <div className="bg-background border border-foreground/10 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Department Performance</h2>
                        <div className="space-y-1">
                            {departments.map((dept, index) => (
                                <DepartmentRow key={index} dept={dept} />
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-foreground/10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground/50">Total Tasks Completed</span>
                                <span className="font-medium text-foreground">
                                    {departments.reduce((a, b) => a + b.tasksCompleted, 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
