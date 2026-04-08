"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Bell, Check, CheckCheck, Trash2, RefreshCw, Loader2, X,
    MessageSquare, AlertTriangle, CheckCircle2, UserPlus, Clock, Plus,
} from "lucide-react";
import {
    getNotifications, markAsRead, markAllAsRead,
    deleteNotification, getUnreadCount,
    type Notification,
} from "@/services/notifications";
import { getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_MAP: Record<string, { Icon: any; cls: string }> = {
    task_assigned: { Icon: UserPlus, cls: "bg-blue-500/10 text-blue-400" },
    task_completed: { Icon: CheckCircle2, cls: "bg-green-500/10 text-green-400" },
    task_overdue: { Icon: AlertTriangle, cls: "bg-red-500/10 text-red-400" },
    comment: { Icon: MessageSquare, cls: "bg-blue-500/10 text-blue-400" },
    mention: { Icon: MessageSquare, cls: "bg-purple-500/10 text-purple-400" },
    reminder: { Icon: Clock, cls: "bg-amber-500/10 text-amber-400" },
    approval: { Icon: CheckCircle2, cls: "bg-teal-500/10 text-teal-400" },
    default: { Icon: Bell, cls: "bg-slate-500/10 text-foreground/60" },
};

function getConfig(type: string) { return TYPE_MAP[type] || TYPE_MAP.default; }

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
    note, onRead, onDelete, onNavigate
}: {
    note: Notification;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
    onNavigate: (link: string) => void;
}) {
    const { Icon, cls } = getConfig(note.type);
    return (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border transition-all group ${note.is_read
            ? "border-foreground/5 bg-foreground/[0.01]"
            : "border-blue-500/20 bg-blue-500/5"
            }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls}`}>
                <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${note.is_read ? "text-foreground/60" : "text-foreground/90"}`}>
                        {note.title}
                    </p>
                    <span className="text-[10px] text-foreground/40 shrink-0 mt-0.5">{timeAgo(note.created_at)}</span>
                </div>
                {note.message && (
                    <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">{note.message}</p>
                )}
                {note.link && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onNavigate(note.link!); }}
                        className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
                    >
                        View →
                    </button>
                )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {!note.is_read && (
                    <button onClick={() => onRead(note.id)}
                        className="p-1.5 rounded-lg hover:bg-foreground/[0.05] text-foreground/50 hover:text-green-400 transition-colors" title="Mark read">
                        <Check size={13} />
                    </button>
                )}
                <button onClick={() => onDelete(note.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground/50 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={13} />
                </button>
            </div>
            {!note.is_read && (
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
            )}
        </div>
    );
}

// ─── Notification Rules Panel ─────────────────────────────────────────────────

interface NotifRule { id: string; name: string; rule_type: string; trigger_event: string; action_type: string; is_active: boolean; }

