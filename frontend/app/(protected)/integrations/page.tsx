"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Link2, Plus, Trash2, Loader2, Activity, Check, X,
    Zap, Globe, Mail, Cloud, MessageSquare, Play, RefreshCw,
    Shield, AlertCircle, ChevronDown, ChevronRight, Eye,
} from "lucide-react";
import {
    listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, getWebhookLogs,
    listIntegrations, createIntegration, deleteIntegration,
    type Webhook, type Integration, type WebhookLog,
} from "@/services/integrations";

// ─── Config ───────────────────────────────────────────────────────────────────

const WEBHOOK_EVENTS = [
    "task.created", "task.updated", "task.completed", "task.deleted",
    "project.created", "project.updated",
    "user.assigned", "comment.added",
];

const INTEGRATION_PROVIDERS = [
    { type: "calendar", provider: "google_calendar", label: "Google Calendar", icon: "🗓️" },
    { type: "chat", provider: "slack", label: "Slack", icon: "💬" },
    { type: "chat", provider: "teams", label: "Microsoft Teams", icon: "🔵" },
    { type: "storage", provider: "google_drive", label: "Google Drive", icon: "📁" },
    { type: "storage", provider: "dropbox", label: "Dropbox", icon: "📦" },
    { type: "email", provider: "smtp", label: "Custom SMTP", icon: "✉️" },
    { type: "email", provider: "sendgrid", label: "SendGrid", icon: "📧" },
];

const ICON_MAP: Record<string, any> = {
    calendar: Activity, chat: MessageSquare, storage: Cloud, email: Mail,
};

// ─── Webhook Card ─────────────────────────────────────────────────────────────

