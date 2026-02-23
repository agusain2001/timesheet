"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Bot, Send, Loader2, Zap, AlertTriangle, BarChart2, Users,
    Sparkles, X, Plus, CheckCircle2, Clock, ChevronRight,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage { role: "user" | "ai"; text: string; loading?: boolean; }
interface Priority { task_id: string; task_name: string; priority_score: number; suggested_priority: string; current_priority: string; }
interface Risk { task_id: string; task_name: string; due_date?: string; risk_score: number; risk_level: string; factors: string[]; }
interface Suggestion { type: string; message: string; priority: string; }

type Tab = "chat" | "priorities" | "risks" | "workload";

// ─── API ──────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Request failed");
    return res.json();
}

// ─── Priority / Risk config ───────────────────────────────────────────────────

const RISK_BADGE: Record<string, string> = {
    low: "bg-green-500/20 text-green-400",
    medium: "bg-amber-500/20 text-amber-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-red-500/20 text-red-400",
};

const PRIORITY_BADGE: Record<string, string> = {
    urgent: "bg-red-500/20 text-red-400",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-blue-500/20 text-blue-400",
    low: "bg-slate-500/20 text-slate-400",
};

// ─── AI Chat ──────────────────────────────────────────────────────────────────

function ChatTab() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: "ai", text: "👋 Hi! I'm your AI assistant. I can help you create tasks from natural language, analyze your workload, or answer questions about your projects. Try saying: *\"Create a bug fix task for the login page, high priority, due next Friday\"*" },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput("");
        setMessages((m) => [...m, { role: "user", text }, { role: "ai", text: "", loading: true }]);
        setLoading(true);

        try {
            // Try NL task creation first
            const res = await apiFetch("/api/ai/create-from-text", {
                method: "POST",
                body: JSON.stringify({ text }),
            });
            let reply = "";
            if (res.success && res.task) {
                reply = `✅ Task created: **"${res.task.name}"** with **${res.task.priority}** priority${res.task.due_date ? `, due ${new Date(res.task.due_date).toLocaleDateString()}` : ""}. Status: ${res.task.status}.`;
            } else {
                reply = res.message || "I wasn't able to create a task from that. Try being more specific, e.g. 'Create a task to write tests for the auth module, medium priority, due Monday.'";
            }
            setMessages((m) => [...m.slice(0, -1), { role: "ai", text: reply }]);
        } catch {
            setMessages((m) => [...m.slice(0, -1), { role: "ai", text: "Sorry, I encountered an error. Please try again." }]);
        } finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "ai" && (
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <Bot size={14} className="text-indigo-400" />
                            </div>
                        )}
                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${msg.role === "user"
                            ? "bg-indigo-600 text-white rounded-tr-sm"
                            : "bg-white/8 border border-white/10 text-slate-300 rounded-tl-sm"
                            }`}>
                            {msg.loading ? (
                                <span className="flex items-center gap-2 text-slate-500">
                                    <Loader2 size={12} className="animate-spin" /> Thinking…
                                </span>
                            ) : (
                                <span dangerouslySetInnerHTML={{
                                    __html: msg.text
                                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                                        .replace(/\n/g, "<br/>")
                                }} />
                            )}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                        placeholder="Describe a task to create, or ask a question…"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 text-sm"
                    />
                    <button onClick={send} disabled={!input.trim() || loading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-40">
                        <Send size={14} />
                    </button>
                </div>
                <p className="text-[10px] text-slate-700 mt-2 text-center">AI can create tasks from natural language descriptions</p>
            </div>
        </div>
    );
}

// ─── Smart Priorities Tab ─────────────────────────────────────────────────────

function PrioritiesTab() {
    const [items, setItems] = useState<Priority[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState<string | null>(null);

    useEffect(() => {
        apiFetch("/api/ai/prioritize?limit=20")
            .then(setItems).catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, []);

    const apply = async (id: string) => {
        setApplying(id);
        try {
            await apiFetch(`/ai/apply-priority/${id}`, { method: "POST" });
            setItems((prev) => prev.map((p) => p.task_id === id ? { ...p, current_priority: p.suggested_priority } : p));
        } catch { } finally { setApplying(null); }
    };

    if (loading) return <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>;

    return (
        <div className="space-y-2">
            <p className="text-xs text-slate-500 mb-4">AI-calculated priority scores based on due dates, dependencies, and workload. Click "Apply" to update a task's priority.</p>
            {items.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-sm">No active tasks to prioritize.</div>
            ) : items.map((p) => (
                <div key={p.task_id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-400">{Math.round(p.priority_score)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-300 truncate">{p.task_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_BADGE[p.current_priority] || "bg-slate-500/20 text-slate-400"}`}>
                                {p.current_priority}
                            </span>
                            <ChevronRight size={10} className="text-slate-600" />
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_BADGE[p.suggested_priority] || "bg-slate-500/20 text-slate-400"}`}>
                                {p.suggested_priority}
                            </span>
                        </div>
                    </div>
                    {p.suggested_priority !== p.current_priority && (
                        <button onClick={() => apply(p.task_id)} disabled={applying === p.task_id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 text-xs font-medium transition-colors disabled:opacity-50 shrink-0">
                            {applying === p.task_id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            Apply
                        </button>
                    )}
                    {p.suggested_priority === p.current_priority && (
                        <span className="text-xs text-green-500 shrink-0 flex items-center gap-1"><CheckCircle2 size={10} /> Up to date</span>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Deadline Risks Tab ───────────────────────────────────────────────────────

function RisksTab() {
    const [risks, setRisks] = useState<Risk[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch("/api/ai/deadline-risks")
            .then(setRisks).catch(() => setRisks([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>;

    return (
        <div className="space-y-2">
            <p className="text-xs text-slate-500 mb-4">Tasks at risk of missing their deadline based on complexity, workload, and velocity data.</p>
            {risks.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-sm">🎉 No deadline risks detected!</div>
            ) : risks.map((r) => (
                <div key={r.task_id} className="p-4 rounded-xl border border-white/8 bg-white/3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-medium text-slate-300">{r.task_name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${RISK_BADGE[r.risk_level] || "bg-slate-500/20 text-slate-400"}`}>
                            {r.risk_level}
                        </span>
                    </div>
                    {r.due_date && (
                        <p className="text-xs text-slate-600 flex items-center gap-1 mb-2">
                            <Clock size={10} /> Due {new Date(r.due_date).toLocaleDateString()}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                        {r.factors.map((f, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-500 text-[10px]">{f}</span>
                        ))}
                    </div>
                    {/* Risk bar */}
                    <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500"
                            style={{ width: `${Math.min(100, r.risk_score)}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── AI Page ──────────────────────────────────────────────────────────────────

export default function AIPage() {
    const [tab, setTab] = useState<Tab>("chat");

    const TABS = [
        { id: "chat" as Tab, label: "AI Assistant", icon: Bot },
        { id: "priorities" as Tab, label: "Smart Priorities", icon: Sparkles },
        { id: "risks" as Tab, label: "Deadline Risks", icon: AlertTriangle },
    ];

    return (
        <div className="min-h-screen p-6 bg-background text-foreground flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                    <Bot size={24} className="text-indigo-400" /> AI Assistant
                </h1>
                <p className="text-sm text-slate-500 mt-1">Create tasks from natural language, predict risks, and optimize priorities</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit mb-6">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                            }`}>
                        <Icon size={14} /> {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 rounded-2xl border border-white/10 bg-white/3 overflow-hidden flex flex-col max-w-3xl" style={{ minHeight: "60vh" }}>
                {tab === "chat" && <ChatTab />}
                {tab === "priorities" && <div className="flex-1 overflow-y-auto p-4"><PrioritiesTab /></div>}
                {tab === "risks" && <div className="flex-1 overflow-y-auto p-4"><RisksTab /></div>}
            </div>
        </div>
    );
}
