"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getToken } from "@/lib/auth";

export interface WsNotification {
    type: string;
    title?: string;
    message?: string;
    notification_id?: string;
    count?: number;
    link?: string;
}

interface UseWebSocketReturn {
    connected: boolean;
    unreadCount: number;
    latestMessage: WsNotification | null;
    markRead: (notificationId: string) => void;
    refreshCount: () => void;
}

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    .replace(/^https/, "wss")
    .replace(/^http/, "ws");

const MAX_RETRY_DELAY = 30_000;

export function useWebSocket(): UseWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryDelay = useRef(1_000);
    const mounted = useRef(true);

    const [connected, setConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [latestMessage, setLatestMessage] = useState<WsNotification | null>(null);

    const send = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    const markRead = useCallback((notificationId: string) => {
        send({ type: "mark_read", notification_id: notificationId });
    }, [send]);

    const refreshCount = useCallback(() => {
        send({ type: "get_unread_count" });
    }, [send]);

    const connect = useCallback(() => {
        if (!mounted.current) return;
        const token = getToken();
        if (!token) return;

        const url = `${BASE_URL}/ws/notifications?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!mounted.current) return;
            setConnected(true);
            retryDelay.current = 1_000;
            // Ask for unread count on connect
            ws.send(JSON.stringify({ type: "get_unread_count" }));
            // Heartbeat
            heartbeatRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "ping" }));
                }
            }, 25_000);
        };

        ws.onmessage = (evt) => {
            if (!mounted.current) return;
            try {
                const msg: WsNotification = JSON.parse(evt.data);
                if (msg.type === "unread_count" && msg.count !== undefined) {
                    setUnreadCount(msg.count);
                } else if (msg.type === "pong") {
                    // heartbeat ok — no-op
                } else if (msg.type !== "read_confirmed" && msg.type !== "error") {
                    // Real notification
                    setLatestMessage(msg);
                    setUnreadCount((c) => c + 1);
                    // Dispatch a custom DOM event so any component can show a toast
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("ws-notification", { detail: msg }));
                    }
                }
            } catch { /* ignore malformed */ }
        };

        ws.onclose = () => {
            if (!mounted.current) return;
            setConnected(false);
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            // Exponential backoff reconnect
            retryRef.current = setTimeout(() => {
                retryDelay.current = Math.min(retryDelay.current * 2, MAX_RETRY_DELAY);
                connect();
            }, retryDelay.current);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, []);

    useEffect(() => {
        mounted.current = true;
        connect();
        return () => {
            mounted.current = false;
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            if (retryRef.current) clearTimeout(retryRef.current);
            wsRef.current?.close();
        };
    }, [connect]);

    return { connected, unreadCount, latestMessage, markRead, refreshCount };
}
