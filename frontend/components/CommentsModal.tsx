"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getTaskComments, createTaskComment } from "@/services/my-time";
import type { TaskComment } from "@/services/my-time";
import { getToken } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentsModalProps {
    isOpen: boolean;
    taskId: string | null;
    taskName: string;
    onClose: () => void;
}

interface Reaction {
    emoji: string;
    count: number;
    reacted: boolean;
}

interface CommentWithReactions extends TaskComment {
    reactions?: Reaction[];
}

interface User {
    id: string;
    full_name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "🙌"];
const API = process.env.NEXT_PUBLIC_API_URL || "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Reaction Row ─────────────────────────────────────────────────────────────

function ReactionRow({
    commentId,
    reactions,
    onToggle,
}: {
    commentId: string;
    reactions: Reaction[];
    onToggle: (commentId: string, emoji: string) => void;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const active = reactions.filter(r => r.count > 0);
    return (
        <div className="flex items-center gap-1 mt-1 flex-wrap">
            {active.map(r => (
                <button
                    key={r.emoji}
                    onClick={() => onToggle(commentId, r.emoji)}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${r.reacted
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                        : "border-foreground/10 bg-foreground/[0.03] text-foreground/60 hover:border-foreground/20"
                        }`}
                >
                    <span>{r.emoji}</span>
                    <span className="text-[10px]">{r.count}</span>
                </button>
            ))}
            <div className="relative">
                <button
                    onClick={() => setPickerOpen(!pickerOpen)}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-foreground/10 text-foreground/30 hover:text-foreground/60 hover:border-foreground/20 transition-colors text-xs"
                    title="Add reaction"
                >
                    +
                </button>
                {pickerOpen && (
                    <div className="absolute bottom-8 left-0 z-10 flex gap-1 p-2 bg-[#1e293b] border border-foreground/10 rounded-xl shadow-xl">
                        {REACTION_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => { onToggle(commentId, emoji); setPickerOpen(false); }}
                                className="hover:scale-125 transition-transform text-base leading-none"
                            >{emoji}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function CommentsModal({ isOpen, taskId, taskName, onClose }: CommentsModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [comments, setComments] = useState<CommentWithReactions[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // @mentions state
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null); // null = closed
    const [mentionAnchor, setMentionAnchor] = useState(0); // caret position where @ was typed

    const filteredUsers = mentionQuery !== null
        ? allUsers.filter(u => u.full_name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
        : [];

    const loadComments = useCallback(async () => {
        if (!taskId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getTaskComments(taskId);
            setComments(data.map((c: TaskComment) => ({ ...c, reactions: [] })));
        } catch { setError("Failed to load comments"); }
        finally { setLoading(false); }
    }, [taskId]);

    useEffect(() => {
        if (isOpen && taskId) { loadComments(); }
    }, [isOpen, taskId, loadComments]);

    useEffect(() => {
        if (!isOpen) return;
        const token = getToken();
        fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then(setAllUsers)
            .catch(() => { });
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    // Handle textarea input — detect @mentions
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const caret = e.target.selectionStart ?? 0;
        setNewComment(val);

        // find the last @ before caret and check if it's a mention trigger
        const textBeforeCaret = val.slice(0, caret);
        const match = textBeforeCaret.match(/@(\w*)$/);
        if (match) {
            setMentionQuery(match[1]);
            setMentionAnchor(caret - match[0].length);
        } else {
            setMentionQuery(null);
        }
    };

    const insertMention = (user: User) => {
        const before = newComment.slice(0, mentionAnchor);
        const after = newComment.slice(textareaRef.current?.selectionStart ?? mentionAnchor);
        const inserted = `@${user.full_name} `;
        setNewComment(before + inserted + after);
        setMentionQuery(null);
        setTimeout(() => {
            if (textareaRef.current) {
                const pos = before.length + inserted.length;
                textareaRef.current.setSelectionRange(pos, pos);
                textareaRef.current.focus();
            }
        }, 0);
    };

    const handlePost = async () => {
        if (!taskId || !newComment.trim()) return;
        setPosting(true);
        try {
            const created = await createTaskComment(taskId, newComment.trim());
            setComments(prev => [...prev, { ...created, reactions: [] }]);
            setNewComment("");
            setMentionQuery(null);
        } catch { setError("Failed to post comment"); }
        finally { setPosting(false); }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (mentionQuery !== null && filteredUsers.length > 0) {
            if (e.key === "Escape") { e.preventDefault(); setMentionQuery(null); return; }
        }
        if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
            e.preventDefault();
            handlePost();
        }
    };

    const toggleReaction = async (commentId: string, emoji: string) => {
        setComments(prev => prev.map(c => {
            if (c.id !== commentId) return c;
            const existing = c.reactions?.find(r => r.emoji === emoji);
            const updated: Reaction[] = existing
                ? (c.reactions ?? []).map(r =>
                    r.emoji === emoji
                        ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
                        : r
                )
                : [...(c.reactions ?? []), { emoji, count: 1, reacted: true }];
            return { ...c, reactions: updated.filter(r => r.count > 0) };
        }));
        // Fire-and-forget API call
        try {
            const token = getToken();
            await fetch(`${API}/api/tasks/${taskId}/comments/${commentId}/reactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ emoji }),
            });
        } catch { }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    if (!isOpen || !taskId) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="relative w-full max-w-[560px] h-[640px] flex flex-col rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden">
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
                            {[1, 2, 3].map(i => (
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
                        comments.map(c => (
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
                                    <p className="text-sm text-foreground/70 mt-0.5 whitespace-pre-wrap break-words">
                                        {/* Highlight @mentions */}
                                        {c.content.split(/(@\w[\w\s]*)/g).map((part, i) =>
                                            part.startsWith("@")
                                                ? <span key={i} className="text-blue-400 font-medium">{part}</span>
                                                : <span key={i}>{part}</span>
                                        )}
                                    </p>
                                    <ReactionRow
                                        commentId={c.id}
                                        reactions={c.reactions ?? []}
                                        onToggle={toggleReaction}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <div className="border-t border-foreground/5 p-4 relative">
                    {/* @mention dropdown */}
                    {mentionQuery !== null && filteredUsers.length > 0 && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#1e293b] border border-foreground/10 rounded-xl shadow-xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                            {filteredUsers.map(u => (
                                <button
                                    key={u.id}
                                    onMouseDown={e => { e.preventDefault(); insertMention(u); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-foreground/[0.02] transition text-left"
                                >
                                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-bold text-blue-400 shrink-0">
                                        {u.full_name.charAt(0)}
                                    </div>
                                    <span className="text-sm text-foreground/80">{u.full_name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex items-end gap-3">
                        <textarea
                            ref={textareaRef}
                            value={newComment}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Write a comment… (use @ to mention)"
                            rows={2}
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
                    <p className="text-[10px] text-foreground/20 mt-1">Enter to send · Shift+Enter for new line · @ to mention</p>
                </div>
            </div>
        </div>
    );
}
