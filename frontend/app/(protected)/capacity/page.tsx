"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Loader2, RefreshCw, AlertTriangle, CheckCircle2,
    Users, BarChart2, TrendingDown, Activity
} from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapacityItem {
    user_id: string;
    user_name: string;
    capacity_hours: number;
    allocated_hours: number;
    availability_percentage: number;
    week_starting: string;
}

interface CapacityResponse {
    period_start: string;
    period_end: string;
    weeks: number;
    items: CapacityItem[];
    total_capacity: number;
    total_allocated: number;
    overall_utilization: number;
}

interface AlertItem {
    user_id: string;
    user_name: string;
    week_starting: string;
    capacity_hours: number;
    allocated_hours: number;
    overallocation_hours: number;
    affected_tasks: string[];
}

interface BurndownPoint {
    date: string;
    remaining_hours: number;
    ideal_hours: number;
    completed_hours: number;
}

interface BurndownData {
    project_name: string;
    total_estimated_hours: number;
    total_completed_hours: number;
    data_points: BurndownPoint[];
}

// ─── Utilization Bar ──────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
    const color = pct > 100 ? "#ef4444" : pct > 80 ? "#f97316" : pct > 60 ? "#eab308" : "#22c55e";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-foreground/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
            </div>
            <span className="text-xs font-medium w-12 text-right" style={{ color }}>{pct.toFixed(0)}%</span>
        </div>
    );
}

// ─── Capacity Planning Page ───────────────────────────────────────────────────

