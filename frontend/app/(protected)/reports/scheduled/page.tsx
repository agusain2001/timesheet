"use client";

import { useState, useCallback, useEffect } from "react";
import {
    CalendarClock, Plus, Trash2, Loader2, X, AlertCircle, RefreshCw,
    Play, Clock, Info, CheckCircle2, BarChart2,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScheduledReport {
    id: string;
    report_type: string;
    frequency: string;
    next_run?: string;
    last_run?: string;
    hour?: number;
    minute?: number;
    status?: string;
}

interface ScheduleForm {
    report_type: string;
    frequency: string;
    hour: string;
    minute: string;
    day_of_week: string;
    day_of_month: string;
}

// ─── API ───────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Request failed");
    }
    if (res.status === 204) return null;
    return res.json();
}

// ─── Config ────────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
    { value: "task_aging", label: "Task Aging", description: "Stale and old tasks" },
    { value: "completion_trends", label: "Completion Trends", description: "Task creation vs completion" },
    { value: "team_velocity", label: "Team Velocity", description: "Throughput and cycle time" },
    { value: "workload", label: "Workload Distribution", description: "Task load per team member" },
    { value: "project_variance", label: "Project Variance", description: "Planned vs actual analysis" },
    { value: "team_performance", label: "Team Performance", description: "Team KPIs and metrics" },
];

