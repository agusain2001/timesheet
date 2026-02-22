"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Bell, Check, CheckCheck, Trash2, Filter, RefreshCw,
    Loader2, X, Clock, MessageSquare, AlertTriangle,
    CheckCircle2, UserPlus, GitBranch,
} from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
    id: string;
    type: string;
    title: string;
    message?: string;
    is_read: boolean;
    created_at: string;
    data?: Record<string, any>;
    actor_name?: string;
    actor_avatar?: string;
}

// ─── Notification icon map ────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { Icon: any; bg: string; text: string }> = {
    task_assigned: { Icon: UserPlus, bg: "bg-indigo-500/10", text: "text-indigo-400" },
    task_completed: { Icon: CheckCircle2, bg: "bg-green-500/10", text: "text-green-400" },
    task_overdue: { Icon: AlertTriangle, bg: "bg-red-500/10", text: "text-red-400" },
    comment_added: { Icon: MessageSquare, bg: "bg-blue-500/10", text: "text-blue-400" },
    status_changed: { Icon: GitBranch, bg: "bg-violet-500/10", text: "text-violet-400" },
    deadline_soon: { Icon: Clock, bg: "bg-amber-500/10", text: "text-amber-400" },
    default: { Icon: Bell, bg: "bg-slate-500/10", text: "text-slate-400" },
};

function getConfig(type: string) {
    return TYPE_CONFIG[type] || TYPE_CONFIG.default;
}

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
    note,
    onRead,
    onDelete,
}: {
    note: Notification;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const { Icon, bg, text } = getConfig(note.type);

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-2xl border transition-all group ${note.is_read
                    ? "border-white/5 bg-white/2"
                    : "border-indigo-500/20 bg-indigo-500/5"
                }`}
        >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={16} className={text} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${note.is_read ? "text-slate-400" : "text-slate-200"}`}>
                        {note.title}
                    </p>
                    <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">{timeAgo(note.created_at)}</span>
                </div>
                {note.message && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{note.message}</p>
                )}
                {note.actor_name && (
                    <p className="text-xs text-indigo-400 mt-1">by {note.actor_name}</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {!note.is_read && (
                    <button
                        onClick={() => onRead(note.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-green-400 transition-colors"
                        title="Mark read"
                    >
                        <Check size={13} />
                    </button>
                )}
                <button
                    onClick={() => onDelete(note.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete"
                >
                    <X size={13} />
                </button>
            </div>

            {/* Unread dot */}
            {!note.is_read && (
                <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
            )}
        </div>
    );
}

// ─── Notifications Page ───────────────────────────────────────────────────────

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [typeFilter, setTypeFilter] = useState("");

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: "100" });
            if (filter === "unread") params.set("unread_only", "true");
            const data = await apiFetch(`/notifications?${params.toString()}`);
            setNotifications(data?.notifications || data || []);
        } catch { setNotifications([]); }
        finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const handleRead = async (id: string) => {
        await apiFetch(`/notifications/${id}/read`, { method: "POST" });
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleDelete = async (id: string) => {
        await apiFetch(`/notifications/${id}`, { method: "DELETE" });
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const handleReadAll = async () => {
        await apiFetch("/notifications/read-all", { method: "POST" });
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    const handleClearAll = async () => {
        await apiFetch("/notifications/clear-all", { method: "DELETE" });
        setNotifications([]);
    };

    const displayed = notifications.filter((n) => {
        if (filter === "unread" && n.is_read) return false;
        if (typeFilter && n.type !== typeFilter) return false;
        return true;
    });

    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const uniqueTypes = [...new Set(notifications.map((n) => n.type))];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell size={22} className="text-indigo-400" /> Notifications
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {unreadCount} unread · {notifications.length} total
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleReadAll}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                        >
                            <CheckCheck size={14} /> Mark all read
                        </button>
                    )}
                    <button
                        onClick={handleClearAll}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 text-sm transition-colors"
                    >
                        <Trash2 size={14} /> Clear all
                    </button>
                    <button
                        onClick={fetchNotifications}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* Read/unread tabs */}
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-0.5">
                    {(["all", "unread"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === f ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            {f === "unread" ? `Unread (${unreadCount})` : "All"}
                        </button>
                    ))}
                </div>

                {/* Type filter */}
                {uniqueTypes.length > 0 && (
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs"
                    >
                        <option value="">All Types</option>
                        {uniqueTypes.map((t) => (
                            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Notification list */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin text-indigo-400" />
                </div>
            ) : displayed.length === 0 ? (
                <div className="text-center py-16">
                    <Bell size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">
                        {filter === "unread" ? "No unread notifications" : "No notifications"}
                    </p>
                </div>
            ) : (
                <div className="max-w-3xl space-y-2">
                    {displayed.map((n) => (
                        <NotificationItem
                            key={n.id}
                            note={n}
                            onRead={handleRead}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
