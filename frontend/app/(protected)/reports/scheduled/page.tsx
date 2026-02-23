"use client";

import { useState, useCallback, useEffect } from "react";
import {
    CalendarClock, Plus, Trash2, Loader2, X, AlertCircle, RefreshCw,
} from "lucide-react";
import { getToken } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledReport {
    id: string;
    report_type: string;
    frequency: string;
    next_run?: string;
    last_run?: string;
    hour?: number;
    minute?: number;
}

interface ScheduleForm {
    report_type: string;
    frequency: string;
    hour: string;
    minute: string;
    day_of_week: string;
    day_of_month: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

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

// ─── Config ───────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
    { value: "task_aging", label: "Task Aging" },
    { value: "completion_trends", label: "Completion Trends" },
    { value: "team_velocity", label: "Team Velocity" },
    { value: "workload", label: "Workload Distribution" },
    { value: "project_variance", label: "Project Variance" },
    { value: "team_performance", label: "Team Performance" },
];

const FREQUENCIES = ["daily", "weekly", "monthly"];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Schedule Modal ───────────────────────────────────────────────────────────

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
            await apiFetch("/api/reports/schedule", {
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

    const selectCls = "w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50";
    const inputCls = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-slate-200">Schedule a Report</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Report Type</label>
                        <select value={form.report_type} onChange={(e) => setForm({ ...form, report_type: e.target.value })} className={selectCls}>
                            {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Frequency</label>
                        <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={selectCls}>
                            {FREQUENCIES.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                        </select>
                    </div>

                    {form.frequency === "weekly" && (
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Day of Week</label>
                            <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className={selectCls}>
                                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                            </select>
                        </div>
                    )}

                    {form.frequency === "monthly" && (
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Day of Month</label>
                            <input type="number" min={1} max={28} value={form.day_of_month}
                                onChange={(e) => setForm({ ...form, day_of_month: e.target.value })}
                                className={inputCls} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Hour (0-23)</label>
                            <input type="number" min={0} max={23} value={form.hour}
                                onChange={(e) => setForm({ ...form, hour: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Minute</label>
                            <input type="number" min={0} max={59} step={15} value={form.minute}
                                onChange={(e) => setForm({ ...form, minute: e.target.value })} className={inputCls} />
                        </div>
                    </div>

                    <p className="text-xs text-slate-600 bg-white/3 border border-white/8 rounded-lg p-3">
                        Reports will be delivered to your email on the configured schedule.
                    </p>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-white/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Scheduled Reports Page ───────────────────────────────────────────────────

export default function ScheduledReportsPage() {
    const [reports, setReports] = useState<ScheduledReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [cancelling, setCancelling] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch("/api/reports/scheduled");
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
            fetchAll();
        } catch { } finally { setCancelling(null); }
    };

    const reportLabel = (type: string) =>
        REPORT_TYPES.find((r) => r.value === type)?.label ?? type.replace(/_/g, " ");

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <CalendarClock size={22} className="text-indigo-400" /> Scheduled Reports
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Automate recurring report delivery via email</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-slate-300 transition-colors">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
                        <Plus size={16} /> Schedule Report
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin text-indigo-400" />
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-16">
                    <CalendarClock size={48} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No scheduled reports yet.</p>
                    <button onClick={() => setShowModal(true)}
                        className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1.5 mx-auto">
                        <Plus size={14} /> Schedule your first report
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                {["Report Type", "Frequency", "Time", "Next Run", ""].map((h) => (
                                    <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((r) => (
                                <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                    <td className="px-5 py-3 text-slate-300 font-medium capitalize">{reportLabel(r.report_type)}</td>
                                    <td className="px-5 py-3">
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-400 capitalize">{r.frequency}</span>
                                    </td>
                                    <td className="px-5 py-3 text-slate-400 text-xs">
                                        {r.hour != null ? `${String(r.hour).padStart(2, "0")}:${String(r.minute ?? 0).padStart(2, "0")}` : "—"}
                                    </td>
                                    <td className="px-5 py-3 text-slate-500 text-xs">
                                        {r.next_run ? new Date(r.next_run).toLocaleString() : "—"}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => handleCancel(r.id)}
                                            disabled={cancelling === r.id}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors disabled:opacity-50 ml-auto"
                                        >
                                            {cancelling === r.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                            Cancel
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <ScheduleModal
                    onSave={() => { setShowModal(false); fetchAll(); }}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}
