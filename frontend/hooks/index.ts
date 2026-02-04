/**
 * Frontend Hooks
 * Barrel export for all custom React hooks
 */

// Re-export from useRealtimeNotifications
export {
    useRealtimeNotifications,
    RealtimeNotificationsProvider,
    useRealtimeNotificationsContext,
    formatNotificationTime,
    getNotificationIcon,
} from "./useRealtimeNotifications";

export type {
    RealtimeNotification,
    WebSocketMessage,
    UseRealtimeNotificationsOptions,
    UseRealtimeNotificationsReturn,
} from "./useRealtimeNotifications";
