"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
    getSupportRequests,
    createSupportRequest,
    getSupportUsers,
    type SupportRequest,
    type SupportUser,
    type SupportRequestCreate,
} from "@/services/support";

// ============ Helpers ============

function formatTimestamp(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        return isToday ? `Today, ${time}` : `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, ${time}`;
    } catch {
        return iso;
    }
}

function priorityIcon(p: string) {
    const colors: Record<string, string> = { urgent: "#ef4444", high: "#f97316", normal: "#3b82f6", low: "#6b7280" };
    return (
        <span className="inline-flex items-center gap-1">
            <svg width="12" height="14" viewBox="0 0 12 14" fill={colors[p] || "#6b7280"}>
                <path d="M1 1v12M1 1h8l-3 3.5L9 8H1" />
            </svg>
        </span>
    );
}

function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function avatarBg(name: string): string {
    const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 60%, 45%)`;
}

const MODULES = ["Timesheet", "Expense", "Project", "Task", "Team", "Other"];
const PRIORITIES = [
    { value: "urgent", label: "Urgent", color: "#ef4444" },
    { value: "high", label: "High", color: "#f97316" },
    { value: "normal", label: "Normal", color: "#3b82f6" },
    { value: "low", label: "Low", color: "#6b7280" },
];

// ============ Filter Chip ============
function FilterChip({ label, icon, active, onClick }: { label: string; icon?: React.ReactNode; active?: boolean; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition
                ${active ? "bg-blue-600 text-white border-blue-600" : "bg-transparent text-foreground/70 border-foreground/20 hover:border-foreground/40"}`}
        >
            {icon}
            {label}
        </button>
    );
}

