"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Bell, CheckCircle2, Loader2, Save, Send, Clock, RefreshCw } from "lucide-react";
import { getToken } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailPreferences {
    task_assignments: boolean;
    task_comments: boolean;
    task_mentions: boolean;
    task_due_reminders: boolean;
    task_overdue: boolean;
    project_updates: boolean;
    weekly_digest: boolean;
    daily_summary: boolean;
    approval_requests: boolean;
    system_alerts: boolean;
}

interface ReminderSettings {
    enabled: boolean;
    days_before_due: number[];
    time: string;
    timezone: string;
}

interface DigestSettings {
    enabled: boolean;
    frequency: string;
    day_of_week?: number;
    time: string;
    include_overdue: boolean;
    include_upcoming: boolean;
    include_completed: boolean;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Request failed");
    return res.json();
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-indigo-500" : "bg-white/10"}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
        </button>
    );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Icon size={16} className="text-indigo-400" /> {title}
            </h2>
            {children}
        </div>
    );
}

function PrefRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
            <div>
                <p className="text-sm font-medium text-slate-300">{label}</p>
                {desc && <p className="text-xs text-slate-600 mt-0.5">{desc}</p>}
            </div>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}

// ─── Email Notifications Page ─────────────────────────────────────────────────

export default function EmailNotificationsPage() {
    const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
    const [reminder, setReminder] = useState<ReminderSettings | null>(null);
    const [digest, setDigest] = useState<DigestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testSent, setTestSent] = useState(false);
    const [toast, setToast] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [p, r, d] = await Promise.all([
                apiFetch("/api/notifications/email/preferences"),
                apiFetch("/api/notifications/email/reminders"),
                apiFetch("/api/notifications/email/digest"),
            ]);
            setPrefs(p); setReminder(r); setDigest(d);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const savePrefs = async () => {
        if (!prefs) return;
        setSaving(true);
        try {
            await apiFetch("/api/notifications/email/preferences", { method: "PUT", body: JSON.stringify(prefs) });
            showToast("Email preferences saved");
        } catch { showToast("Failed to save"); }
        finally { setSaving(false); }
    };

    const saveReminder = async () => {
        if (!reminder) return;
        setSaving(true);
        try {
            await apiFetch("/api/notifications/email/reminders", { method: "PUT", body: JSON.stringify(reminder) });
            showToast("Reminder settings saved");
        } catch { showToast("Failed to save"); }
        finally { setSaving(false); }
    };

    const saveDigest = async () => {
        if (!digest) return;
        setSaving(true);
        try {
            await apiFetch("/api/notifications/email/digest", { method: "PUT", body: JSON.stringify(digest) });
            showToast("Digest settings saved");
        } catch { showToast("Failed to save"); }
        finally { setSaving(false); }
    };

    const sendTest = async () => {
        try {
            await apiFetch("/api/notifications/email/test", { method: "POST" });
            setTestSent(true);
            showToast("Test email sent to your address");
            setTimeout(() => setTestSent(false), 4000);
        } catch { showToast("Failed to send test"); }
    };

    const selectCls = "px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50";
    const inputCls = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50";

    if (loading) return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
    );

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground max-w-3xl">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm shadow-2xl animate-in slide-in-from-top-2">
                    <CheckCircle2 size={14} /> {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Mail size={22} className="text-indigo-400" /> Email Notifications
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Configure when and how you receive email notifications</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-slate-300 transition-colors">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={sendTest}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-sm transition-colors">
                        {testSent ? <CheckCircle2 size={14} className="text-green-400" /> : <Send size={14} />}
                        {testSent ? "Sent!" : "Send Test"}
                    </button>
                </div>
            </div>

            {/* Email Preferences */}
            {prefs && (
                <Card title="Notification Events" icon={Bell}>
                    <PrefRow label="Task Assignments" desc="When a task is assigned to you" checked={prefs.task_assignments} onChange={(v) => setPrefs({ ...prefs, task_assignments: v })} />
                    <PrefRow label="Task Comments" desc="When someone comments on your task" checked={prefs.task_comments} onChange={(v) => setPrefs({ ...prefs, task_comments: v })} />
                    <PrefRow label="Mentions" desc="When you are @mentioned" checked={prefs.task_mentions} onChange={(v) => setPrefs({ ...prefs, task_mentions: v })} />
                    <PrefRow label="Due Date Reminders" checked={prefs.task_due_reminders} onChange={(v) => setPrefs({ ...prefs, task_due_reminders: v })} />
                    <PrefRow label="Overdue Alerts" checked={prefs.task_overdue} onChange={(v) => setPrefs({ ...prefs, task_overdue: v })} />
                    <PrefRow label="Project Updates" checked={prefs.project_updates} onChange={(v) => setPrefs({ ...prefs, project_updates: v })} />
                    <PrefRow label="Approval Requests" checked={prefs.approval_requests} onChange={(v) => setPrefs({ ...prefs, approval_requests: v })} />
                    <PrefRow label="System Alerts" checked={prefs.system_alerts} onChange={(v) => setPrefs({ ...prefs, system_alerts: v })} />
                    <PrefRow label="Weekly Digest" desc="Weekly summary of your tasks" checked={prefs.weekly_digest} onChange={(v) => setPrefs({ ...prefs, weekly_digest: v })} />
                    <PrefRow label="Daily Summary" checked={prefs.daily_summary} onChange={(v) => setPrefs({ ...prefs, daily_summary: v })} />
                    <button onClick={savePrefs} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Preferences
                    </button>
                </Card>
            )}

            {/* Reminder Settings */}
            {reminder && (
                <Card title="Task Reminders" icon={Clock}>
                    <div className="flex items-center justify-between py-2 mb-3">
                        <div>
                            <p className="text-sm font-medium text-slate-300">Enable Task Reminders</p>
                            <p className="text-xs text-slate-600">Receive emails before tasks are due</p>
                        </div>
                        <Toggle checked={reminder.enabled} onChange={(v) => setReminder({ ...reminder, enabled: v })} />
                    </div>
                    {reminder.enabled && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Remind me (days before due)</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[1, 2, 3, 5, 7, 14].map((d) => (
                                        <button key={d} type="button"
                                            onClick={() => {
                                                const curr = reminder.days_before_due;
                                                setReminder({ ...reminder, days_before_due: curr.includes(d) ? curr.filter((x) => x !== d) : [...curr, d].sort() });
                                            }}
                                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${reminder.days_before_due.includes(d)
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                                                }`}>
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Time</label>
                                    <input type="time" value={reminder.time} onChange={(e) => setReminder({ ...reminder, time: e.target.value })} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Timezone</label>
                                    <select value={reminder.timezone} onChange={(e) => setReminder({ ...reminder, timezone: e.target.value })} className={selectCls}>
                                        {["UTC", "Asia/Kolkata", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Singapore"].map((tz) => (
                                            <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                    <button onClick={saveReminder} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Reminders
                    </button>
                </Card>
            )}

            {/* Digest Settings */}
            {digest && (
                <Card title="Email Digest" icon={Mail}>
                    <div className="flex items-center justify-between py-2 mb-3">
                        <div>
                            <p className="text-sm font-medium text-slate-300">Enable Digest Emails</p>
                            <p className="text-xs text-slate-600">Periodic summary of your task activity</p>
                        </div>
                        <Toggle checked={digest.enabled} onChange={(v) => setDigest({ ...digest, enabled: v })} />
                    </div>
                    {digest.enabled && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Frequency</label>
                                    <select value={digest.frequency} onChange={(e) => setDigest({ ...digest, frequency: e.target.value })} className={selectCls}>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Delivery Time</label>
                                    <input type="time" value={digest.time} onChange={(e) => setDigest({ ...digest, time: e.target.value })} className={inputCls} />
                                </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-white/8">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Include in digest</p>
                                <PrefRow label="Overdue Tasks" checked={digest.include_overdue} onChange={(v) => setDigest({ ...digest, include_overdue: v })} />
                                <PrefRow label="Upcoming Tasks" checked={digest.include_upcoming} onChange={(v) => setDigest({ ...digest, include_upcoming: v })} />
                                <PrefRow label="Completed Tasks" checked={digest.include_completed} onChange={(v) => setDigest({ ...digest, include_completed: v })} />
                            </div>
                        </div>
                    )}
                    <button onClick={saveDigest} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Digest Settings
                    </button>
                </Card>
            )}
        </div>
    );
}