function RulesPanel() {
    const [rules, setRules] = useState<NotifRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", rule_type: "reminder", trigger_event: "due_soon", action_type: "notify_assignee", trigger_offset_hours: 24 });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${API}/api/notifications/rules`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setRules(await res.json());
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        const token = getToken();
        const res = await fetch(`${API}/api/notifications/rules`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        if (res.ok) { await load(); setShowForm(false); setForm({ name: "", rule_type: "reminder", trigger_event: "due_soon", action_type: "notify_assignee", trigger_offset_hours: 24 }); }
        setSaving(false);
    };

    const remove = async (id: string) => {
        const token = getToken();
        await fetch(`${API}/api/notifications/rules/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setRules(prev => prev.filter(r => r.id !== id));
    };

    if (loading) return <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-400" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/60 w-3/4">Automate when you get notified about task deadlines and escalations.</p>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">
                    <Plus size={12} /> New Rule
                </button>
            </div>

            {showForm && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Create Notification Rule</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs text-foreground/50 mb-1 block">Rule Name</label>
                            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 24h before due date" className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-xl text-sm text-foreground outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-foreground/50 mb-1 block">Type</label>
                            <select value={form.rule_type} onChange={e => setForm(p => ({ ...p, rule_type: e.target.value }))} className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-xl text-sm text-foreground outline-none">
                                <option value="reminder">Reminder</option>
                                <option value="escalation">Escalation</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-foreground/50 mb-1 block">Trigger Event</label>
                            <select value={form.trigger_event} onChange={e => setForm(p => ({ ...p, trigger_event: e.target.value }))} className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-xl text-sm text-foreground outline-none">
                                <option value="due_soon">Due Soon</option>
                                <option value="overdue">Overdue</option>
                                <option value="status_changed">Status Changed</option>
                                <option value="task_assigned">Task Assigned</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-foreground/50 mb-1 block">Notify</label>
                            <select value={form.action_type} onChange={e => setForm(p => ({ ...p, action_type: e.target.value }))} className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-xl text-sm text-foreground outline-none">
                                <option value="notify_assignee">Assignee</option>
                                <option value="notify_lead">Team Lead</option>
                                <option value="notify_pm">Project Manager</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-foreground/50 mb-1 block">Hours Offset</label>
                            <input type="number" value={form.trigger_offset_hours} onChange={e => setForm(p => ({ ...p, trigger_offset_hours: +e.target.value }))} className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-xl text-sm text-foreground outline-none" min={1} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={create} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl disabled:opacity-50 transition-colors">{saving ? "Saving…" : "Create Rule"}</button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 text-foreground/50 hover:text-foreground text-sm transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {rules.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-foreground/8 bg-foreground/[0.02]">
                    <Bell size={36} className="mx-auto text-foreground/20 mb-3" />
                    <p className="text-sm text-foreground/40">No rules yet. Create one to automate notifications.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {rules.map(rule => (
                        <div key={rule.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-foreground/8 bg-foreground/[0.02] group hover:bg-foreground/[0.04] transition-colors">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${rule.rule_type === "escalation" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                                {rule.rule_type === "escalation" ? "⚡" : "🔔"}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground/80">{rule.name}</p>
                                <p className="text-xs text-foreground/40 capitalize">{rule.trigger_event.replace(/_/g, " ")} → {rule.action_type.replace(/_/g, " ")}</p>
                            </div>
                            <button onClick={() => remove(rule.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-foreground/30 transition-all">
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function NotificationsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const router = useRouter();
    const [tab, setTab] = useState<"inbox" | "rules">("inbox");
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [typeFilter, setTypeFilter] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [data, unreadCount] = await Promise.all([
                getNotifications({ limit: 100, unread_only: filter === "unread" }),
                getUnreadCount(),
            ]);
            setNotifications(data?.items ?? []);
            setUnread(unreadCount ?? 0);
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    // Close on esc key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleRead = async (id: string) => {
        try {
            await markAsRead(id);
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
            setUnread((c) => Math.max(0, c - 1));
        } catch { }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch { }
    };

    const handleReadAll = async () => {
        try {
            await markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnread(0);
        } catch { }
    };

    const handleNavigate = (link: string) => {
        onClose();
        router.push(link);
    };

    const uniqueTypes = [...new Set(notifications.map((n) => n.type))];
    const displayed = notifications.filter((n) => {
        if (filter === "unread" && n.is_read) return false;
        if (typeFilter && n.type !== typeFilter) return false;
        return true;
    });

    return (
        <>
            <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 z-[100] w-full max-w-lg bg-background shadow-2xl overflow-y-auto flex flex-col pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-foreground/10 sticky top-0 bg-background/95 backdrop-blur z-10">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <Bell size={20} className="text-blue-500" /> Notifications
                        </h2>
                        <p className="text-sm text-foreground/50 mt-1">
                            {unread} unread · {notifications.length} total
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-foreground/50 hover:bg-foreground/5 hover:text-foreground transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                        {/* Tabs */}
                        <div className="flex gap-1 bg-foreground/5 border border-foreground/10 rounded-xl p-1 w-fit">
                            <button
                                onClick={() => setTab("inbox")}
                                className={tab === "inbox" ? "px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors bg-blue-600 text-white" : "px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors text-foreground/50 hover:text-foreground"}
                            >
                                {unread > 0 ? `Inbox (${unread})` : "Inbox"}
                            </button>
                            <button
                                onClick={() => setTab("rules")}
                                className={tab === "rules" ? "px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors bg-blue-600 text-white" : "px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors text-foreground/50 hover:text-foreground"}
                            >
                                Rules
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {tab === "inbox" && unread > 0 && (
                                <button onClick={handleReadAll}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-foreground/10 text-foreground/60 hover:text-foreground/90 text-xs transition-colors">
                                    <CheckCheck size={14} /> Mark all read
                                </button>
                            )}
                            {tab === "inbox" && (
                                <button
                                    onClick={fetchData}
                                    className="p-1.5 rounded-lg border border-foreground/10 text-foreground/50 hover:text-foreground/80 transition-colors"
                                >
                                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Inbox or Rules */}
                    {tab === "rules" ? <RulesPanel /> : (
                        <div className="flex-1 flex flex-col">
                            {/* Filters */}
                            <div className="flex items-center gap-2 flex-wrap mb-4">
                                <div className="flex bg-foreground/[0.02] border border-foreground/10 rounded-lg p-1 gap-0.5">
                                    {(["all", "unread"] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={f === filter ? "px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors capitalize bg-foreground/10 text-foreground" : "px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors capitalize text-foreground/50 hover:text-foreground/80"}
                                        >
                                            {f === "unread" ? `Unread (${unread})` : "All"}
                                        </button>
                                    ))}
                                </div>

                                {uniqueTypes.length > 1 && (
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="px-2.5 py-1.5 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground/60 text-[11px]"
                                    >
                                        <option value="">All Types</option>
                                        {uniqueTypes.map((t) => (
                                            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* List */}
                            {loading ? (
                                <div className="flex-1 flex items-center justify-center py-16">
                                    <Loader2 size={24} className="animate-spin text-blue-400" />
                                </div>
                            ) : displayed.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-16">
                                    <Bell size={40} className="text-foreground/20 mx-auto mb-4" />
                                    <p className="text-foreground/50 text-sm">
                                        {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 pb-8">
                                    {displayed.map((n) => (
                                        <NotificationItem key={n.id} note={n} onRead={handleRead} onDelete={handleDelete} onNavigate={handleNavigate} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
