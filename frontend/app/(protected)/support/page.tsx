"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
    getSupportRequests,
    createSupportRequest,
    getSupportUsers,
    deleteSupportRequest,
    updateSupportRequest,
    type SupportRequest,
    type SupportUser,
    type SupportRequestCreate,
} from "@/services/support";
import { AddRequestModal } from "@/components/SupportModals";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ============ Confirm Dialog ============
function ConfirmDialog({ message, subtext, onConfirm, onCancel, danger = true }: {
    message: string;
    subtext?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
            <div className="w-full max-w-[360px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                        {danger ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                        ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                            </svg>
                        )}
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">{message}</h3>
                    {subtext && <p className="text-xs text-foreground/50 mb-5">{subtext}</p>}
                    {!subtext && <div className="mb-5" />}
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2.5 text-sm rounded-xl font-semibold text-white transition ${
                                danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
                            }`}
                        >
                            {danger ? 'Delete' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
    const [viewingRequest, setViewingRequest] = useState<SupportRequest | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ message: string; subtext?: string; onConfirm: () => void } | null>(null);

    const showConfirm = (message: string, subtext: string, onConfirm: () => void) => {
        setConfirmDialog({ message, subtext, onConfirm });
    };

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

            {/* How It Works */}
            <HowItWorks
                pageKey="support"
                color="green"
                description="The Support page lets you submit and track help requests. Use it to report issues, ask questions, or flag blockers to your team."
                bullets={[
                    "Click Add Request to open a support ticket — set subject, priority, and module.",
                    "Filter by Source (requester) or Priority to quickly find relevant tickets.",
                    "Use the Search button to find requests by keyword in subject or message.",
                    "Select multiple requests with checkboxes for bulk actions.",
                ]}
            />

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
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => showConfirm(
                                `Delete ${selectedIds.size} request(s)?`,
                                'This action cannot be undone.',
                                async () => {
                                    setConfirmDialog(null);
                                    await Promise.all(Array.from(selectedIds).map(id => deleteSupportRequest(id))).catch(console.error);
                                    setSelectedIds(new Set());
                                    fetchRequests();
                                }
                            )}
                            className="text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-xs font-medium transition ml-2 flex items-center gap-1"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[40px_1fr_150px_160px_60px] items-center px-4 py-3 border-b border-foreground/10 text-xs font-medium text-foreground/50 uppercase tracking-wider">
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
                    <div className="text-right">Action</div>
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
                            className="grid grid-cols-[40px_1fr_150px_160px_60px] items-center px-4 py-3.5 border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.03] transition cursor-pointer"
                            onClick={() => setViewingRequest(req)}
                        >
                            <div onClick={(e) => e.stopPropagation()}>
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
                                {req.user ? (
                                    <span
                                        className="w-7 h-7 rounded-full text-[10px] flex items-center justify-center text-white font-bold shrink-0"
                                        style={{ background: avatarBg(req.user.full_name) }}
                                        title={req.user.full_name}
                                    >
                                        {getInitials(req.user.full_name)}
                                    </span>
                                ) : (
                                    <span className="text-xs text-foreground/40">Unknown</span>
                                )}
                            </div>
                            <div className="text-xs text-foreground/60">
                                {formatTimestamp(req.created_at)}
                            </div>
                            <div className="flex items-center justify-end gap-2 pr-2">
                                <button className="text-foreground/40 hover:text-red-500 transition p-1" onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    showConfirm(
                                        'Delete this request?',
                                        'This ticket will be permanently removed.',
                                        async () => {
                                            setConfirmDialog(null);
                                            await deleteSupportRequest(req.id).catch(console.error);
                                            const next = new Set(selectedIds);
                                            next.delete(req.id);
                                            setSelectedIds(next);
                                            fetchRequests();
                                        }
                                    );
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Modal */}
            <AddRequestModal isOpen={showModal} onClose={() => setShowModal(false)} onCreated={fetchRequests} />
            
            {/* View/Edit Modal */}
            {viewingRequest && (
                <ViewRequestModal 
                    request={viewingRequest} 
                    onClose={() => setViewingRequest(null)} 
                    onUpdated={fetchRequests} 
                    onDeleted={() => { 
                        const next = new Set(selectedIds);
                        next.delete(viewingRequest.id);
                        setSelectedIds(next);
                        setViewingRequest(null); 
                        fetchRequests(); 
                    }}
                    onRequestConfirm={showConfirm}
                />
            )}

            {/* Confirm Dialog */}
            {confirmDialog && (
                <ConfirmDialog
                    message={confirmDialog.message}
                    subtext={confirmDialog.subtext}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
        </div>
    );
}

// ─── View/Edit Modal ────────────────────────────────────────────────────────
function ViewRequestModal({ request, onClose, onUpdated, onDeleted, onRequestConfirm }: { 
    request: SupportRequest;
    onClose: () => void;
    onUpdated: () => void;
    onDeleted: () => void;
    onRequestConfirm: (message: string, subtext: string, onConfirm: () => void) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [subject, setSubject] = useState(request.subject || "");
    const [message, setMessage] = useState(request.message || "");
    const [priority, setPriority] = useState(request.priority);
    const [status, setStatus] = useState(request.status);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            await updateSupportRequest(request.id, { subject, message, priority, status });
            setEditing(false);
            onUpdated();
        } catch (e) {
            console.error(e);
            setSaveError('Failed to update request. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        onRequestConfirm(
            'Delete this support request?',
            'This ticket will be permanently removed and cannot be recovered.',
            async () => {
                try {
                    await deleteSupportRequest(request.id);
                    onDeleted();
                } catch (e) {
                    console.error(e);
                }
            }
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-[600px] rounded-2xl border border-foreground/10 bg-background shadow-xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-foreground/10 shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            {editing ? (
                                <input value={subject} onChange={e => setSubject(e.target.value)} className="font-bold text-lg bg-foreground/5 border border-foreground/10 rounded px-2" />
                            ) : (
                                <h2 className="text-xl font-bold text-foreground">{request.subject || "Support Request"}</h2>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                status === "open" ? "bg-blue-500/10 text-blue-500" :
                                status === "in_progress" ? "bg-orange-500/10 text-orange-500" :
                                status === "resolved" ? "bg-green-500/10 text-green-500" : "bg-foreground/10 text-foreground/50"
                            }`}>
                                {status.replace("_", " ")}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-foreground/50">
                            {request.user && (
                                <span className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full text-[8px] flex items-center justify-center text-white" style={{ background: avatarBg(request.user.full_name) }}>
                                        {getInitials(request.user.full_name)}
                                    </span>
                                    {request.user.full_name}
                                </span>
                            )}
                            <span>•</span>
                            <span>{formatTimestamp(request.created_at)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md text-foreground/40 hover:bg-foreground/10 transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Details Row */}
                    <div className="flex gap-6 border-b border-foreground/10 pb-6">
                        <div>
                            <p className="text-[10px] font-semibold uppercase text-foreground/40 tracking-wider mb-2">Priority</p>
                            {editing ? (
                                <select value={priority} onChange={e => setPriority(e.target.value as any)} className="bg-foreground/5 border border-foreground/10 rounded p-1 text-xs">
                                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            ) : (
                                <span className="flex items-center gap-1.5 text-sm">{priorityIcon(priority)} <span className="capitalize">{priority}</span></span>
                            )}
                        </div>
                        {editing && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase text-foreground/40 tracking-wider mb-2">Status</p>
                                <select value={status} onChange={e => setStatus(e.target.value as any)} className="bg-foreground/5 border border-foreground/10 rounded p-1 text-xs">
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <p className="text-[10px] font-semibold uppercase text-foreground/40 tracking-wider mb-2">Module</p>
                            <span className="text-sm text-foreground/70">{request.related_module || "Untracked"}</span>
                        </div>
                    </div>

                    {/* Message section */}
                    <div>
                        <p className="text-[10px] font-semibold uppercase text-foreground/40 tracking-wider mb-2">Description</p>
                        {editing ? (
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                rows={6}
                                className="w-full bg-foreground/5 border border-foreground/10 rounded-lg p-3 text-sm resize-none"
                            />
                        ) : (
                            <div className="bg-foreground/[0.03] border border-foreground/10 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">
                                {request.message}
                            </div>
                        )}
                    </div>
                </div>

                    {/* Save Error */}
                    {saveError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-500">
                            {saveError}
                        </div>
                    )}
                {/* Footer Controls */}
                <div className="flex items-center justify-between p-4 px-6 border-t border-foreground/10 bg-foreground/[0.02] shrink-0">
                    {!editing ? (
                        <>
                            <button onClick={handleDelete} className="text-red-500 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5">
                                Delete Ticket
                            </button>
                            <div className="flex gap-2">
                                <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/60 transition">Close</button>
                                <button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
                                    Edit Ticket
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div></div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-foreground/60 transition" disabled={saving}>Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
