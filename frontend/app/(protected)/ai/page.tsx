"use client";

import { useState, useEffect, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import {
    Bot, Send, Loader2, Zap, AlertTriangle, Sparkles, ChevronDown,
    CheckCircle2, Clock, ChevronRight, Wrench, Check, Paperclip, X,
    Mic, MicOff, Trash2,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import {
    sendMessageWithFiles,
    scanDocuments,
    saveToActivity,
} from "@/services/chatbot";
import type { DocumentScanResult } from "@/types/api";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ─── Web Speech API types (not in default TS lib) ───────────────────────────

interface ISpeechRecognitionEvent {
    results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
}

interface ISpeechRecognitionError {
    error: string;
}

interface ISpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: ISpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: ISpeechRecognitionError) => void) | null;
}

interface ISpeechRecognitionConstructor {
    new(): ISpeechRecognition;
}

type SpeechWindow = Window & {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "assistant" | "priorities" | "risks";

interface ToolCall {
    tool_name: string;
    args: Record<string, unknown>;
    result: unknown;
}

interface DataPayload {
    type: "priorities" | "risks" | "task_created" | "task_completed" | "task_updated" | "task_deleted" | "task_list" | "priority_applied" | "time_logged" | "workload_summary";
    items?: PriorityItem[] | RiskItem[] | TaskItem[];
    task?: Record<string, any>;
    entry?: Record<string, any>;
    summary?: Record<string, any>;
    total?: number;
}

interface Attachment { file: File; preview?: string; }

interface Message {
    id: string;
    role: "user" | "ai";
    text: string;
    loading?: boolean;
    tool_calls?: ToolCall[];
    data?: DataPayload;
    fileAttachments?: { fileName: string; fileType: string; size: number }[];
    scanResults?: DocumentScanResult[];
    timestamp?: Date;
}

interface PriorityItem {
    task_id: string; task_name: string; priority_score: number;
    current_priority: string; suggested_priority: string; due_date?: string;
}

interface RiskItem {
    task_id: string; task_name: string; due_date?: string;
    risk_score: number; risk_level: string; factors: string[];
}

interface TaskItem {
    id: string; name: string; status: string; priority: string; due_date?: string;
}

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODES: { id: Mode; label: string; icon: React.ElementType; desc: string; color: string }[] = [
    { id: "assistant", label: "AI Assistant", icon: Bot, desc: "Chat, create tasks, upload docs", color: "text-blue-400" },
    { id: "priorities", label: "Smart Priorities", icon: Sparkles, desc: "AI-powered task prioritization", color: "text-purple-400" },
    { id: "risks", label: "Deadline Risks", icon: AlertTriangle, desc: "Predict deadline risks", color: "text-orange-400" },
];

const SUGGESTIONS = [
    { text: "📋 Summarize my tasks", icon: "📋" },
    { text: "⏰ Hours logged this week", icon: "⏰" },
    { text: "🔥 Show high priority tasks", icon: "🔥" },
    { text: "📄 Help me scan a document", icon: "📄" },
];

// ─── Badge config ─────────────────────────────────────────────────────────────

const PB: Record<string, string> = {
    urgent: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};
const RB: Record<string, string> = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Request failed");
    return res.json();
}

function fmtSize(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
}

function fileIcon(type: string) {
    if (type === "application/pdf" || type === "pdf") return "📄";
    if (type.startsWith("image/")) return "🖼️";
    return "📎";
}

function formatTime(d: Date) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Priority Card ────────────────────────────────────────────────────────────