const FREQUENCIES = [
    { value: "daily", label: "Daily", icon: "🌅" },
    { value: "weekly", label: "Weekly", icon: "📅" },
    { value: "monthly", label: "Monthly", icon: "🗓️" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Schedule Modal ─────────────────────────────────────────────────────────────

function ScheduleModal({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
    const [form, setForm] = useState<ScheduleForm>({
        report_type: "task_aging",
        frequency: "weekly",
        hour: "9",
        minute: "0",
        day_of_week: "1",
        day_of_month: "1",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        setSaving(true); setError("");
        try {
            await apiFetch("/reports/schedule", {
                method: "POST",
                body: JSON.stringify({
                    report_type: form.report_type,
                    frequency: form.frequency,
                    hour: parseInt(form.hour),
                    minute: parseInt(form.minute),
                    day_of_week: form.frequency === "weekly" ? parseInt(form.day_of_week) : undefined,
                    day_of_month: form.frequency === "monthly" ? parseInt(form.day_of_month) : undefined,
                }),
            });
            onSave();
        } catch (e: any) {
            setError(e?.message ?? "Failed to schedule report");
        } finally { setSaving(false); }
    };

    const selectCls = "w-full px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/90 text-sm focus:outline-none focus:border-blue-500/50";
    const inputCls = "w-full px-3 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground/90 text-sm focus:outline-none focus:border-blue-500/50";

    const selectedType = REPORT_TYPES.find(r => r.value === form.report_type);
    const selectedFreq = FREQUENCIES.find(f => f.value === form.frequency);

    // Compute human-readable schedule description
    const timeStr = `${String(parseInt(form.hour)).padStart(2, "0")}:${String(parseInt(form.minute)).padStart(2, "0")}`;
    let scheduleDesc = "";
    if (form.frequency === "daily") scheduleDesc = `Every day at ${timeStr}`;
    else if (form.frequency === "weekly") scheduleDesc = `Every ${DAY_NAMES[parseInt(form.day_of_week)]} at ${timeStr}`;
    else if (form.frequency === "monthly") scheduleDesc = `On the ${form.day_of_month}${["st", "nd", "rd"][parseInt(form.day_of_month) - 1] || "th"} of each month at ${timeStr}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background border border-foreground/15 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-foreground/10">
                    <div className="flex items-center gap-2">
                        <CalendarClock size={18} className="text-blue-400" />
                        <h2 className="text-base font-semibold text-foreground/90">Schedule a Report</h2>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground/80 transition-colors"><X size={18} /></button>
                </div>

                <div className="p-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs text-foreground/60 mb-1.5 font-medium">Report Type</label>
                        <select value={form.report_type} onChange={e => setForm({ ...form, report_type: e.target.value })} className={selectCls}>
                            {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.description}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-foreground/60 mb-1.5 font-medium">Frequency</label>
                        <div className="grid grid-cols-3 gap-2">
                            {FREQUENCIES.map(f => (
                                <button key={f.value} type="button"
                                    onClick={() => setForm({ ...form, frequency: f.value })}
                                    className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${form.frequency === f.value
                                        ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                                        : "border-foreground/10 text-foreground/60 hover:border-foreground/20"}`}>
                                    <span className="block text-base mb-0.5">{f.icon}</span>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.frequency === "weekly" && (
                        <div>
                            <label className="block text-xs text-foreground/60 mb-1.5 font-medium">Day of Week</label>
                            <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })} className={selectCls}>
                                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                            </select>
                        </div>
                    )}

                    {form.frequency === "monthly" && (
                        <div>
                            <label className="block text-xs text-foreground/60 mb-1.5 font-medium">Day of Month</label>
                            <input type="number" min={1} max={28} value={form.day_of_month}
                                onChange={e => setForm({ ...form, day_of_month: e.target.value })}
                                className={inputCls} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-foreground/60 mb-1.5 font-medium">Hour (0–23)</label>
                            <input type="number" min={0} max={23} value={form.hour}
                                onChange={e => setForm({ ...form, hour: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs text-foreground/60 mb-1.5 font-medium">Minute</label>
                            <input type="number" min={0} max={59} step={15} value={form.minute}
                                onChange={e => setForm({ ...form, minute: e.target.value })} className={inputCls} />
                        </div>
                    </div>

                    {/* Preview */}
                    {scheduleDesc && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                            <Info size={12} className="text-blue-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-300/80">{scheduleDesc} — the <strong>{selectedType?.label}</strong> report will be generated and saved automatically.</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground/90 transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Frequency Badge ─────────────────────────────────────────────────────────────

function FreqBadge({ freq }: { freq: string }) {
    const map: Record<string, string> = {
        daily: "bg-emerald-500/15 text-emerald-400",
        weekly: "bg-blue-500/15 text-blue-400",
        monthly: "bg-violet-500/15 text-violet-400",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[freq] ?? "bg-foreground/10 text-foreground/50"}`}>{freq}</span>
    );
}

// ─── Scheduled Reports Page ─────────────────────────────────────────────────────

export default function ScheduledReportsPage() {
    const [reports, setReports] = useState<ScheduledReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [runningNow, setRunningNow] = useState<string | null>(null);
    const [toast, setToast] = useState("");

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch("/reports/scheduled");
            setReports(data?.reports ?? []);
        } catch {
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCancel = async (id: string) => {
        setCancelling(id);
        try {
            await apiFetch(`/reports/scheduled/${id}`, { method: "DELETE" });
            showToast("Scheduled report removed");
            fetchAll();
        } catch { } finally { setCancelling(null); }
    };

    const handleRunNow = async (id: string) => {
        setRunningNow(id);
        try {
            // Trigger immediate generation using the schedule endpoint with a now-run flag
            await apiFetch(`/reports/scheduled/${id}/run`, { method: "POST" });
            showToast("Report triggered successfully");
        } catch {
            showToast("Run now not available — report will run on next schedule");
        } finally { setRunningNow(null); }
    };

    const reportLabel = (type: string) =>
        REPORT_TYPES.find(r => r.value === type)?.label ?? type.replace(/_/g, " ");

    const reportDesc = (type: string) =>
        REPORT_TYPES.find(r => r.value === type)?.description ?? "";

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">
            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-foreground/10 border border-foreground/15 text-sm text-foreground/80 shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />{toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <CalendarClock size={22} className="text-blue-400" /> Scheduled Reports
                    </h1>
                    <p className="text-sm text-foreground/50 mt-1">Automate recurring report generation on a daily, weekly, or monthly basis</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll}
                        className="p-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground/50 hover:text-foreground/80 transition-colors">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                        <Plus size={16} /> Schedule Report
                    </button>
                </div>
            </div>

            {/* How It Works */}
            <HowItWorks
                pageKey="scheduled-reports"
                color="blue"
                description="Scheduled Reports automatically generate and email reports on a recurring basis — daily, weekly, or monthly — so you never miss key insights."
                bullets={[
                    "Click Schedule Report to pick a report type, frequency, time, and email recipients.",
                    "Each report card shows the last run time, next run time, and current status.",
                    "Click Run Now to trigger an immediate execution outside the schedule.",
                    "Reports are generated in the background and emailed automatically.",
                ]}
            />

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin text-blue-400" />
                </div>
            ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="p-4 rounded-2xl bg-foreground/[0.03] border border-foreground/10">
                        <CalendarClock size={40} className="text-foreground/30" />
                    </div>
                    <div className="text-center">
                        <p className="text-foreground/70 font-medium">No Scheduled Reports Yet</p>
                        <p className="text-foreground/40 text-sm mt-1 max-w-sm">
                            Set up automated reports to receive regular insights on task aging, team velocity, workload distribution, and more.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 w-full max-w-xl">
                        {[
                            { icon: "📊", title: "Task Aging", text: "Track stale tasks weekly" },
                            { icon: "⚡", title: "Team Velocity", text: "Monitor throughput monthly" },
                            { icon: "📦", title: "Workload", text: "Balance team load daily" },
                        ].map(card => (
                            <div key={card.title} className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] text-center">
                                <div className="text-xl mb-1">{card.icon}</div>
                                <p className="text-xs font-medium text-foreground/70">{card.title}</p>
                                <p className="text-[10px] text-foreground/40 mt-0.5">{card.text}</p>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setShowModal(true)}
                        className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                        <Plus size={14} /> Schedule your first report
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-foreground/10">
                                {["Report Type", "Frequency", "Time", "Next Run", "Last Run", ""].map(h => (
                                    <th key={h} className="text-left px-5 py-3 text-xs text-foreground/50 font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map(r => (
                                <tr key={r.id} className="border-b border-foreground/5 hover:bg-foreground/[0.01] transition-colors">
                                    <td className="px-5 py-3">
                                        <p className="text-foreground/80 font-medium capitalize">{reportLabel(r.report_type)}</p>
                                        <p className="text-[10px] text-foreground/40 mt-0.5">{reportDesc(r.report_type)}</p>
                                    </td>
                                    <td className="px-5 py-3"><FreqBadge freq={r.frequency} /></td>
                                    <td className="px-5 py-3 text-foreground/60 text-xs font-mono">
                                        {r.hour != null ? `${String(r.hour).padStart(2, "0")}:${String(r.minute ?? 0).padStart(2, "0")}` : "—"}
                                    </td>
                                    <td className="px-5 py-3 text-foreground/50 text-xs">
                                        {r.next_run ? new Date(r.next_run).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
                                    </td>
                                    <td className="px-5 py-3 text-foreground/40 text-xs">
                                        {r.last_run ? new Date(r.last_run).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Never"}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => handleRunNow(r.id)}
                                                disabled={runningNow === r.id}
                                                title="Run Now"
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors disabled:opacity-50">
                                                {runningNow === r.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                                Run
                                            </button>
                                            <button
                                                onClick={() => handleCancel(r.id)}
                                                disabled={cancelling === r.id}
                                                title="Delete"
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors disabled:opacity-50">
                                                {cancelling === r.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <ScheduleModal
                    onSave={() => { setShowModal(false); fetchAll(); showToast("Report scheduled successfully!"); }}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}