function WebhookCard({ wh, onToggle, onDelete, onTest, onViewLogs }: {
    wh: Webhook;
    onToggle: (wh: Webhook) => void;
    onDelete: (id: string) => void;
    onTest: (id: string) => void;
    onViewLogs: (id: string) => void;
}) {
    const [testing, setTesting] = useState(false);
    const [togged, setTogging] = useState(false);

    const handleTest = async () => {
        setTesting(true);
        await onTest(wh.id);
        setTesting(false);
    };

    return (
        <div className={`p-4 rounded-2xl border transition-all ${wh.is_active
                ? "border-foreground/10 bg-foreground/[0.02] dark:bg-foreground/[0.01]"
                : "border-foreground/5 bg-foreground/[0.01] dark:bg-white/[0.01] opacity-60"
            }`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${wh.is_active ? "bg-green-500" : "bg-foreground/20"}`} />
                    <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{wh.name}</p>
                        <p className="text-xs text-foreground/50 truncate">{wh.url}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={handleTest} disabled={testing}
                        className="p-1.5 rounded-lg text-foreground/40 hover:text-blue-500 hover:bg-blue-500/10 transition-colors" title="Test">
                        {testing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    </button>
                    <button onClick={() => onViewLogs(wh.id)}
                        className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/10 transition-colors" title="Logs">
                        <Eye size={12} />
                    </button>
                    <button onClick={() => onToggle(wh)}
                        className={`p-1.5 rounded-lg transition-colors ${wh.is_active ? "text-green-500 hover:text-foreground/50" : "text-foreground/30 hover:text-green-500"}`}
                        title={wh.is_active ? "Disable" : "Enable"}>
                        {wh.is_active ? <Check size={12} /> : <X size={12} />}
                    </button>
                    <button onClick={() => onDelete(wh.id)}
                        className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Delete">
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
                {wh.events.map((e) => (
                    <span key={e} className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400">{e}</span>
                ))}
            </div>
            {wh.failure_count > 0 && (
                <p className="text-[10px] text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle size={10} /> {wh.failure_count} recent failure{wh.failure_count !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}

// ─── Webhook Create Modal ─────────────────────────────────────────────────────

function WebhookModal({ onSave, onClose }: { onSave: (wh: Webhook) => void; onClose: () => void }) {
    const [form, setForm] = useState({ name: "", url: "", secret: "", events: [] as string[] });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const toggle = (ev: string) => setForm((f) => ({
        ...f, events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));

    const handleSave = async () => {
        if (!form.name.trim() || !form.url.trim()) { setError("Name and URL are required"); return; }
        if (form.events.length === 0) { setError("Select at least one event"); return; }
        setSaving(true); setError("");
        try {
            const wh = await createWebhook({ name: form.name, url: form.url, events: form.events, secret: form.secret || undefined });
            onSave(wh);
        } catch (e: any) { setError(e?.message || "Failed to create"); }
        finally { setSaving(false); }
    };

    const fieldCls = "w-full px-3 py-2.5 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-foreground placeholder-foreground/30 focus:outline-none focus:border-blue-500/50 text-sm";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-5 border-b border-foreground/10">
                    <h2 className="font-semibold text-foreground">New Webhook</h2>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm"><AlertCircle size={13} />{error}</div>}
                    <div>
                        <label className="block text-xs text-foreground/50 mb-1">Name</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldCls} placeholder="My Webhook" />
                    </div>
                    <div>
                        <label className="block text-xs text-foreground/50 mb-1">Endpoint URL</label>
                        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={fieldCls} placeholder="https://…" />
                    </div>
                    <div>
                        <label className="block text-xs text-foreground/50 mb-1">Secret (optional)</label>
                        <input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} className={fieldCls} placeholder="Signing secret…" />
                    </div>
                    <div>
                        <label className="block text-xs text-foreground/50 mb-2">Events to trigger</label>
                        <div className="grid grid-cols-2 gap-2">
                            {WEBHOOK_EVENTS.map((ev) => (
                                <button key={ev} type="button" onClick={() => toggle(ev)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${form.events.includes(ev)
                                            ? "bg-blue-500/20 text-blue-500 dark:text-blue-400 border border-blue-500/30"
                                            : "bg-foreground/[0.03] text-foreground/60 border border-foreground/10 hover:bg-foreground/[0.06]"
                                        }`}>
                                    {ev}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-5 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/50 hover:text-foreground">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
                        {saving && <Loader2 size={13} className="animate-spin" />} Create Webhook
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Log Modal ────────────────────────────────────────────────────────────────

function LogsModal({ webhookId, onClose }: { webhookId: string; onClose: () => void }) {
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getWebhookLogs(webhookId, 30).then(setLogs).finally(() => setLoading(false));
    }, [webhookId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-foreground/10">
                    <h2 className="font-semibold text-foreground">Webhook Delivery Logs</h2>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-400" /></div>
                    ) : logs.length === 0 ? (
                        <p className="text-center text-foreground/40 py-12 text-sm">No delivery logs yet</p>
                    ) : (
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                                    {["Event", "Status", "Response Time", "Time"].map((h) => (
                                        <th key={h} className="text-left px-4 py-2.5 text-foreground/40 font-medium">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log: any, i) => (
                                    <tr key={i} className="border-b border-foreground/5 hover:bg-foreground/[0.02]">
                                        <td className="px-4 py-2.5 text-foreground/70">{log.event_type || "—"}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.is_success ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"
                                                }`}>
                                                {log.status_code || (log.is_success ? "200" : "ERR")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-foreground/50">{log.response_time_ms ? `${log.response_time_ms}ms` : "—"}</td>
                                        <td className="px-4 py-2.5 text-foreground/40">
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWebhookModal, setShowWebhookModal] = useState(false);
    const [logsFor, setLogsFor] = useState<string | null>(null);
    const [tab, setTab] = useState<"integrations" | "webhooks">("integrations");
    const [toast, setToast] = useState("");
    const [addingIntegration, setAddingIntegration] = useState(false);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [whs, ints] = await Promise.all([listWebhooks(), listIntegrations()]);
            setWebhooks(whs); setIntegrations(ints);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleToggleWebhook = async (wh: Webhook) => {
        try {
            const updated = await updateWebhook(wh.id, { is_active: !wh.is_active });
            setWebhooks((prev) => prev.map((w) => w.id === wh.id ? updated : w));
        } catch { showToast("Failed to toggle webhook"); }
    };

    const handleDeleteWebhook = async (id: string) => {
        try {
            await deleteWebhook(id);
            setWebhooks((prev) => prev.filter((w) => w.id !== id));
            showToast("Webhook deleted");
        } catch { showToast("Failed to delete"); }
    };

    const handleTestWebhook = async (id: string) => {
        try {
            await testWebhook(id);
            showToast("Test webhook sent");
        } catch { showToast("Test failed"); }
    };

    const handleConnectIntegration = async (type: string, provider: string, label: string) => {
        setAddingIntegration(true);
        try {
            const integration = await createIntegration({ name: label, type, provider });
            setIntegrations((prev) => [...prev, integration]);
            showToast(`${label} connected`);
        } catch (e: any) { showToast(e?.message || "Failed to connect"); }
        finally { setAddingIntegration(false); }
    };

    const handleDisconnectIntegration = async (id: string, label: string) => {
        try {
            await deleteIntegration(id);
            setIntegrations((prev) => prev.filter((i) => i.id !== id));
            showToast(`${label} disconnected`);
        } catch { showToast("Failed to disconnect"); }
    };

    const TABS = [
        { id: "integrations" as const, label: "App Integrations", icon: Globe },
        { id: "webhooks" as const, label: "Webhooks", icon: Zap },
    ];

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm shadow-2xl">
                    <Check size={14} /> {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Link2 size={22} className="text-blue-500 dark:text-blue-400" /> Integrations
                    </h1>
                    <p className="text-sm text-foreground/50 mt-1">Connect external apps and configure webhook delivery</p>
                </div>
                {tab === "webhooks" && (
                    <button onClick={() => setShowWebhookModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                        <Plus size={15} /> New Webhook
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-foreground/[0.04] border border-foreground/10 rounded-xl p-1 w-fit">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === id
                                ? "bg-blue-600 text-white"
                                : "text-foreground/50 hover:text-foreground"
                            }`}>
                        <Icon size={14} /> {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-400" /></div>
            ) : tab === "integrations" ? (
                /* ── App Integrations ── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {INTEGRATION_PROVIDERS.map((p) => {
                        const connected = integrations.find((i) => i.provider === p.provider);
                        const IconComp = ICON_MAP[p.type] || Globe;
                        return (
                            <div key={p.provider} className={`p-5 rounded-2xl border transition-all ${connected
                                    ? "border-green-500/20 bg-green-500/5 dark:bg-green-500/5"
                                    : "border-foreground/10 bg-foreground/[0.02] dark:bg-foreground/[0.01] hover:bg-foreground/[0.04] dark:hover:bg-foreground/[0.02]"
                                }`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">{p.icon}</span>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm">{p.label}</p>
                                        <p className="text-xs text-foreground/50 capitalize">{p.type}</p>
                                    </div>
                                    {connected && (
                                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-500 font-semibold">Connected</span>
                                    )}
                                </div>
                                {connected ? (
                                    <button onClick={() => handleDisconnectIntegration(connected.id, p.label)}
                                        className="w-full py-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-medium transition-colors">
                                        Disconnect
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleConnectIntegration(p.type, p.provider, p.label)}
                                        disabled={addingIntegration}
                                        className="w-full py-2 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-500 dark:text-blue-400 hover:bg-blue-600/25 text-xs font-medium transition-colors disabled:opacity-50">
                                        Connect
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── Webhooks ── */
                <div className="space-y-3">
                    {webhooks.length === 0 ? (
                        <div className="text-center py-16">
                            <Zap size={40} className="text-foreground/20 mx-auto mb-3" />
                            <p className="text-foreground/40 text-sm">No webhooks yet</p>
                            <button onClick={() => setShowWebhookModal(true)}
                                className="mt-4 text-blue-500 dark:text-blue-400 hover:underline text-sm flex items-center gap-1 mx-auto">
                                <Plus size={13} /> Create your first webhook
                            </button>
                        </div>
                    ) : webhooks.map((wh) => (
                        <WebhookCard key={wh.id} wh={wh}
                            onToggle={handleToggleWebhook}
                            onDelete={handleDeleteWebhook}
                            onTest={handleTestWebhook}
                            onViewLogs={(id) => setLogsFor(id)}
                        />
                    ))}
                </div>
            )}

            {showWebhookModal && (
                <WebhookModal
                    onSave={(wh) => { setWebhooks((prev) => [wh, ...prev]); setShowWebhookModal(false); showToast("Webhook created"); }}
                    onClose={() => setShowWebhookModal(false)}
                />
            )}

            {logsFor && <LogsModal webhookId={logsFor} onClose={() => setLogsFor(null)} />}
        </div>
    );
}
