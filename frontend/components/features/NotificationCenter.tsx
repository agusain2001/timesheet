"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    Notification as NotificationData,
} from "@/services/notifications";

// =============== Types ===============

export type NotificationType = "task" | "mention" | "comment" | "system" | "reminder" | "approval" | "task_assigned" | "due_soon" | "overdue";

export interface Notification {
    id: string;
    type: NotificationType | string;
    title: string;
    message?: string;
    read: boolean;
    created_at: string;
    link?: string;
    actor?: {
        id: string;
        name: string;
        avatar?: string;
    };
    metadata?: Record<string, unknown>;
}

interface NotificationCenterProps {
    onNotificationClick?: (notification: Notification) => void;
}

// =============== Icons ===============

const BellIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const TaskIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const CommentIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const MentionIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
    </svg>
);

const ReminderIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ApprovalIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SystemIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const SettingsIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// =============== Helper Functions ===============

const getNotificationIcon = (type: string) => {
    switch (type) {
        case "task":
        case "task_assigned":
            return <TaskIcon />;
        case "comment":
            return <CommentIcon />;
        case "mention":
            return <MentionIcon />;
        case "reminder":
        case "due_soon":
            return <ReminderIcon />;
        case "approval":
            return <ApprovalIcon />;
        case "system":
        default:
            return <SystemIcon />;
    }
};

const getNotificationColor = (type: string) => {
    switch (type) {
        case "task":
        case "task_assigned":
            return "bg-blue-500";
        case "comment":
            return "bg-purple-500";
        case "mention":
            return "bg-yellow-500";
        case "reminder":
        case "due_soon":
            return "bg-orange-500";
        case "approval":
            return "bg-emerald-500";
        case "system":
        default:
            return "bg-gray-500";
    }
};

const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

// Convert API notification to component notification format
const mapNotification = (n: NotificationData): Notification => ({
    id: n.id,
    type: n.type as NotificationType,
    title: n.title,
    message: n.message,
    read: n.is_read,
    created_at: n.created_at,
    link: n.link,
});

// =============== Notification Item Component ===============

interface NotificationItemProps {
    notification: Notification;
    onClick: () => void;
    onMarkRead: () => void;
}

function NotificationItem({ notification, onClick, onMarkRead }: NotificationItemProps) {
    return (
        <div
            className={`flex gap-3 p-3 cursor-pointer transition-colors group ${notification.read ? "hover:bg-foreground/5" : "bg-blue-500/5 hover:bg-blue-500/10"
                }`}
            onClick={onClick}
        >
            {/* Icon */}
            <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white ${getNotificationColor(
                    notification.type
                )}`}
            >
                {getNotificationIcon(notification.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p
                            className={`text-sm truncate ${notification.read ? "text-foreground/70" : "text-foreground font-medium"
                                }`}
                        >
                            {notification.title}
                        </p>
                        <p className="text-xs text-foreground/50 line-clamp-2 mt-0.5">
                            {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            {notification.actor && (
                                <span className="text-xs text-foreground/40">
                                    {notification.actor.name}
                                </span>
                            )}
                            <span className="text-xs text-foreground/40">
                                {timeAgo(notification.created_at)}
                            </span>
                        </div>
                    </div>

                    {!notification.read && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkRead();
                            }}
                            className="p-1 hover:bg-foreground/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Mark as read"
                        >
                            <CheckIcon />
                        </button>
                    )}
                </div>
            </div>

            {/* Unread indicator */}
            {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
            )}
        </div>
    );
}

// =============== Main Component ===============

export function NotificationCenter({ onNotificationClick }: NotificationCenterProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications from API
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await getNotifications({ limit: 50 });
            setNotifications(response.items.map(mapNotification));
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    // Load notifications on mount and when dropdown opens
    useEffect(() => {
        fetchNotifications();
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const filteredNotifications =
        filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read via API
        try {
            await markAsRead(notification.id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
            );
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
        onNotificationClick?.(notification);
        setIsOpen(false);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-foreground/10 rounded-lg transition-colors"
            >
                <BellIcon className="w-5 h-5 text-foreground/70" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-background border border-foreground/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
                        <h3 className="font-semibold text-foreground">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button className="p-1 hover:bg-foreground/10 rounded transition-colors">
                                <SettingsIcon />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 px-2 py-2 border-b border-foreground/10">
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === "all"
                                ? "bg-foreground/10 text-foreground"
                                : "text-foreground/60 hover:text-foreground"
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter("unread")}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${filter === "unread"
                                ? "bg-foreground/10 text-foreground"
                                : "text-foreground/60 hover:text-foreground"
                                }`}
                        >
                            Unread
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {filteredNotifications.length > 0 ? (
                            <div className="divide-y divide-foreground/5">
                                {filteredNotifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={() => handleNotificationClick(notification)}
                                        onMarkRead={() => handleMarkRead(notification.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                                <BellIcon className="w-12 h-12 text-foreground/20 mb-3" />
                                <p className="text-foreground/50 text-sm">
                                    {filter === "unread"
                                        ? "No unread notifications"
                                        : "No notifications yet"}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-foreground/10 p-2">
                        <button className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-foreground/5 rounded-lg transition-colors">
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Export for use in other components
export default NotificationCenter;