// ============ Add Request Modal ============
function AddRequestModal({
    isOpen, onClose, onCreated,
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [recipients, setRecipients] = useState<SupportUser[]>([]);
    const [recipientSearch, setRecipientSearch] = useState("");
    const [recipientResults, setRecipientResults] = useState<SupportUser[]>([]);
    const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [priority, setPriority] = useState("normal");
    const [relatedModule, setRelatedModule] = useState("");
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
    const [showModuleDropdown, setShowModuleDropdown] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Search users
    useEffect(() => {
        if (!recipientSearch.trim()) {
            setRecipientResults([]);
            return;
        }
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            getSupportUsers(recipientSearch)
                .then(setRecipientResults)
                .catch(() => setRecipientResults([]));
        }, 300);
    }, [recipientSearch]);

    // Load initial users when dropdown opens
    useEffect(() => {
        if (showRecipientDropdown && recipientResults.length === 0 && !recipientSearch) {
            getSupportUsers()
                .then(setRecipientResults)
                .catch(() => setRecipientResults([]));
        }
    }, [showRecipientDropdown, recipientSearch, recipientResults.length]);

    const resetForm = () => {
        setRecipients([]);
        setRecipientSearch("");
        setSubject("");
        setMessage("");
        setPriority("normal");
        setRelatedModule("");
    };

    const handleSubmit = async (isDraft: boolean) => {
        if (!message.trim()) return;
        setSubmitting(true);
        try {
            const data: SupportRequestCreate = {
                message: message.trim(),
                subject: subject.trim() || undefined,
                priority,
                related_module: relatedModule || undefined,
                is_draft: isDraft,
                recipient_ids: recipients.map(r => r.id),
            };
            await createSupportRequest(data);
            resetForm();
            onCreated();
            onClose();
        } catch (err) {
            console.error("Failed to create support request:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const addRecipient = (user: SupportUser) => {
        if (!recipients.find(r => r.id === user.id)) {
            setRecipients([...recipients, user]);
        }
        setRecipientSearch("");
        setShowRecipientDropdown(false);
    };

    const removeRecipient = (id: string) => {
        setRecipients(recipients.filter(r => r.id !== id));
    };

    if (!isOpen) return null;

    const selectedPriority = PRIORITIES.find(p => p.value === priority)!;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-[560px] rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl mx-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">New Support Request</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">
                            Create a new support request to ask questions, report issues, or get help from the right team.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-4 mt-5">
                    {/* To - Recipient Picker */}
                    <div className="relative">
                        <div className="flex flex-wrap items-center gap-1.5 border border-foreground/15 rounded-lg px-3 py-2.5 min-h-[44px] bg-foreground/[0.03]">
                            <span className="text-sm text-foreground/40 mr-1">To:</span>
                            {recipients.map(r => (
                                <span key={r.id} className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                    <span className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center text-white font-bold" style={{ background: avatarBg(r.full_name) }}>
                                        {getInitials(r.full_name)}
                                    </span>
                                    {r.full_name}
                                    <button onClick={() => removeRecipient(r.id)} className="ml-0.5 hover:text-red-400 transition">×</button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={recipientSearch}
                                onChange={(e) => { setRecipientSearch(e.target.value); setShowRecipientDropdown(true); }}
                                onFocus={() => setShowRecipientDropdown(true)}
                                placeholder={recipients.length === 0 ? "Search users..." : ""}
                                className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/30"
                            />
                            <button onClick={() => setShowRecipientDropdown(!showRecipientDropdown)} className="text-foreground/30 hover:text-foreground/60 transition">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
                            </button>
                        </div>
                        {showRecipientDropdown && recipientResults.length > 0 && (
                            <div className="absolute right-0 top-full mt-1 w-56 max-h-48 overflow-y-auto rounded-lg border border-foreground/10 bg-background shadow-xl z-10">
                                <div className="p-2">
                                    <div className="relative mb-2">
                                        <svg className="absolute left-2 top-2 w-3.5 h-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                        <input
                                            type="text"
                                            value={recipientSearch}
                                            onChange={(e) => setRecipientSearch(e.target.value)}
                                            placeholder="Search"
                                            className="w-full bg-foreground/5 border border-foreground/10 rounded-md pl-7 pr-2 py-1.5 text-xs text-foreground outline-none placeholder:text-foreground/30"
                                        />
                                    </div>
                                    {recipientResults.filter(u => !recipients.find(r => r.id === u.id)).map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => addRecipient(user)}
                                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-foreground/80 hover:bg-foreground/10 transition"
                                        >
                                            <span className="w-6 h-6 rounded-full text-[10px] flex items-center justify-center text-white font-bold shrink-0" style={{ background: avatarBg(user.full_name) }}>
                                                {getInitials(user.full_name)}
                                            </span>
                                            <span className="flex-1 text-left truncate">{user.full_name}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground/30"><path d="M12 5v14M5 12h14" /></svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Subject */}
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject:"
                        className="w-full border border-foreground/15 rounded-lg px-3 py-2.5 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-blue-500/40 transition"
                    />

                    {/* Message */}
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter your issue or request here...."
                        rows={5}
                        className="w-full border border-foreground/15 rounded-lg px-3 py-2.5 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/40 resize-none focus:border-blue-500/40 transition"
                    />

                    {/* Priority & Related Module */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Priority */}
                        <div className="relative">
                            <label className="text-xs text-foreground/50 mb-1 block">Priority (Optional)</label>
                            <button
                                onClick={() => { setShowPriorityDropdown(!showPriorityDropdown); setShowModuleDropdown(false); }}
                                className="w-full flex items-center justify-between border border-foreground/15 rounded-lg px-3 py-2.5 bg-foreground/[0.03] text-sm text-foreground hover:border-foreground/30 transition"
                            >
                                <span className="flex items-center gap-2">
                                    {priorityIcon(priority)}
                                    {selectedPriority.label}
                                </span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>
                            </button>
                            {showPriorityDropdown && (
                                <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-foreground/10 bg-background shadow-xl z-10 py-1">
                                    {PRIORITIES.map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => { setPriority(p.value); setShowPriorityDropdown(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/10 transition"
                                        >
                                            {priorityIcon(p.value)}
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Related Module */}
                        <div className="relative">
                            <label className="text-xs text-foreground/50 mb-1 block">Related Module (Optional)</label>
                            <button
                                onClick={() => { setShowModuleDropdown(!showModuleDropdown); setShowPriorityDropdown(false); }}
                                className="w-full flex items-center justify-between border border-foreground/15 rounded-lg px-3 py-2.5 bg-foreground/[0.03] text-sm text-foreground hover:border-foreground/30 transition"
                            >
                                <span>{relatedModule || "Select Related Module"}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>
                            </button>
                            {showModuleDropdown && (
                                <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-foreground/10 bg-background shadow-xl z-10 py-1">
                                    {MODULES.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => { setRelatedModule(m); setShowModuleDropdown(false); }}
                                            className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/10 transition"
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="flex items-center gap-2 border border-foreground/15 rounded-lg px-3 py-2.5 bg-foreground/[0.03]">
                        <span className="text-sm text-foreground/40 flex-1">Upload a File (.jpg, .png, .jpeg)</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground/40">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={submitting || !message.trim()}
                            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition disabled:opacity-40"
                        >
                            Save as Draft
                        </button>
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting || !message.trim()}
                            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition flex items-center gap-2 disabled:opacity-40"
                        >
                            Send
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============ Skeleton ============
function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-foreground/10 rounded ${className || ""}`} />;
}

function SupportSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
            <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-24 rounded-full" />)}
            </div>
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
    );
}

// ============ Main Page ============

export default function SupportPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<SupportRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filters
    const [filterPriority, setFilterPriority] = useState<string | null>(null);
    const [showPriorityFilter, setShowPriorityFilter] = useState(false);
    const [filterSource, setFilterSource] = useState<string | null>(null);
    const [showSourceFilter, setShowSourceFilter] = useState(false);

    const fetchRequests = useCallback(() => {
        const token = getToken();
        if (!token) {
            router.push("/login?redirect=/support");
            return;
        }

        const params: Record<string, string | number | boolean | undefined> = {};
        if (filterPriority) params.priority = filterPriority;

        getSupportRequests(params)
            .then((data) => {
                setRequests(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Support fetch error:", err);
                if (err?.status === 401 || err?.message?.includes("Not authenticated")) {
                    router.push("/login?redirect=/support");
                    return;
                }
                setError("Failed to load support requests");
                setLoading(false);
            });
    }, [router, filterPriority]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredRequests.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRequests.map(r => r.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };

    // Client-side filtering
    const filteredRequests = requests.filter(r => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchSubject = r.subject?.toLowerCase().includes(term);
            const matchMessage = r.message.toLowerCase().includes(term);
            if (!matchSubject && !matchMessage) return false;
        }
        if (filterSource && r.user?.full_name !== filterSource) return false;
        return true;
    });

    const uniqueSources = Array.from(new Set(requests.map(r => r.user?.full_name).filter(Boolean))) as string[];

    if (loading) return <SupportSkeleton />;

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-foreground/60 text-sm">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Support</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
                    Add Request
                </button>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Source filter */}
                    <div className="relative">
                        <FilterChip
                            label="Source"
                            active={!!filterSource}
                            onClick={() => { setShowSourceFilter(!showSourceFilter); setShowPriorityFilter(false); }}
                            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>}
                        />
                        {showSourceFilter && (
                            <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-foreground/10 bg-background shadow-xl z-20 py-1">
                                <button onClick={() => { setFilterSource(null); setShowSourceFilter(false); }} className="w-full text-left px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/10 transition">All Sources</button>
                                {uniqueSources.map(s => (
                                    <button key={s} onClick={() => { setFilterSource(s); setShowSourceFilter(false); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-foreground/10 transition ${filterSource === s ? "text-blue-400" : "text-foreground/80"}`}>{s}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Priority filter */}
                    <div className="relative">
                        <FilterChip
                            label="Priority"
                            active={!!filterPriority}
                            onClick={() => { setShowPriorityFilter(!showPriorityFilter); setShowSourceFilter(false); }}
                            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>}
                        />
                        {showPriorityFilter && (
                            <div className="absolute left-0 top-full mt-1 w-40 rounded-lg border border-foreground/10 bg-background shadow-xl z-20 py-1">
                                <button onClick={() => { setFilterPriority(null); setShowPriorityFilter(false); }} className="w-full text-left px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/10 transition">All Priorities</button>
                                {PRIORITIES.map(p => (
                                    <button key={p.value} onClick={() => { setFilterPriority(p.value); setShowPriorityFilter(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground/80 hover:bg-foreground/10 transition">
                                        {priorityIcon(p.value)} {p.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <FilterChip label="Read Status" icon={<span className="w-2 h-2 rounded-full bg-green-400" />} />
                    <FilterChip label="Date" icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>} />
                </div>

                {/* Search */}
                <div className="flex items-center gap-2">
                    {searchOpen && (
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search requests..."
                            autoFocus
                            className="w-52 border border-foreground/15 rounded-lg px-3 py-1.5 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-blue-500/40 transition"
                        />
                    )}
                    <button onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchTerm(""); }} className="text-foreground/50 hover:text-foreground transition flex items-center gap-1 text-xs">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[40px_1fr_150px_160px] items-center px-4 py-3 border-b border-foreground/10 text-xs font-medium text-foreground/50 uppercase tracking-wider">
                    <div>
                        <input
                            type="checkbox"
                            checked={filteredRequests.length > 0 && selectedIds.size === filteredRequests.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-foreground/30 accent-blue-600"
                        />
                    </div>
                    <div>Activity</div>
                    <div>Source</div>
                    <div>Date</div>
                </div>

                {/* Rows */}
                {filteredRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-foreground/20 mb-4">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p className="text-sm font-semibold text-foreground/70">No support requests yet</p>
                        <p className="text-xs text-foreground/40 mt-1">Your support requests and conversations will appear here once you create or receive them.</p>
                    </div>
                ) : (
                    filteredRequests.map((req) => (
                        <div
                            key={req.id}
                            className="grid grid-cols-[40px_1fr_150px_160px] items-center px-4 py-3.5 border-b border-foreground/5 hover:bg-foreground/[0.03] transition cursor-pointer"
                        >
                            <div>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(req.id)}
                                    onChange={() => toggleSelect(req.id)}
                                    className="w-4 h-4 rounded border-foreground/30 accent-blue-600"
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground/90">{req.subject || "Support request"}</span>
                                    {priorityIcon(req.priority)}
                                </div>
                                <p className="text-xs text-foreground/50 mt-0.5 line-clamp-1">
                                    {req.message}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {req.user && (
                                    <span
                                        className="w-7 h-7 rounded-full text-[10px] flex items-center justify-center text-white font-bold shrink-0"
                                        style={{ background: avatarBg(req.user.full_name) }}
                                    >
                                        {getInitials(req.user.full_name)}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-foreground/60">
                                {formatTimestamp(req.created_at)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            <AddRequestModal isOpen={showModal} onClose={() => setShowModal(false)} onCreated={fetchRequests} />
        </div>
    );
}