function PriorityCard({ item, onApply }: { item: PriorityItem; onApply: (id: string) => void }) {
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(item.current_priority === item.suggested_priority);
    const handleApply = async () => {
        setApplying(true);
        try { await apiFetch(`/api/ai-agent/apply-priority/${item.task_id}`, { method: "POST" }); setApplied(true); onApply(item.task_id); }
        catch { /* */ } finally { setApplying(false); }
    };
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-foreground/8 bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-purple-400">{Math.round(item.priority_score)}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/90 truncate">{item.task_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${PB[item.current_priority] || ""}`}>{item.current_priority}</span>
                    <ChevronRight size={10} className="text-foreground/30" />
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${PB[item.suggested_priority] || ""}`}>{item.suggested_priority}</span>
                    {item.due_date && <span className="text-[10px] text-foreground/40 ml-1">{new Date(item.due_date).toLocaleDateString()}</span>}
                </div>
            </div>
            {applied ? <span className="text-xs text-green-400 flex items-center gap-1 shrink-0"><Check size={11} />Applied</span>
                : item.suggested_priority !== item.current_priority ? (
                    <button onClick={handleApply} disabled={applying} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-xs font-medium transition disabled:opacity-50 shrink-0">
                        {applying ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}Apply
                    </button>
                ) : <span className="text-xs text-green-400 shrink-0">✓ OK</span>}
        </div>
    );
}

// ─── Risk Card ────────────────────────────────────────────────────────────────

