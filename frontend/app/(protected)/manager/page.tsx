"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Types ===============

interface TeamMember {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    tasksCompleted: number;
    tasksInProgress: number;
    tasksOverdue: number;
    hoursLogged: number;
    capacity: number;
    productivity: number; // percentage
}

interface TeamStats {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    avgProductivity: number;
    totalHoursLogged: number;
    teamCapacity: number;
}

interface Bottleneck {
    id: string;
    type: "overdue" | "blocked" | "overloaded" | "idle";
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    affectedItems: number;
    suggestion: string;
}

interface SLABreach {
    id: string;
    taskName: string;
    projectName: string;
    breachType: "response" | "resolution";
    breachedAt: string;
    severity: "warning" | "critical";
}

// =============== Icons ===============

const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const ChartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const AlertIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const FireIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
);

const TrendUpIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const TrendDownIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
    </svg>
);

const ExclamationIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// =============== Mock Data ===============

const mockTeamMembers: TeamMember[] = [
    { id: "1", name: "John Doe", role: "Senior Developer", tasksCompleted: 12, tasksInProgress: 3, tasksOverdue: 1, hoursLogged: 38, capacity: 40, productivity: 92 },
    { id: "2", name: "Jane Smith", role: "Frontend Developer", tasksCompleted: 8, tasksInProgress: 4, tasksOverdue: 0, hoursLogged: 35, capacity: 40, productivity: 88 },
    { id: "3", name: "Bob Wilson", role: "Backend Developer", tasksCompleted: 10, tasksInProgress: 2, tasksOverdue: 2, hoursLogged: 42, capacity: 40, productivity: 78 },
    { id: "4", name: "Alice Brown", role: "UI/UX Designer", tasksCompleted: 6, tasksInProgress: 5, tasksOverdue: 0, hoursLogged: 36, capacity: 40, productivity: 95 },
    { id: "5", name: "Charlie Davis", role: "QA Engineer", tasksCompleted: 15, tasksInProgress: 2, tasksOverdue: 1, hoursLogged: 40, capacity: 40, productivity: 85 },
];

const mockTeamStats: TeamStats = {
    totalTasks: 65,
    completedTasks: 51,
    inProgressTasks: 16,
    overdueTasks: 4,
    avgProductivity: 87.6,
    totalHoursLogged: 191,
    teamCapacity: 200,
};

const mockBottlenecks: Bottleneck[] = [
    { id: "1", type: "overdue", severity: "high", title: "4 Tasks Overdue", description: "Tasks pending for more than 2 days", affectedItems: 4, suggestion: "Reassign or adjust deadlines" },
    { id: "2", type: "overloaded", severity: "medium", title: "Bob Wilson Overloaded", description: "Working 105% of capacity", affectedItems: 1, suggestion: "Redistribute 2 tasks to other members" },
    { id: "3", type: "blocked", severity: "low", title: "2 Blocked Tasks", description: "Waiting on external dependencies", affectedItems: 2, suggestion: "Follow up with stakeholders" },
];

const mockSLABreaches: SLABreach[] = [
    { id: "1", taskName: "API Integration Bug", projectName: "E-Commerce Platform", breachType: "resolution", breachedAt: "2h ago", severity: "critical" },
    { id: "2", taskName: "Payment Gateway Issue", projectName: "Mobile App", breachType: "response", breachedAt: "4h ago", severity: "warning" },
];

// =============== Components ===============

