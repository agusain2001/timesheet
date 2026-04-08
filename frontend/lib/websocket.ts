/**
 * WebSocket Client for Real-Time Notifications
 * Connects to Django Channels WebSocket endpoint
 */

import { getToken } from "./auth";

export interface NotificationPayload {
    id: number;
    title: string;
    message: string;
    notification_type: string;
    link: string;
    data: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

export interface WebSocketMessage {
    type: "connection_established" | "notification" | "error";
    message?: string;
    payload?: NotificationPayload;
}

type NotificationCallback = (notification: NotificationPayload) => void;
type ErrorCallback = (error: string) => void;
type ConnectionCallback = () => void;

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isIntentionallyClosed = false;

    // Callbacks
    private onNotificationCallbacks: NotificationCallback[] = [];
    private onErrorCallbacks: ErrorCallback[] = [];
    private onConnectCallbacks: ConnectionCallback[] = [];
    private onDisconnectCallbacks: ConnectionCallback[] = [];

    /**
     * Connect to WebSocket with JWT token
     */
    connect(token?: string | null) {
        const authToken = token || getToken();
        if (!authToken) {
            console.error("WebSocket: No auth token available");
            return;
        }

        // Determine WebSocket URL
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/notifications/?token=${authToken}`;

        this.isIntentionallyClosed = false;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log("WebSocket: Connected");
                this.reconnectAttempts = 0;
                this.onConnectCallbacks.forEach(cb => cb());
            };

            this.ws.onmessage = (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);

                    if (data.type === "notification" && data.payload) {
                        this.onNotificationCallbacks.forEach(cb => cb(data.payload!));
                    } else if (data.type === "error" && data.message) {
                        this.onErrorCallbacks.forEach(cb => cb(data.message!));
                    } else if (data.type === "connection_established") {
                        console.log("WebSocket:", data.message);
                    }
                } catch (error) {
                    console.error("WebSocket: Failed to parse message", error);
                }
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket: Error", error);
                this.onErrorCallbacks.forEach(cb => cb("WebSocket connection error"));
            };

            this.ws.onclose = () => {
                console.log("WebSocket: Disconnected");
                this.onDisconnectCallbacks.forEach(cb => cb());

                // Auto-reconnect if not intentionally closed
                if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                    console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
                    setTimeout(() => this.connect(authToken), delay);
                }
            };
        } catch (error) {
            console.error("WebSocket: Failed to create connection", error);
            this.onErrorCallbacks.forEach(cb => cb("Failed to create WebSocket connection"));
        }
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        this.isIntentionallyClosed = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Send action to mark notification as read
     */
    markRead(id: number) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                action: "mark_read",
                id,
            }));
        }
    }

    /**
     * Send action to mark all notifications as read
     */
    markAllRead() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                action: "mark_all_read",
            }));
        }
    }

    /**
     * Register callback for notifications
     */
    onNotification(callback: NotificationCallback) {
        this.onNotificationCallbacks.push(callback);
    }

    /**
     * Register callback for errors
     */
    onError(callback: ErrorCallback) {
        this.onErrorCallbacks.push(callback);
    }

    /**
     * Register callback for connection
     */
    onConnect(callback: ConnectionCallback) {
        this.onConnectCallbacks.push(callback);
    }

    /**
     * Register callback for disconnection
     */
    onDisconnect(callback: ConnectionCallback) {
        this.onDisconnectCallbacks.push(callback);
    }

    /**
     * Get connection status
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

/**
 * Get or create WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
    if (!wsClient) {
        wsClient = new WebSocketClient();
    }
    return wsClient;
}
