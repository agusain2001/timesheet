"use client";

import { useEffect, useState } from "react";
import { LayoutContainer } from "./LayoutContainer";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useWebSocket, WsNotification } from "@/hooks/useWebSocket";

// ─── Toast ───────────────────────────────────────────────────────────────────

function NotificationToast({ notif, onDismiss }: { notif: WsNotification; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!notif.title && !notif.message) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[999] flex items-start gap-3 max-w-sm w-full bg-foreground/[0.05] border border-foreground/10 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-300"
      onClick={onDismiss}
    >
      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
      <div className="flex-1 min-w-0">
        {notif.title && (
          <p className="text-sm font-semibold text-foreground/90 truncate">{notif.title}</p>
        )}
        {notif.message && (
          <p className="text-xs text-foreground/60 mt-0.5 line-clamp-2">{notif.message}</p>
        )}
      </div>
      <button className="text-foreground/40 hover:text-foreground/60 text-xs shrink-0">✕</button>
    </div>
  );
}

// ─── ContentShell — wraps every protected page ───────────────────────────────

interface Props {
  children: React.ReactNode;
}

export function ContentShell({ children }: Props) {
  const { latestMessage } = useWebSocket();
  const [toast, setToast] = useState<WsNotification | null>(null);

  // Show toast whenever a real notification arrives
  useEffect(() => {
    if (latestMessage && latestMessage.type !== "pong" && latestMessage.type !== "unread_count") {
      setToast(latestMessage);
    }
  }, [latestMessage]);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col">
      {/* Navbar full width */}
      <Navbar />

      {/* Below navbar */}
      <LayoutContainer sidebar={<Sidebar />}>{children}</LayoutContainer>

      {/* Real-time notification toast */}
      {toast && (
        <NotificationToast notif={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