function StatsCard({ title, value, subtitle, icon, trend, color }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: { value: number; type: "up" | "down" };
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
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-sm ${trend.type === "up" ? "text-emerald-500" : "text-red-500"}`}>
                            {trend.type === "up" ? <TrendUpIcon /> : <TrendDownIcon />}
                            <span>{trend.type === "up" ? "+" : ""}{trend.value}%</span>
                            <span className="text-foreground/40">vs last week</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function TeamMemberRow({ member }: { member: TeamMember }) {
    const utilizationPercent = (member.hoursLogged / member.capacity) * 100;
    const isOverloaded = utilizationPercent > 100;
    const isUnderutilized = utilizationPercent < 60;

    return (
        <div className="flex items-center gap-4 p-4 bg-foreground/[0.02] rounded-lg hover:bg-foreground/[0.04] transition-colors">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                {member.name.split(" ").map(n => n[0]).join("")}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{member.name}</p>
                <p className="text-sm text-foreground/50">{member.role}</p>
            </div>

            {/* Task Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                    <p className="font-medium text-emerald-500">{member.tasksCompleted}</p>
                    <p className="text-xs text-foreground/40">Done</p>
                </div>
                <div className="text-center">
                    <p className="font-medium text-blue-500">{member.tasksInProgress}</p>
                    <p className="text-xs text-foreground/40">In Progress</p>
                </div>
                <div className="text-center">
                    <p className={`font-medium ${member.tasksOverdue > 0 ? "text-red-500" : "text-foreground/40"}`}>
                        {member.tasksOverdue}
                    </p>
                    <p className="text-xs text-foreground/40">Overdue</p>
                </div>
            </div>

            {/* Utilization Bar */}
            <div className="w-32 hidden lg:block">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground/50">Utilization</span>
                    <span className={`font-medium ${isOverloaded ? "text-red-500" : isUnderutilized ? "text-amber-500" : "text-emerald-500"}`}>
                        {Math.round(utilizationPercent)}%
                    </span>
                </div>
                <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${isOverloaded ? "bg-red-500" : isUnderutilized ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                        style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                    />
                </div>
            </div>

            {/* Productivity */}
            <div className="w-16 text-right">
                <p className={`text-lg font-bold ${member.productivity >= 90 ? "text-emerald-500" :
                        member.productivity >= 70 ? "text-blue-500" : "text-amber-500"
                    }`}>
                    {member.productivity}%
                </p>
                <p className="text-xs text-foreground/40">Score</p>
            </div>
        </div>
    );
}

function BottleneckCard({ bottleneck }: { bottleneck: Bottleneck }) {
    const severityColors = {
        low: "border-amber-500/30 bg-amber-500/5",
        medium: "border-orange-500/30 bg-orange-500/5",
        high: "border-red-500/30 bg-red-500/5",
    };

    const severityBadge = {
        low: "bg-amber-500/20 text-amber-500",
        medium: "bg-orange-500/20 text-orange-500",
        high: "bg-red-500/20 text-red-500",
    };

    const typeIcons = {
        overdue: <ClockIcon />,
        blocked: <ExclamationIcon />,
        overloaded: <FireIcon />,
        idle: <UsersIcon />,
    };

    return (
        <div className={`p-4 rounded-xl border ${severityColors[bottleneck.severity]}`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${severityBadge[bottleneck.severity]}`}>
                    {typeIcons[bottleneck.type]}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{bottleneck.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityBadge[bottleneck.severity]}`}>
                            {bottleneck.severity}
                        </span>
                    </div>
                    <p className="text-sm text-foreground/60 mt-1">{bottleneck.description}</p>
                    <p className="text-sm text-blue-400 mt-2">💡 {bottleneck.suggestion}</p>
                </div>
            </div>
        </div>
    );
}

function SLABreachRow({ breach }: { breach: SLABreach }) {
    return (
        <div className={`flex items-center gap-4 p-3 rounded-lg ${breach.severity === "critical" ? "bg-red-500/10" : "bg-amber-500/10"
            }`}>
            <div className={`p-2 rounded-lg ${breach.severity === "critical" ? "bg-red-500/20 text-red-500" : "bg-amber-500/20 text-amber-500"
                }`}>
                <AlertIcon />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{breach.taskName}</p>
                <p className="text-sm text-foreground/50">{breach.projectName}</p>
            </div>
            <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs font-medium ${breach.breachType === "resolution"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}>
                    {breach.breachType === "resolution" ? "Resolution SLA" : "Response SLA"}
                </span>
                <p className="text-xs text-foreground/40 mt-1">{breach.breachedAt}</p>
            </div>
        </div>
    );
}

function ProductivityChart({ data }: { data: { day: string; value: number }[] }) {
    const maxValue = Math.max(...data.map(d => d.value));

    return (
        <div className="flex items-end justify-between gap-2 h-40">
            {data.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center">
                        <div
                            className="w-full max-w-8 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300"
                            style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: "4px" }}
                        />
                    </div>
                    <span className="text-xs text-foreground/50">{item.day}</span>
                </div>
            ))}
        </div>
    );
}

// =============== Main Component ===============

export default function ManagerDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
    const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
    const [slaBreaches, setSLABreaches] = useState<SLABreach[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "quarter">("week");

    // Weekly productivity data
    const productivityData = [
        { day: "Mon", value: 85 },
        { day: "Tue", value: 92 },
        { day: "Wed", value: 78 },
        { day: "Thu", value: 88 },
        { day: "Fri", value: 95 },
        { day: "Sat", value: 45 },
        { day: "Sun", value: 20 },
    ];

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setTeamMembers(mockTeamMembers);
            setTeamStats(mockTeamStats);
            setBottlenecks(mockBottlenecks);
            setSLABreaches(mockSLABreaches);
            setLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

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
                        <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
                        <p className="text-foreground/60 mt-1">Team performance and bottleneck insights</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(["week", "month", "quarter"] as const).map((period) => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === period
                                        ? "bg-blue-600 text-white"
                                        : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                                    }`}
                            >
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Team Productivity"
                        value={`${teamStats?.avgProductivity.toFixed(1)}%`}
                        subtitle="Average score"
                        icon={<ChartIcon />}
                        trend={{ value: 5.2, type: "up" }}
                        color="blue"
                    />
                    <StatsCard
                        title="Tasks Completed"
                        value={teamStats?.completedTasks || 0}
                        subtitle={`of ${teamStats?.totalTasks} total`}
                        icon={<CheckCircleIcon />}
                        trend={{ value: 12, type: "up" }}
                        color="green"
                    />
                    <StatsCard
                        title="Overdue Tasks"
                        value={teamStats?.overdueTasks || 0}
                        subtitle="Need attention"
                        icon={<AlertIcon />}
                        trend={{ value: 2, type: "down" }}
                        color="red"
                    />
                    <StatsCard
                        title="Team Capacity"
                        value={`${Math.round(((teamStats?.totalHoursLogged || 0) / (teamStats?.teamCapacity || 1)) * 100)}%`}
                        subtitle={`${teamStats?.totalHoursLogged}h / ${teamStats?.teamCapacity}h`}
                        icon={<UsersIcon />}
                        color="purple"
                    />
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Team Members - 2 columns */}
                    <div className="lg:col-span-2 bg-background border border-foreground/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
                            <span className="text-sm text-foreground/50">{teamMembers.length} members</span>
                        </div>
                        <div className="space-y-2">
                            {teamMembers.map((member) => (
                                <TeamMemberRow key={member.id} member={member} />
                            ))}
                        </div>
                    </div>

                    {/* Productivity Chart - 1 column */}
                    <div className="bg-background border border-foreground/10 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Weekly Productivity</h2>
                        <ProductivityChart data={productivityData} />
                        <div className="mt-4 pt-4 border-t border-foreground/10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground/50">This week avg</span>
                                <span className="font-medium text-foreground">
                                    {Math.round(productivityData.reduce((a, b) => a + b.value, 0) / productivityData.length)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottlenecks & SLA Breaches */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bottlenecks */}
                    <div className="bg-background border border-foreground/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Bottlenecks</h2>
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
                                {bottlenecks.length} issues
                            </span>
                        </div>
                        <div className="space-y-3">
                            {bottlenecks.length > 0 ? (
                                bottlenecks.map((bottleneck) => (
                                    <BottleneckCard key={bottleneck.id} bottleneck={bottleneck} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-foreground/40">
                                    <CheckCircleIcon />
                                    <p className="mt-2">No bottlenecks detected</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SLA Breaches */}
                    <div className="bg-background border border-foreground/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">SLA Breaches</h2>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${slaBreaches.length > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                                }`}>
                                {slaBreaches.length} active
                            </span>
                        </div>
                        <div className="space-y-3">
                            {slaBreaches.length > 0 ? (
                                slaBreaches.map((breach) => (
                                    <SLABreachRow key={breach.id} breach={breach} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-foreground/40">
                                    <CheckCircleIcon />
                                    <p className="mt-2">All SLAs met</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