function RiskCard({ item }: { item: RiskItem }) {
    return (
        <div className="p-3 rounded-xl border border-foreground/8 bg-foreground/[0.02]">
            <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-medium text-foreground/90 leading-tight">{item.task_name}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 border ${RB[item.risk_level] || ""}`}>{item.risk_level}</span>
            </div>
            {item.due_date && <p className="text-[11px] text-foreground/50 flex items-center gap-1 mb-2"><Clock size={9} />Due {new Date(item.due_date).toLocaleDateString()}</p>}
            <div className="flex flex-wrap gap-1 mb-2">
                {item.factors.map((f, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-foreground/[0.04] text-foreground/50 text-[10px]">{f}</span>)}
            </div>
            <div className="h-1 rounded-full bg-foreground/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500" style={{ width: `${Math.min(100, item.risk_score)}%` }} />
            </div>
        </div>
    );
}

// ─── Scan Result Card ─────────────────────────────────────────────────────────

function ScanResultCard({ result, onSave }: { result: DocumentScanResult; onSave: (r: DocumentScanResult, t: "expense" | "task") => void }) {
    const [saving, setSaving] = useState<string | null>(null);
    const doSave = async (t: "expense" | "task") => { setSaving(t); await onSave(result, t); setSaving(null); };
    return (
        <div className="bg-foreground/[0.03] border border-foreground/10 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground/70">{fileIcon(result.file_type)} {result.file_name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${result.confidence === "high" ? "bg-green-500/15 text-green-400" : result.confidence === "medium" ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>{result.confidence}</span>
            </div>
            {result.vendor_name && <div className="text-foreground/60"><span className="text-foreground/40">Vendor:</span> {result.vendor_name}</div>}
            {result.date && <div className="text-foreground/60"><span className="text-foreground/40">Date:</span> {result.date}</div>}
            {result.total_amount != null && <div className="text-foreground/60"><span className="text-foreground/40">Amount:</span> <span className="font-semibold text-green-400">{result.total_amount} {result.currency}</span></div>}
            {result.category && <div className="text-foreground/60"><span className="text-foreground/40">Category:</span> {result.category}</div>}
            <div className="flex gap-2 mt-2 pt-2 border-t border-foreground/8">
                <button onClick={() => doSave("expense")} disabled={saving === "expense"} className="flex-1 px-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-medium hover:bg-green-500/20 transition disabled:opacity-50">
                    {saving === "expense" ? "Saving…" : "💰 Save as Expense"}</button>
                <button onClick={() => doSave("task")} disabled={saving === "task"} className="flex-1 px-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium hover:bg-blue-500/20 transition disabled:opacity-50">
                    {saving === "task" ? "Saving…" : "📋 Save as Task"}</button>
            </div>
        </div>
    );
}

// ─── Tool Chip ────────────────────────────────────────────────────────────────

function ToolChip({ name }: { name: string }) {
    const l: Record<string, string> = { create_task: "Created task", get_priority_suggestions: "Analyzed priorities", get_deadline_risks: "Assessed risks", list_tasks: "Fetched tasks", apply_priority: "Applied priority" };
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/[0.04] border border-foreground/8 text-[10px] text-foreground/50"><Wrench size={9} />{l[name] || name}</span>;
}

// ─── Mode Picker ──────────────────────────────────────────────────────────────

function ModePicker({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
    const [open, setOpen] = useState(false);
    const c = MODES.find((m) => m.id === mode)!;
    const Icon = c.icon;
    return (
        <div className="relative">
            <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-foreground/12 bg-foreground/[0.02] hover:bg-foreground/[0.05] transition text-sm font-medium text-foreground/70">
                <Icon size={14} className={c.color} />{c.label}<ChevronDown size={12} className={`text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 z-20 w-64 rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden">
                        <p className="text-[10px] text-foreground/30 font-medium px-4 pt-3 pb-2 uppercase tracking-widest">Select Mode</p>
                        {MODES.map((m) => {
                            const MIcon = m.icon;
                            return (
                                <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.04] transition ${mode === m.id ? "bg-foreground/[0.04]" : ""}`}>
                                    <MIcon size={16} className={m.color} />
                                    <div className="flex-1"><span className="text-sm font-medium text-foreground/85">{m.label}</span><p className="text-[11px] text-foreground/40">{m.desc}</p></div>
                                    {mode === m.id && <Check size={14} className="text-blue-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AIPage() {
    const [mode, setMode] = useState<Mode>("assistant");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [dragging, setDragging] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    // Voice
    const [isRecording, setIsRecording] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "unsupported" | "error">("idle");
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const intentRecordingRef = useRef(false); // tracks if user WANTS to record (vs recognition auto-stopping)

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const currentMode = MODES.find((m) => m.id === mode)!;

    // ── Load chat history from DB on mount ──
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await apiFetch("/api/ai-agent/history?limit=100");
                if (data && data.length > 0) {
                    const loaded: Message[] = data.map((m: { id: string; role: string; content: string; created_at: string }) => ({
                        id: m.id,
                        role: m.role === "user" ? "user" : "ai",
                        text: m.content,
                        timestamp: new Date(m.created_at),
                    }));
                    setMessages(loaded);
                    const hist = data.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));
                    setConversationHistory(hist);
                }
            } catch { /* first visit, no history */ }
            setHistoryLoaded(true);
        };
        loadHistory();
    }, []);

    // ── Save message to DB ──
    const persistMessage = useCallback(async (role: string, content: string, meta?: Record<string, unknown>) => {
        try {
            await apiFetch("/api/ai-agent/history", {
                method: "POST",
                body: JSON.stringify({ role, content, metadata: meta || {} }),
            });
        } catch { /* non-critical */ }
    }, []);

    // ── Clear history ──
    const clearHistory = async () => {
        try {
            await apiFetch("/api/ai-agent/history", { method: "DELETE" });
            setMessages([]);
            setConversationHistory([]);
        } catch { /* */ }
    };

    // Auto-load for priorities/risks mode
    useEffect(() => {
        if (!historyLoaded) return;
        if (mode === "priorities") sendMessage("Show me AI priority suggestions for my tasks.", mode);
        else if (mode === "risks") sendMessage("Analyze deadline risks for my tasks.", mode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, historyLoaded]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    // ── Voice-to-text ──
    const startRecognition = useCallback(() => {
        if (typeof window === "undefined") return;
        const sw = window as SpeechWindow;
        const SpeechRecognitionCtor = sw.SpeechRecognition || sw.webkitSpeechRecognition;

        if (!SpeechRecognitionCtor) {
            setVoiceStatus("unsupported");
            setTimeout(() => setVoiceStatus("idle"), 4000);
            return;
        }

        try {
            const recognition = new SpeechRecognitionCtor();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: ISpeechRecognitionEvent) => {
                let transcript = "";
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setInput(transcript);
            };

            recognition.onerror = (event: ISpeechRecognitionError) => {
                if (event.error === "no-speech") {
                    // Browser auto-stopped due to silence — restart transparently
                    recognition.stop();
                    return;
                }
                // Real error (aborted, not-allowed, audio-capture, etc.)
                intentRecordingRef.current = false;
                recognitionRef.current = null;
                setIsRecording(false);
                setVoiceStatus("error");
                setTimeout(() => setVoiceStatus("idle"), 4000);
            };

            recognition.onend = () => {
                // If user still wants to record, restart automatically
                if (intentRecordingRef.current) {
                    startRecognition();
                } else {
                    recognitionRef.current = null;
                    setIsRecording(false);
                    setVoiceStatus("idle");
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch {
            intentRecordingRef.current = false;
            setVoiceStatus("error");
            setTimeout(() => setVoiceStatus("idle"), 4000);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleVoice = () => {
        if (intentRecordingRef.current) {
            // Stop deliberately
            intentRecordingRef.current = false;
            recognitionRef.current?.stop();
            recognitionRef.current = null;
            setIsRecording(false);
            setVoiceStatus("idle");
        } else {
            // Start
            intentRecordingRef.current = true;
            setIsRecording(true);
            setVoiceStatus("recording");
            startRecognition();
        }
    };

    // ── File handling ──
    const addFiles = useCallback((fileList: FileList | File[]) => {
        const newFiles: Attachment[] = [];
        for (const f of Array.from(fileList)) {
            if (attachments.length + newFiles.length >= MAX_FILES) break;
            if (f.size > MAX_SIZE) continue;
            if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)) continue;
            newFiles.push({ file: f, preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined });
        }
        setAttachments((prev) => [...prev, ...newFiles]);
    }, [attachments.length]);

    const removeFile = (idx: number) => {
        setAttachments((prev) => { const c = [...prev]; if (c[idx]?.preview) URL.revokeObjectURL(c[idx].preview!); c.splice(idx, 1); return c; });
    };

    const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = (e: DragEvent) => { e.preventDefault(); setDragging(false); };
    const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); };

    // ── Save to activity ──
    const handleSaveToActivity = async (result: DocumentScanResult, type: "expense" | "task") => {
        try {
            const resp = await saveToActivity({
                activity_type: type,
                title: result.vendor_name ? `${result.vendor_name} - ${result.date || "No date"}` : result.file_name,
                description: result.description || result.raw_text?.slice(0, 200) || "From document scan",
                vendor: result.vendor_name ?? undefined,
                amount: result.total_amount ?? undefined,
                currency: result.currency,
                category: result.category ?? undefined,
                date: result.date ?? undefined,
            });
            const msg: Message = { id: Date.now().toString() + "_s", role: "ai", text: resp.success ? `✅ ${resp.message}` : `❌ ${resp.message}`, timestamp: new Date() };
            setMessages((p) => [...p, msg]);
            persistMessage("assistant", msg.text);
        } catch {
            const msg: Message = { id: Date.now().toString() + "_e", role: "ai", text: "❌ Failed to save.", timestamp: new Date() };
            setMessages((p) => [...p, msg]);
        }
    };

    // ── Send message ──
    const sendMessage = async (text: string, currentMode: Mode = mode) => {
        if ((!text.trim() && attachments.length === 0) || loading) return;
        const msgText = text.trim() || "(attached files)";
        setInput("");
        setLoading(true);

        const now = new Date();
        const filesMeta = attachments.map((a) => ({ fileName: a.file.name, fileType: a.file.type, size: a.file.size }));
        const userMsg: Message = { id: Date.now().toString(), role: "user", text: msgText, fileAttachments: filesMeta.length > 0 ? filesMeta : undefined, timestamp: now };
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", text: "", loading: true, timestamp: now };
        setMessages((p) => [...p, userMsg, aiMsg]);
        persistMessage("user", msgText);

        const filesToSend = attachments.map((a) => a.file);
        setAttachments([]);

        try {
            if (filesToSend.length > 0) {
                const isScan = /scan|ocr|extract/i.test(msgText);
                if (isScan) {
                    const sr = await scanDocuments(filesToSend) as { results: DocumentScanResult[] };
                    const parts = sr.results.map((r) => {
                        const l = [`📄 **${r.file_name}** (${r.confidence})`];
                        if (r.vendor_name) l.push(`Vendor: ${r.vendor_name}`);
                        if (r.total_amount != null) l.push(`Amount: **${r.total_amount} ${r.currency}**`);
                        return l.join("\n");
                    });
                    const replyText = `Scanned ${sr.results.length} document(s):\n\n${parts.join("\n\n")}`;
                    setMessages((p) => [...p.slice(0, -1), { id: aiMsg.id, role: "ai", text: replyText, scanResults: sr.results, timestamp: new Date() }]);
                    persistMessage("assistant", replyText);
                } else {
                    const data = await sendMessageWithFiles(msgText, filesToSend);
                    const reply = data.response ?? data.message ?? JSON.stringify(data);
                    setMessages((p) => [...p.slice(0, -1), { id: aiMsg.id, role: "ai", text: reply, timestamp: new Date() }]);
                    persistMessage("assistant", reply);
                }
                setConversationHistory((p) => [...p, { role: "user", content: msgText }, { role: "assistant", content: "File processed." }]);
            } else {
                const newHist = [...conversationHistory, { role: "user", content: msgText }];
                const res = await apiFetch(`/api/ai-agent/chat`, {
                    method: "POST",
                    body: JSON.stringify({ message: msgText, mode: currentMode, conversation_history: newHist.slice(-10) }),
                });
                const aiReply: Message = { id: aiMsg.id, role: "ai", text: res.response || "Done!", tool_calls: res.tool_calls || [], data: res.data || null, timestamp: new Date() };
                setMessages((p) => [...p.slice(0, -1), aiReply]);
                setConversationHistory([...newHist, { role: "assistant", content: res.response }]);
                persistMessage("assistant", res.response, { tool_calls: res.tool_calls, data: res.data });
            }
        } catch (e: unknown) {
            const err = (e instanceof Error) ? e.message : "Unknown error";
            setMessages((p) => [...p.slice(0, -1), { id: aiMsg.id, role: "ai", text: `Sorry, something went wrong: ${err}`, timestamp: new Date() }]);
        } finally { setLoading(false); }
    };

    const handleSend = () => sendMessage(input);

    const handleApplyPriority = (taskId: string) => {
        setMessages((p) => p.map((msg) => {
            if (msg.data?.type === "priorities" && msg.data.items) {
                const items = (msg.data.items as PriorityItem[]).map((i) => i.task_id === taskId ? { ...i, current_priority: i.suggested_priority } : i);
                return { ...msg, data: { ...msg.data, items } };
            }
            return msg;
        }));
    };

    // ── Render message content ──
    const renderContent = (msg: Message) => {
        if (msg.loading) {
            return (
                <div className="flex items-center gap-2 text-foreground/50 text-sm py-1">
                    <div className="flex gap-1">
                        {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                    </div>
                </div>
            );
        }
        return (
            <div className="space-y-3">
                {msg.tool_calls && msg.tool_calls.length > 0 && <div className="flex flex-wrap gap-1.5">{msg.tool_calls.map((tc, i) => <ToolChip key={i} name={tc.tool_name} />)}</div>}

                {msg.fileAttachments && msg.fileAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {msg.fileAttachments.map((a, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-foreground/5 border border-foreground/10 text-[11px] text-foreground/60">
                                {fileIcon(a.fileType)} {a.fileName} <span className="text-foreground/30">{fmtSize(a.size)}</span>
                            </span>
                        ))}
                    </div>
                )}

                {msg.text && <div className="text-[15px] leading-relaxed text-foreground/85 whitespace-pre-wrap" dangerouslySetInnerHTML={{
                    __html: msg.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/\n/g, "<br/>"),
                }} />}

                {msg.scanResults && msg.scanResults.length > 0 && <div className="space-y-2 mt-2">{msg.scanResults.map((r, i) => <ScanResultCard key={i} result={r} onSave={handleSaveToActivity} />)}</div>}

                {msg.data?.type === "priorities" && msg.data.items && (msg.data.items as PriorityItem[]).length > 0 && (
                    <div className="space-y-2 mt-2">
                        <p className="text-[11px] text-foreground/40 font-medium uppercase tracking-wide">Priority Analysis · {(msg.data.items as PriorityItem[]).length} tasks</p>
                        {(msg.data.items as PriorityItem[]).slice(0, 10).map((item) => <PriorityCard key={item.task_id} item={item} onApply={handleApplyPriority} />)}
                    </div>
                )}

                {msg.data?.type === "risks" && msg.data.items && (msg.data.items as RiskItem[]).length > 0 && (
                    <div className="space-y-2 mt-2">
                        <p className="text-[11px] text-foreground/40 font-medium uppercase tracking-wide">Deadline Risk Analysis · {(msg.data.items as RiskItem[]).length} tasks</p>
                        {(msg.data.items as RiskItem[]).slice(0, 10).map((item) => <RiskCard key={item.task_id} item={item} />)}
                    </div>
                )}

                {msg.data?.type === "task_created" && msg.data.task && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 mt-2">
                        <CheckCircle2 size={14} className="text-green-400" />
                        <div><p className="text-sm font-medium text-green-400">Task created</p><p className="text-xs text-foreground/50">{msg.data.task.name} · {msg.data.task.priority}</p></div>
                    </div>
                )}

                {msg.data?.type === "task_completed" && msg.data.task && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 mt-2">
                        <CheckCircle2 size={14} className="text-green-400" />
                        <div><p className="text-sm font-medium text-green-400">Task completed</p><p className="text-xs text-foreground/50">{msg.data.task.task_name}</p></div>
                    </div>
                )}

                {msg.data?.type === "task_updated" && msg.data.task && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mt-2">
                        <Wrench size={14} className="text-blue-400" />
                        <div><p className="text-sm font-medium text-blue-400">Task updated</p><p className="text-xs text-foreground/50">{msg.data.task.task_name} · {(msg.data.task.changes as string[])?.join(", ")}</p></div>
                    </div>
                )}

                {msg.data?.type === "task_deleted" && msg.data.task && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mt-2">
                        <Trash2 size={14} className="text-red-400" />
                        <div><p className="text-sm font-medium text-red-400">Task deleted</p><p className="text-xs text-foreground/50">{msg.data.task.task_name}</p></div>
                    </div>
                )}

                {msg.data?.type === "time_logged" && msg.data.entry && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mt-2">
                        <Clock size={14} className="text-amber-400" />
                        <div><p className="text-sm font-medium text-amber-400">Time logged</p><p className="text-xs text-foreground/50">{msg.data.entry.hours} hours on {msg.data.entry.day}</p></div>
                    </div>
                )}

                {msg.data?.type === "workload_summary" && msg.data.summary && (
                    <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] mt-2 space-y-3">
                        <p className="text-[11px] text-foreground/40 font-medium uppercase tracking-wide border-b border-foreground/8 pb-2 mb-2">Workload Summary</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-xs text-foreground/50">Active Tasks</p><p className="text-lg font-semibold text-foreground/90">{msg.data.summary.total_active_tasks}</p></div>
                            <div><p className="text-xs text-foreground/50">Hours this Week</p><p className="text-lg font-semibold text-foreground/90">{msg.data.summary.hours_this_week} / 40</p></div>
                            <div><p className="text-xs text-foreground/50">Overdue</p><p className="text-lg font-semibold text-red-400">{msg.data.summary.overdue_tasks}</p></div>
                            <div><p className="text-xs text-foreground/50">Due this Week</p><p className="text-lg font-semibold text-amber-400">{msg.data.summary.due_this_week}</p></div>
                        </div>
                    </div>
                )}

                {msg.data?.type === "task_list" && msg.data.items && (
                    <div className="space-y-1.5 mt-2">
                        {(msg.data.items as TaskItem[]).slice(0, 8).map((t) => (
                            <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg border border-foreground/8 bg-foreground/[0.02]">
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${PB[t.priority] || ""}`}>{t.priority}</span>
                                <span className="text-sm text-foreground/80 flex-1 truncate">{t.name}</span>
                                <span className="text-[10px] text-foreground/40">{t.status}</span>
                            </div>
                        ))}
                    </div>
                )}

                {msg.data?.type === "priority_applied" && msg.data.task && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 mt-2">
                        <Zap size={14} className="text-purple-400" />
                        <div><p className="text-sm font-medium text-purple-400">Priority updated</p><p className="text-xs text-foreground/50">{msg.data.task.task_name}: {msg.data.task.old_priority} → {msg.data.task.new_priority}</p></div>
                    </div>
                )}
            </div>
        );
    };

    const isEmpty = messages.length === 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER — ChatGPT-style full-page layout
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-background text-foreground" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>

            {/* How It Works */}
            <div className="px-6 pt-3">
                <HowItWorks
                    pageKey="ai-assistant"
                    color="purple"
                    description="The AI Assistant can answer project questions, create and update tasks, log time, scan documents, and summarize priorities — all via natural language."
                    bullets={[
                        "Switch modes (General / Task Manager / Analyst) using the mode picker in the top bar.",
                        "Type a request like 'Create a task for...' or 'What's overdue this week?' to get started.",
                        "Attach files (images, PDFs) using the paperclip icon — the AI can analyze their content.",
                        "Use the microphone button to speak your request instead of typing.",
                        "Actions like task creation or time logging are performed live — you'll see a confirmation card.",
                    ]}
                />
            </div>

            {/* Drag overlay */}
            {dragging && (
                <div className="fixed inset-0 z-50 bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
                    <div className="text-center"><span className="text-5xl">📁</span><p className="text-blue-400 font-semibold mt-2 text-lg">Drop files here</p></div>
                </div>
            )}

            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-foreground/8">
                <div className="flex items-center gap-3">
                    <ModePicker mode={mode} onChange={setMode} />
                </div>
                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <button onClick={clearHistory} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition" title="Clear conversation">
                            <Trash2 size={13} />New chat
                        </button>
                    )}
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto">
                {isEmpty ? (
                    /* Empty state — ChatGPT style centered greeting */
                    <div className="flex flex-col items-center justify-center h-full px-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/15 flex items-center justify-center mb-5">
                            <Bot size={28} className="text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-semibold text-foreground/90 mb-2">How can I help you today?</h1>
                        <p className="text-foreground/40 text-sm mb-8 text-center max-w-md">
                            I can create tasks, analyze priorities, scan documents, and answer questions about your projects.
                        </p>
                        <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                            {SUGGESTIONS.map((s) => (
                                <button key={s.text} onClick={() => sendMessage(s.text)}
                                    className="text-left px-4 py-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.05] transition text-sm text-foreground/60 hover:text-foreground/80">
                                    {s.text}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Messages */
                    <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}>
                                {msg.role === "ai" && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/15 flex items-center justify-center shrink-0 mt-1">
                                        <currentMode.icon size={14} className={currentMode.color} />
                                    </div>
                                )}
                                <div className={`${msg.role === "user" ? "max-w-[75%]" : "flex-1 max-w-[calc(100%-48px)]"}`}>
                                    <div className={`${msg.role === "user"
                                        ? "bg-foreground/[0.06] border border-foreground/10 rounded-2xl rounded-tr-md px-4 py-3"
                                        : ""
                                        }`}>
                                        {renderContent(msg)}
                                    </div>
                                    {msg.timestamp && !msg.loading && (
                                        <p className={`text-[10px] text-foreground/25 mt-1 ${msg.role === "user" ? "text-right" : ""}`}>
                                            {formatTime(msg.timestamp)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            {/* File preview */}
            {attachments.length > 0 && (
                <div className="max-w-3xl mx-auto w-full px-6 pb-2">
                    <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10">
                        {attachments.map((a, i) => (
                            <div key={i} className="relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10">
                                {a.preview ? <img src={a.preview} alt="" className="w-8 h-8 rounded object-cover" /> : <span className="text-xl">📄</span>}
                                <div className="text-xs"><p className="text-foreground/70 font-medium truncate max-w-[120px]">{a.file.name}</p><p className="text-foreground/40">{fmtSize(a.file.size)}</p></div>
                                <button onClick={() => removeFile(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><X size={10} /></button>
                            </div>
                        ))}
                        <p className="w-full text-[10px] text-foreground/25 mt-1">{attachments.length}/{MAX_FILES} files · Type &quot;scan&quot; to OCR</p>
                    </div>
                </div>
            )}

            {/* Input bar — ChatGPT style, centered and floating */}
            <div className="pb-4 pt-2 px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-end gap-2 p-2 rounded-2xl border border-foreground/12 bg-foreground/[0.02] shadow-sm focus-within:border-foreground/20 transition">
                        {/* Attach */}
                        <button onClick={() => fileRef.current?.click()} disabled={loading || attachments.length >= MAX_FILES}
                            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-foreground/[0.06] transition text-foreground/40 hover:text-foreground/60 disabled:opacity-30 shrink-0"
                            title="Attach files">
                            <Paperclip size={18} />
                        </button>
                        <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />

                        {/* Textarea */}
                        <textarea
                            ref={inputRef} value={input} rows={1}
                            onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px"; }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    if (isRecording) { recognitionRef.current?.stop(); recognitionRef.current = null; setIsRecording(false); setVoiceStatus("idle"); }
                                    handleSend();
                                }
                            }}
                            placeholder={voiceStatus === "recording" ? "Speak now… click 🎙 again or Send to finish" : "Message AI Assistant…"}
                            className="flex-1 bg-transparent text-foreground/90 placeholder-foreground/30 text-[15px] resize-none focus:outline-none py-2 px-1 max-h-[150px]"
                            style={{ minHeight: "36px" }}
                            disabled={loading}
                        />

                        {/* Voice */}
                        <button onClick={toggleVoice}
                            className={`flex items-center justify-center w-9 h-9 rounded-xl transition shrink-0 ${voiceStatus === "recording" ? "bg-red-500/20 text-red-400 animate-pulse"
                                : (voiceStatus === "unsupported" || voiceStatus === "error") ? "bg-amber-500/20 text-amber-400"
                                    : "hover:bg-foreground/[0.06] text-foreground/40 hover:text-foreground/60"
                                }`}
                            title={
                                voiceStatus === "recording" ? "Stop recording (click again or press Send)"
                                    : voiceStatus === "unsupported" ? "Voice not supported in this browser (try Chrome)"
                                        : voiceStatus === "error" ? "Mic error — check browser permissions"
                                            : "Voice input — click to start speaking"
                            }>
                            {voiceStatus === "recording" ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>

                        {/* Send — also stops recording */}
                        <button
                            onClick={() => {
                                if (isRecording) { recognitionRef.current?.stop(); recognitionRef.current = null; setIsRecording(false); setVoiceStatus("idle"); }
                                handleSend();
                            }}
                            disabled={(!input.trim() && attachments.length === 0 && !isRecording) || loading}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-foreground/80 hover:bg-foreground/90 text-background transition disabled:opacity-30 shrink-0">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                    {/* Voice status banner */}
                    {voiceStatus !== "idle" && (
                        <div className={`flex items-center justify-center gap-2 text-xs mt-2 ${voiceStatus === "recording" ? "text-red-400" : "text-amber-400"
                            }`}>
                            {voiceStatus === "recording" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />}
                            {voiceStatus === "recording" && "Listening… speak naturally, then click Send"}
                            {voiceStatus === "unsupported" && "⚠️ Voice not supported in this browser (use Chrome/Edge)"}
                            {voiceStatus === "error" && "⚠️ Microphone error — check permissions in browser settings"}
                        </div>
                    )}
                    <p className="text-[10px] text-foreground/20 mt-1.5 text-center">
                        Powered by Gemini · {currentMode.label} · Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
}