export default function CapacityPage() {
    const router = useRouter();
    const [capacityData, setCapacityData] = useState<CapacityResponse | null>(null);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [burndown, setBurndown] = useState<BurndownData | null>(null);
    const [projectId, setProjectId] = useState("");
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"capacity" | "burndown" | "alerts">("capacity");

    const openUserProfile = (userId: string) => router.push(`/employees/${userId}`);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const t = getToken();
        const headers = { Authorization: `Bearer ${t}` };

        try {
            const [projRes, capRes, alertRes] = await Promise.all([
                fetch(`${API}/api/projects?limit=50`, { headers }).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
                fetch(`${API}/api/workload/capacity`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`${API}/api/workload/alerts`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
            ]);

            setProjects(projRes.items ?? []);
            setCapacityData(capRes);
            setAlerts(Array.isArray(alertRes) ? alertRes : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!projectId) { setBurndown(null); return; }
        const t = getToken();
        fetch(`${API}/api/workload/burndown/${projectId}`, { headers: { Authorization: `Bearer ${t}` } })
            .then(r => r.ok ? r.json() : null)
            .then(data => setBurndown(data))
            .catch(() => setBurndown(null));
    }, [projectId]);

    // Aggregate user utilization from capacity items
    const aggregateUsers = (): { user_id: string; user_name: string; avg_utilization: number; total_capacity: number; total_allocated: number }[] => {
        if (!capacityData?.items) return [];
        const map: Record<string, { user_name: string; utils: number[]; cap: number; alloc: number }> = {};
        for (const item of capacityData.items) {
            if (!map[item.user_id]) map[item.user_id] = { user_name: item.user_name, utils: [], cap: 0, alloc: 0 };
            const util = item.capacity_hours > 0 ? (item.allocated_hours / item.capacity_hours * 100) : 0;
            map[item.user_id].utils.push(util);
            map[item.user_id].cap += item.capacity_hours;
            map[item.user_id].alloc += item.allocated_hours;
        }
        return Object.entries(map).map(([id, d]) => ({
            user_id: id,
            user_name: d.user_name,
            avg_utilization: Math.round(d.utils.reduce((a, b) => a + b, 0) / d.utils.length),
            total_capacity: d.cap,
            total_allocated: d.alloc,
        })).sort((a, b) => b.avg_utilization - a.avg_utilization);
    };

    const users = aggregateUsers();
    const overCount = alerts.length;
    const avgUtil = capacityData ? Math.round(capacityData.overall_utilization) : 0;
    const totalCap = capacityData ? Math.round(capacityData.total_capacity) : 0;
    const totalAlloc = capacityData ? Math.round(capacityData.total_allocated) : 0;

    return (
        <div className="min-h-screen p-6 bg-background text-foreground space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Capacity Planning</h1>
                    <p className="text-sm text-foreground/50 mt-1">Resource allocation and utilization overview</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/60 hover:text-foreground/90 text-sm transition-colors">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-blue-400" />
                </div>
            ) : (
                <>
                    {/* KPI cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Team Members", value: users.length, sub: "tracked", icon: Users, color: "bg-blue-500/10 text-blue-400" },
                            { label: "Avg Utilization", value: `${avgUtil}%`, sub: avgUtil > 100 ? "over-allocated" : "healthy", icon: Activity, color: avgUtil > 100 ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400" },
                            { label: "Total Capacity", value: `${totalCap}h`, sub: `${totalAlloc}h allocated`, icon: BarChart2, color: "bg-amber-500/10 text-amber-400" },
                            { label: "Alerts", value: overCount, sub: overCount > 0 ? "overallocated" : "none", icon: AlertTriangle, color: overCount > 0 ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400" },
                        ].map(({ label, value, sub, icon: Icon, color }) => (
                            <div key={label} className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                                    <Icon size={20} />
                                </div>
                                <p className="text-3xl font-bold text-foreground/90 mb-1">{value}</p>
                                <p className="text-sm text-foreground/60">{label}</p>
                                <p className="text-xs text-foreground/40 mt-1">{sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tab bar */}
                    <div className="flex gap-1 p-1 bg-foreground/[0.02] border border-foreground/10 rounded-xl w-fit">
                        {(["capacity", "alerts", "burndown"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setView(tab)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${view === tab ? "bg-blue-600 text-white" : "text-foreground/60 hover:text-foreground/90"}`}
                            >
                                {tab === "capacity" ? "Team Capacity" : tab === "alerts" ? `Alerts (${overCount})` : "Burndown"}
                            </button>
                        ))}
                    </div>

                    {/* ─── Capacity Tab ─── */}
                    {view === "capacity" && (
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
                            <h2 className="text-base font-semibold text-foreground/80 mb-4 flex items-center gap-2">
                                <Users size={16} className="text-blue-400" /> Team Utilization
                            </h2>
                            {users.length === 0 ? (
                                <p className="text-sm text-foreground/40 text-center py-8">No capacity data available</p>
                            ) : (
                                <div className="space-y-1">
                                    <div className="grid grid-cols-[1fr_80px_120px_60px] gap-4 px-3 pb-2 text-[10px] text-foreground/40 uppercase font-semibold border-b border-foreground/5">
                                        <span>Member</span><span className="text-right">Allocated</span><span>Utilization</span><span></span>
                                    </div>
                                    {users.map(u => (
                                        <div
                                            key={u.user_id}
                                            className="grid grid-cols-[1fr_80px_120px_60px] gap-4 items-center py-3 px-3 rounded-xl hover:bg-foreground/[0.04] cursor-pointer transition-colors"
                                            onClick={() => openUserProfile(u.user_id)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                                                    {u.user_name.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium text-foreground/80 truncate">{u.user_name}</span>
                                            </div>
                                            <span className="text-xs text-foreground/50 text-right">{Math.round(u.total_allocated)}h</span>
                                            <UtilBar pct={u.avg_utilization} />
                                            <span className="text-xs text-blue-400 text-right cursor-pointer hover:underline">View →</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Alerts Tab ─── */}
                    {view === "alerts" && (
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
                            <h2 className="text-base font-semibold text-foreground/80 mb-4 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-400" /> Overallocation Alerts
                            </h2>
                            {alerts.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
                                    <p className="text-sm text-foreground/50">No overallocation alerts 🎉</p>
                                    <p className="text-xs text-foreground/40 mt-1">All team members are within capacity</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {alerts.map((a, i) => (
                                        <div
                                            key={i}
                                            className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 cursor-pointer hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                                            onClick={() => openUserProfile(a.user_id)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
                                                        {a.user_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground/80">{a.user_name}</p>
                                                        <p className="text-xs text-red-400">
                                                            Week of {new Date(a.week_starting).toLocaleDateString()} ·
                                                            {a.overallocation_hours.toFixed(1)}h over capacity
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-blue-400 cursor-pointer hover:underline shrink-0">View workload →</span>
                                            </div>
                                            {a.affected_tasks.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {a.affected_tasks.slice(0, 4).map((t, ti) => (
                                                        <span key={ti} className="px-2 py-0.5 text-[10px] bg-red-500/10 text-red-400 rounded-full truncate max-w-[180px]">
                                                            {t}
                                                        </span>
                                                    ))}
                                                    {a.affected_tasks.length > 4 && (
                                                        <span className="px-2 py-0.5 text-[10px] bg-foreground/5 text-foreground/40 rounded-full">+{a.affected_tasks.length - 4} more</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Burndown Tab ─── */}
                    {view === "burndown" && (
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
                            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                                <h2 className="text-base font-semibold text-foreground/80 flex items-center gap-2">
                                    <TrendingDown size={16} className="text-blue-400" /> Burndown Chart
                                </h2>
                                <select
                                    value={projectId}
                                    onChange={e => setProjectId(e.target.value)}
                                    className="px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/80 text-sm min-w-[200px]"
                                >
                                    <option value="">Select project…</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {!projectId ? (
                                <div className="text-center py-12">
                                    <BarChart2 size={32} className="text-foreground/20 mx-auto mb-2" />
                                    <p className="text-sm text-foreground/40">Select a project to view burndown</p>
                                </div>
                            ) : !burndown ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 size={24} className="animate-spin text-blue-400" />
                                </div>
                            ) : (
                                <div>
                                    {/* Summary */}
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5 text-center">
                                            <p className="text-lg font-bold text-foreground/80">{burndown.total_estimated_hours}h</p>
                                            <p className="text-[10px] text-foreground/40">Total Estimated</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5 text-center">
                                            <p className="text-lg font-bold text-green-400">{burndown.total_completed_hours}h</p>
                                            <p className="text-[10px] text-foreground/40">Completed</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5 text-center">
                                            <p className="text-lg font-bold text-amber-400">{Math.round(burndown.total_estimated_hours - burndown.total_completed_hours)}h</p>
                                            <p className="text-[10px] text-foreground/40">Remaining</p>
                                        </div>
                                    </div>

                                    {/* Simple bar chart */}
                                    {burndown.data_points && burndown.data_points.length > 0 && (
                                        <div>
                                            <p className="text-xs text-foreground/40 mb-3">Remaining vs Ideal (last data points)</p>
                                            <div className="space-y-1.5">
                                                {burndown.data_points.slice(-10).map((dp, i) => {
                                                    const maxH = burndown.total_estimated_hours || 1;
                                                    return (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <span className="text-[10px] text-foreground/40 w-16 truncate">{new Date(dp.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                                            <div className="flex-1 relative h-4 bg-foreground/[0.02] rounded overflow-hidden">
                                                                <div className="absolute h-full bg-blue-500/30 rounded" style={{ width: `${(dp.remaining_hours / maxH) * 100}%` }} title={`Remaining: ${dp.remaining_hours}h`} />
                                                                <div className="absolute h-1 bg-green-500 top-1.5 rounded" style={{ width: `${(dp.ideal_hours / maxH) * 100}%` }} title={`Ideal: ${dp.ideal_hours}h`} />
                                                            </div>
                                                            <span className="text-[10px] text-foreground/40 w-10 text-right">{dp.remaining_hours}h</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex items-center gap-4 mt-3 text-[10px] text-foreground/40">
                                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500/30 rounded" /> Remaining</span>
                                                <span className="flex items-center gap-1"><span className="w-3 h-1 bg-green-500 rounded" /> Ideal</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

        </div>
    );
}
