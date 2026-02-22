"use client";

import { useState, useEffect, useRef } from "react";
import { createSupportRequest, getSupportUsers, type SupportUser, type SupportRequestCreate } from "@/services/support";

// ============ Helpers ============

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

// ============ Add Request Modal ============
export function AddRequestModal({
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
                            <div className="absolute right-0 top-full mt-1 w-56 max-h-48 overflow-y-auto rounded-lg border border-foreground/10 bg-background shadow-xl z-20">
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
                                <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-foreground/10 bg-background shadow-xl z-20 py-1">
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
                                <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-foreground/10 bg-background shadow-xl z-20 py-1">
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
