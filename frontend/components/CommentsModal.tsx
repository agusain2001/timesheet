"use client";

import { useState, useEffect, useRef } from "react";
import { getTaskComments, createTaskComment } from "@/services/my-time";
import type { TaskComment } from "@/services/my-time";

interface CommentsModalProps {
    isOpen: boolean;
    taskId: string | null;
    taskName: string;
    onClose: () => void;
}

export default function CommentsModal({ isOpen, taskId, taskName, onClose }: CommentsModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !taskId) return;
        setLoading(true);
        setError(null);
        getTaskComments(taskId)
            .then((data) => { setComments(data); setLoading(false); })
            .catch(() => { setError("Failed to load comments"); setLoading(false); });
    }, [isOpen, taskId]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    // Auto-scroll to bottom when comments update
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handlePost = async () => {
        if (!taskId || !newComment.trim()) return;
        setPosting(true);
        try {
            const created = await createTaskComment(taskId, newComment.trim());
            setComments((prev) => [...prev, created]);
            setNewComment("");
        } catch {
            setError("Failed to post comment");
        } finally {
            setPosting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handlePost();
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        const diffDay = Math.floor(diffHr / 24);
        if (diffDay < 7) return `${diffDay}d ago`;
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (!isOpen || !taskId) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="relative w-full max-w-[560px] h-[600px] flex flex-col rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-foreground/5">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-foreground">Comments</h2>
                        <p className="text-xs text-foreground/40 mt-0.5 truncate">{taskName}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-foreground/10 transition text-foreground/50 hover:text-foreground shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Comments List */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-foreground/10 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-foreground/10 rounded w-32" />
                                        <div className="h-3 bg-foreground/10 rounded w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error && comments.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-foreground/40">{error}</p>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="mx-auto w-12 h-12 rounded-full bg-foreground/[0.04] flex items-center justify-center mb-3">
                                <svg className="w-6 h-6 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-foreground/50">No comments yet</p>
                            <p className="text-xs text-foreground/30 mt-1">Be the first to comment on this task.</p>
                        </div>
                    ) : (
                        comments.map((c) => (
                            <div key={c.id} className="flex gap-3 group">
                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">
                                    {c.user ? getInitials(c.user.full_name) : "?"}
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-medium text-foreground">{c.user?.full_name || "Unknown"}</span>
                                        <span className="text-xs text-foreground/30">{formatTime(c.created_at)}</span>
                                        {c.is_edited && <span className="text-xs text-foreground/20">(edited)</span>}
                                    </div>
                                    <p className="text-sm text-foreground/70 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <div className="border-t border-foreground/5 p-4">
                    <div className="flex items-end gap-3">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Write a comment..."
                            rows={1}
                            className="flex-1 px-3 py-2.5 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-lg text-foreground placeholder-foreground/25 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition resize-none"
                        />
                        <button
                            onClick={handlePost}
                            disabled={posting || !newComment.trim()}
                            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition disabled:opacity-40 shrink-0"
                        >
                            {posting ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" strokeWidth={2} className="opacity-25" />
                                    <path strokeWidth={2} className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
