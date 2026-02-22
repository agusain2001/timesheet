"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Bell, Check, CheckCheck, Trash2, RefreshCw, Loader2, X,
    MessageSquare, AlertTriangle, CheckCircle2, UserPlus, Clock,
} from "lucide-react";
import {
    getNotifications, markAsRead, markAllAsRead,
    deleteNotification, getUnreadCount,
    type Notification,
} from "@/services/notifications";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_MAP: Record<string, { Icon: any; cls: string }> = {
    task_assigned: { Icon: UserPlus, cls: "bg-indigo-500/10 text-indigo-400" },
    task_completed: { Icon: CheckCircle2, cls: "bg-green-500/10 text-green-400" },
    task_overdue: { Icon: AlertTriangle, cls: "bg-red-500/10 text-red-400" },
    comment: { Icon: MessageSquare, cls: "bg-blue-500/10 text-blue-400" },
    mention: { Icon: MessageSquare, cls: "bg-purple-500/10 text-purple-400" },
    reminder: { Icon: Clock, cls: "bg-amber-500/10 text-amber-400" },
    approval: { Icon: CheckCircle2, cls: "bg-teal-500/10 text-teal-400" },
    default: { Icon: Bell, cls: "bg-slate-500/10 text-slate-400" },
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
    note, onRead, onDelete,
}: {
    note: Notification;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const { Icon, cls } = getConfig(note.type);
    return (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border transition-all group ${note.is_read
            ? "border-white/5 bg-white/2"
            : "border-indigo-500/20 bg-indigo-500/5"
            }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls}`}>
                <Icon size={16} />
            </div>
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
                {note.link && (
                    <a href={note.link} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 block" onClick={(e) => e.stopPropagation()}>
                        View →
                    </a>
                )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {!note.is_read && (
                    <button onClick={() => onRead(note.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-green-400 transition-colors" title="Mark read">
                        <Check size={13} />
                    </button>
                )}
                <button onClick={() => onDelete(note.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                    <X size={13} />
                </button>
            </div>
            {!note.is_read && (
                <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
            )}
        </div>
    );
}

// ─── Notifications Page ───────────────────────────────────────────────────────

export default function NotificationsPage() {
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

    useEffect(() => { fetchData(); }, [fetchData]);

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

    const uniqueTypes = [...new Set(notifications.map((n) => n.type))];
    const displayed = notifications.filter((n) => {
        if (filter === "unread" && n.is_read) return false;
        if (typeFilter && n.type !== typeFilter) return false;
        return true;
    });

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-100">
                        <Bell size={22} className="text-indigo-400" /> Notifications
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {unread} unread · {notifications.length} total
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {unread > 0 && (
                        <button onClick={handleReadAll}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-sm transition-colors">
                            <CheckCheck size={14} /> Mark all read
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-0.5">
                    {(["all", "unread"] as const).map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === f ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                                }`}>
                            {f === "unread" ? `Unread (${unread})` : "All"}
                        </button>
                    ))}
                </div>

                {uniqueTypes.length > 1 && (
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs">
                        <option value="">All Types</option>
                        {uniqueTypes.map((t) => (
                            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin text-indigo-400" />
                </div>
            ) : displayed.length === 0 ? (
                <div className="text-center py-16">
                    <Bell size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">
                        {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                    </p>
                </div>
            ) : (
                <div className="max-w-2xl space-y-2">
                    {displayed.map((n) => (
                        <NotificationItem key={n.id} note={n} onRead={handleRead} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}
