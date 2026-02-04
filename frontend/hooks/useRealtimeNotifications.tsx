/**
 * Real-time WebSocket Notifications Hook
 * Provides live notification updates via WebSocket connection
 */

import { useState, useEffect, useCallback, useRef } from "react";

// =============== Types ===============

export interface RealtimeNotification {
    id: string;
    type: "task" | "mention" | "comment" | "reminder" | "approval" | "system" | "chat";
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}

export interface WebSocketMessage {
    type: "notification" | "task_update" | "comment" | "presence" | "typing" | "ping" | "pong";
    payload: unknown;
    timestamp: string;
}

export interface UseRealtimeNotificationsOptions {
    url?: string;
    autoConnect?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    onNotification?: (notification: RealtimeNotification) => void;
    onTaskUpdate?: (taskId: string, update: Record<string, unknown>) => void;
    onPresenceUpdate?: (userId: string, status: "online" | "offline" | "away") => void;
}

export interface UseRealtimeNotificationsReturn {
    notifications: RealtimeNotification[];
    unreadCount: number;
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    connect: () => void;
    disconnect: () => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotification: (id: string) => void;
    sendMessage: (message: WebSocketMessage) => void;
}

// =============== Hook ===============

export function useRealtimeNotifications(
    options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
    const {
        url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/notifications",
        autoConnect = true,
        reconnectAttempts = 5,
        reconnectInterval = 3000,
        onNotification,
        onTaskUpdate,
        onPresenceUpdate,
    } = options;

    const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate unread count
    const unreadCount = notifications.filter((n) => !n.read).length;

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setIsConnecting(true);
        setError(null);

        try {
            // Get auth token from storage
            const token = typeof window !== "undefined"
                ? localStorage.getItem("access_token") || sessionStorage.getItem("access_token")
                : null;

            const wsUrl = token ? `${url}?token=${token}` : url;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("WebSocket connected");
                setIsConnected(true);
                setIsConnecting(false);
                setError(null);
                reconnectAttemptsRef.current = 0;

                // Send ping every 30 seconds to keep connection alive
                const pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping", timestamp: new Date().toISOString() }));
                    }
                }, 30000);

                // Store interval for cleanup
                (ws as WebSocket & { pingInterval?: NodeJS.Timeout }).pingInterval = pingInterval;
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    handleMessage(message);
                } catch (err) {
                    console.error("Failed to parse WebSocket message:", err);
                }
            };

            ws.onerror = (event) => {
                console.error("WebSocket error:", event);
                setError("Connection error occurred");
            };

            ws.onclose = (event) => {
                console.log("WebSocket closed:", event.code, event.reason);
                setIsConnected(false);
                setIsConnecting(false);

                // Clear ping interval
                const pingInterval = (ws as WebSocket & { pingInterval?: NodeJS.Timeout }).pingInterval;
                if (pingInterval) clearInterval(pingInterval);

                // Attempt to reconnect
                if (reconnectAttemptsRef.current < reconnectAttempts && !event.wasClean) {
                    reconnectAttemptsRef.current++;
                    console.log(`Reconnecting... Attempt ${reconnectAttemptsRef.current}/${reconnectAttempts}`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, reconnectInterval);
                }
            };

            wsRef.current = ws;
        } catch (err) {
            console.error("Failed to create WebSocket:", err);
            setError("Failed to connect");
            setIsConnecting(false);
        }
    }, [url, reconnectAttempts, reconnectInterval]);

    // Handle incoming messages
    const handleMessage = useCallback(
        (message: WebSocketMessage) => {
            switch (message.type) {
                case "notification":
                    const notification = message.payload as RealtimeNotification;
                    setNotifications((prev) => [notification, ...prev]);
                    onNotification?.(notification);

                    // Show browser notification if permitted
                    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                        new Notification(notification.title, {
                            body: notification.message,
                            icon: "/favicon.ico",
                        });
                    }
                    break;

                case "task_update":
                    const taskUpdate = message.payload as { taskId: string; update: Record<string, unknown> };
                    onTaskUpdate?.(taskUpdate.taskId, taskUpdate.update);
                    break;

                case "presence":
                    const presence = message.payload as { userId: string; status: "online" | "offline" | "away" };
                    onPresenceUpdate?.(presence.userId, presence.status);
                    break;

                case "pong":
                    // Server acknowledged our ping
                    break;

                default:
                    console.log("Unknown message type:", message.type);
            }
        },
        [onNotification, onTaskUpdate, onPresenceUpdate]
    );

    // Disconnect from WebSocket
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        if (wsRef.current) {
            wsRef.current.close(1000, "Client disconnecting");
            wsRef.current = null;
        }

        setIsConnected(false);
    }, []);

    // Mark notification as read
    const markAsRead = useCallback((id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );

        // Send to server
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({
                    type: "mark_read",
                    payload: { notificationId: id },
                    timestamp: new Date().toISOString(),
                })
            );
        }
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({
                    type: "mark_all_read",
                    payload: {},
                    timestamp: new Date().toISOString(),
                })
            );
        }
    }, []);

    // Clear a notification
    const clearNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    // Send custom message
    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn("WebSocket not connected");
        }
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    // Request browser notification permission
    useEffect(() => {
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    return {
        notifications,
        unreadCount,
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
        markAsRead,
        markAllAsRead,
        clearNotification,
        sendMessage,
    };
}

// =============== Context Provider (optional) ===============

import { createContext, useContext, ReactNode } from "react";

const RealtimeNotificationsContext = createContext<UseRealtimeNotificationsReturn | null>(null);

export function RealtimeNotificationsProvider({
    children,
    options = {},
}: {
    children: ReactNode;
    options?: UseRealtimeNotificationsOptions;
}) {
    const notifications = useRealtimeNotifications(options);

    return (
        <RealtimeNotificationsContext.Provider value= { notifications } >
        { children }
        </RealtimeNotificationsContext.Provider>
    );
}

export function useRealtimeNotificationsContext(): UseRealtimeNotificationsReturn {
    const context = useContext(RealtimeNotificationsContext);
    if (!context) {
        throw new Error(
            "useRealtimeNotificationsContext must be used within RealtimeNotificationsProvider"
        );
    }
    return context;
}

// =============== Utility Functions ===============

/**
 * Format notification timestamp relative to now
 */
export function formatNotificationTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: RealtimeNotification["type"]): string {
    const icons: Record<RealtimeNotification["type"], string> = {
        task: "📋",
        mention: "@",
        comment: "💬",
        reminder: "⏰",
        approval: "✅",
        system: "🔔",
        chat: "💭",
    };
    return icons[type] || "🔔";
}
