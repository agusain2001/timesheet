"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
    getClients,
    createClient,
    updateClient,
    deleteClient,
    getClientProjects,
    bulkDeleteClients,
    exportClients,
} from "@/services/clients";
import type { Client, ClientCreate, ClientUpdate, ClientProject } from "@/types/api";
import { AddClientModal, EditClientModal } from "@/components/ClientModals";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ─── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function avatarBg(name: string) {
    const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 60%, 45%)`;
}
function shortId(id: string) {
    return id.slice(0, 8).toUpperCase();
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
        in_progress: "bg-blue-500/15 text-blue-500 border-blue-500/20",
        on_hold: "bg-amber-500/15 text-amber-500 border-amber-500/20",
        completed: "bg-purple-500/15 text-purple-500 border-purple-500/20",
        draft: "bg-foreground/10 text-foreground/50 border-foreground/10",
        archived: "bg-foreground/10 text-foreground/40 border-foreground/10",
    };
    const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] ?? map.draft}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {label}
        </span>
    );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }: { message: string; type: "success" | "error"; onDone: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, [onDone]);
    return (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all
            ${type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {type === "success" ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
            ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            )}
            {message}
        </div>
    );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton() {
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="h-8 w-44 bg-foreground/10 rounded animate-pulse" />
                <div className="h-9 w-32 bg-foreground/10 rounded-lg animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <div className="h-7 w-32 bg-foreground/10 rounded-full animate-pulse" />
                    <div className="h-7 w-32 bg-foreground/10 rounded-full animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-foreground/10 rounded animate-pulse" />
            </div>
            <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="h-10 bg-foreground/5 border-b border-foreground/10" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 border-b border-foreground/5 px-4 flex items-center gap-4">
                        <div className="w-4 h-4 bg-foreground/10 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-foreground/10 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-foreground/10 rounded animate-pulse ml-4" />
                        <div className="h-4 w-20 bg-foreground/10 rounded animate-pulse ml-4" />
                        <div className="h-4 w-24 bg-foreground/10 rounded animate-pulse ml-4" />
                        <div className="h-4 w-24 bg-foreground/10 rounded animate-pulse ml-4" />
                    </div>
                ))}
            </div>
        </div>
    );
}



// ─── View Details Panel ───────────────────────────────────────────────────────
function ViewDetailsPanel({ client, onClose, onEdit }: { client: Client; onClose: () => void; onEdit: () => void }) {
    let contacts: Record<string, string> = {};
    try { if (client.contacts) contacts = JSON.parse(client.contacts); } catch { /* ignore */ }

    const row = (label: string, value?: string) => value ? (
        <div className="flex justify-between py-2 border-b border-foreground/5 last:border-0">
            <span className="text-xs text-foreground/50">{label}</span>
            <span className="text-xs text-foreground/90 font-medium text-right max-w-[55%]">{value}</span>
        </div>
    ) : null;

    return (
        <div className="fixed inset-0 z-50 flex" onClick={onClose}>
            <div className="flex-1" />
            <div className="w-full max-w-[400px] h-full bg-background border-l border-foreground/10 shadow-2xl overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/10 sticky top-0 bg-background z-10">
                    <button onClick={onClose} className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                        Go Back
                    </button>
                    <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-foreground/20 text-foreground/70 hover:bg-foreground/5 transition">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        Edit
                    </button>
                </div>

                {/* Avatar + Name */}
                <div className="flex flex-col items-center py-8 border-b border-foreground/10">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3" style={{ background: avatarBg(client.name) }}>
                        {getInitials(client.name)}
                    </div>
                    <h2 className="text-lg font-bold text-foreground">{client.name}</h2>
                    <p className="text-xs text-foreground/50 mt-1">
                        Alias: {client.alias || "—"} &nbsp;|&nbsp; Id: {shortId(client.id)}
                    </p>
                </div>

                {/* Details */}
                <div className="px-5 py-4 space-y-5">
                    <div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Business Details</p>
                        {row("Region", client.region)}
                        {row("Company Size", contacts.company_size)}
                        {row("Business Sector", client.business_sector)}
                        {row("Website", contacts.website)}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Contact Information</p>
                        {row("Contact Person Name", contacts.contact_person_name)}
                        {row("Contact Person Role", contacts.contact_person_role)}
                        {row("Primary Phone Number", contacts.primary_phone || client.contact_numbers?.[0])}
                        {row("Secondary Phone Number", contacts.secondary_phone || client.contact_numbers?.[1])}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Financial &amp; Billing Information</p>
                        {row("Preferred Currency", contacts.preferred_currency)}
                        {row("Billing Type", contacts.billing_type)}
                    </div>
                    {client.notes && (
                        <div>
                            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Notes</p>
                            <p className="text-xs text-foreground/70 leading-relaxed">{client.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Related Projects Modal ───────────────────────────────────────────────────
function RelatedProjectsModal({ client, onClose }: { client: Client; onClose: () => void }) {
    const [projects, setProjects] = useState<ClientProject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getClientProjects(client.id)
            .then(setProjects)
            .catch(() => setProjects([]))
            .finally(() => setLoading(false));
    }, [client.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[600px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 pt-5 pb-3">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Related Projects</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">All projects associated with this client are listed below for quick access and management.</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="px-6 pb-5">
                    <div className="rounded-xl border border-foreground/10 overflow-hidden">
                        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] px-4 py-2.5 border-b border-foreground/10 text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">
                            <div>Project Name</div><div>Managed By</div><div>Business Sector</div><div>Status</div>
                        </div>
                        {loading ? (
                            <div className="py-10 text-center text-xs text-foreground/40">Loading...</div>
                        ) : projects.length === 0 ? (
                            <div className="py-10 text-center text-xs text-foreground/40">No projects linked to this client</div>
                        ) : (
                            projects.map((p) => (
                                <div key={p.id} className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center px-4 py-3 border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.03] transition">
                                    <div className="text-xs text-foreground/90 font-medium">{p.name}</div>
                                    <div className="text-xs text-foreground/60">{p.managed_by || "—"}</div>
                                    <div className="text-xs text-foreground/60">{p.business_sector || "—"}</div>
                                    <div><StatusBadge status={p.status} /></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between px-6 pb-5">
                    <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">← Go Back</button>
                    <button className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                        Add Project
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ client, projectCount, onClose, onDeleted }: { client: Client; projectCount: number; onClose: () => void; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteClient(client.id);
            onDeleted(); onClose();
        } catch {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[380px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden p-6 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-red-500">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">Remove Client</h2>
                <p className="text-xs text-foreground/50 mb-4">
                    Deleting this client will remove all their linked data. All related projects will not be system-connected to this client anymore.
                </p>
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 text-left mb-5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-foreground/50">Client Name</span>
                        <span className="text-foreground/90 font-medium">{client.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-foreground/50">Linked Projects</span>
                        <span className="text-foreground/90 font-medium">{projectCount}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition">
                        {deleting ? "Removing..." : "🗑 Remove"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Bulk Selection Bar ──────────────────────────────────────────────────────
function BulkSelectionBar({ count, onExport, onDelete, onClear }: {
    count: number; onExport: () => void; onDelete: () => void; onClear: () => void;
}) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">{count}</span>
                <span className="text-xs font-medium text-foreground/80">
                    {count} client{count > 1 ? "s" : ""} selected
                </span>
                <button onClick={onClear} className="text-[10px] text-foreground/40 hover:text-foreground/70 underline transition">Clear</button>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onExport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-foreground/20 text-foreground/70 hover:bg-foreground/5 hover:border-foreground/40 transition">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Export as CSV
                </button>
                <button onClick={onDelete}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/90 text-white hover:bg-red-500 transition">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                    Delete Selected
                </button>
            </div>
        </div>
    );
}

// ─── Export Modal ─────────────────────────────────────────────────────────────
function ExportModal({ clients, onClose, onExported }: { clients: Client[]; onClose: () => void; onExported: () => void }) {
    const [format, setFormat] = useState<"csv" | "excel">("csv");
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        setExporting(true); setError(null);
        try {
            await exportClients(clients.map((c) => c.id), format);
            onExported(); onClose();
        } catch {
            setError("Export failed. Please try again.");
            setExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[420px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-foreground/10">
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-blue-500">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </div>
                        <h2 className="text-base font-bold text-foreground">Export Selected Clients</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">
                            Export the selected clients from the list below on your system in your preferred format.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Client list preview */}
                <div className="px-6 py-4 space-y-2">
                    <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Selected Clients ({clients.length})</p>
                    <div className="rounded-xl border border-foreground/10 overflow-hidden max-h-36 overflow-y-auto">
                        {clients.map((c) => (
                            <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 border-b border-foreground/5 last:border-0">
                                <span className="w-6 h-6 rounded-md text-[9px] flex items-center justify-center text-white font-bold shrink-0"
                                    style={{ background: `hsl(${c.name.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360}, 60%, 45%)` }}>
                                    {c.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                </span>
                                <span className="text-xs text-foreground/80 font-medium">{c.name}</span>
                                <span className="text-[10px] text-foreground/40 ml-auto font-mono">{c.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                        ))}
                    </div>

                    {/* Format selector */}
                    <div className="mt-4">
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Export Format</p>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value as "csv" | "excel")}
                            className="w-full border border-foreground/15 rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none focus:border-blue-500/50 transition cursor-pointer">
                            <option value="csv">CSV (.csv) — Recommended for Excel, Google Sheets</option>
                            <option value="excel">Excel (.csv) — Compatible format</option>
                        </select>
                        <p className="text-[10px] text-foreground/40 mt-1.5">
                            This is recommended for the best results. It is used by most spreadsheet applications.
                        </p>
                    </div>
                </div>

                {error && <p className="px-6 pb-2 text-xs text-red-400">{error}</p>}

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Cancel</button>
                    <button onClick={handleExport} disabled={exporting}
                        className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-1.5">
                        {exporting ? (
                            <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Exporting...</>
                        ) : (
                            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Export</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Bulk Delete Modal ────────────────────────────────────────────────────────
interface BulkClientInfo { client: Client; projectCount: number; }

function BulkDeleteModal({ clients, onClose, onDeleted }: { clients: Client[]; onClose: () => void; onDeleted: (count: number) => void }) {
    const [step, setStep] = useState<"list" | "confirm">("list");
    const [clientInfos, setClientInfos] = useState<BulkClientInfo[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        Promise.all(
            clients.map(async (c) => {
                try {
                    const projs = await getClientProjects(c.id);
                    return { client: c, projectCount: projs.length };
                } catch {
                    return { client: c, projectCount: 0 };
                }
            })
        ).then((infos) => {
            setClientInfos(infos);
            setLoadingProjects(false);
        });
    }, [clients]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const result = await bulkDeleteClients(clients.map((c) => c.id));
            onDeleted(result.deleted);
            onClose();
        } catch {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[520px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {step === "list" ? (
                    <>
                        {/* Step 1: Show clients + their linked projects */}
                        <div className="flex items-start justify-between px-6 pt-5 pb-3">
                            <div>
                                <h2 className="text-base font-bold text-foreground">Remove Clients</h2>
                                <p className="text-xs text-foreground/50 mt-0.5">
                                    Removing these clients will unlink all their projects from the system. Review the list below before proceeding.
                                </p>
                            </div>
                            <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="px-6 pb-4">
                            <div className="rounded-xl border border-foreground/10 overflow-hidden max-h-72 overflow-y-auto">
                                <div className="grid grid-cols-[1fr_120px_120px] px-4 py-2.5 border-b border-foreground/10 text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">
                                    <div>Client Name</div><div>Client ID</div><div>Linked Projects</div>
                                </div>
                                {loadingProjects ? (
                                    <div className="py-8 text-center text-xs text-foreground/40">Loading project data...</div>
                                ) : (
                                    clientInfos.map(({ client: c, projectCount }) => (
                                        <div key={c.id} className="grid grid-cols-[1fr_120px_120px] items-center px-4 py-3 border-b border-foreground/5 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-md text-[9px] flex items-center justify-center text-white font-bold shrink-0"
                                                    style={{ background: `hsl(${c.name.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360}, 60%, 45%)` }}>
                                                    {c.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                                </span>
                                                <span className="text-xs text-foreground/90 font-medium">{c.name}</span>
                                            </div>
                                            <div className="text-xs text-foreground/60 font-mono">{c.id.slice(0, 8).toUpperCase()}</div>
                                            <div className="text-xs text-foreground/60">
                                                {projectCount > 0 ? (
                                                    <span className="text-amber-500 font-medium">{projectCount} project{projectCount > 1 ? "s" : ""}</span>
                                                ) : "No projects"}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {!loadingProjects && clientInfos.some((i) => i.projectCount > 0) && (
                                <p className="text-[10px] text-amber-500/80 mt-2 flex items-center gap-1">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                    Some clients have linked projects that will be unlinked from the system.
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between px-6 py-4 border-t border-foreground/10">
                            <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Cancel</button>
                            <button onClick={() => setStep("confirm")} disabled={loadingProjects}
                                className="px-4 py-2 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition">
                                🗑 Remove {clients.length} Client{clients.length > 1 ? "s" : ""}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Step 2: Final confirmation */}
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-red-500">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <h2 className="text-base font-bold text-foreground mb-1">Confirm Removal</h2>
                            <p className="text-xs text-foreground/50 mb-5">
                                You are about to permanently delete <strong className="text-foreground">{clients.length} client{clients.length > 1 ? "s" : ""}</strong>.
                                This action cannot be undone. All linked project connections will be removed.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setStep("list")} className="flex-1 px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">← Go Back</button>
                                <button onClick={handleDelete} disabled={deleting}
                                    className="flex-1 px-4 py-2 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition">
                                    {deleting ? "Removing..." : "Confirm & Remove"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Row Menu ─────────────────────────────────────────────────────────────────
function RowMenu({ onViewDetails, onEdit, onProjects, onDelete }: {
    onViewDetails: () => void; onEdit: () => void; onProjects: () => void; onDelete: () => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const item = (label: string, icon: React.ReactNode, action: () => void, danger = false) => (
        <button onClick={() => { setOpen(false); action(); }}
            className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs transition hover:bg-foreground/10 ${danger ? "text-red-400 hover:text-red-300" : "text-foreground/80 hover:text-foreground"}`}>
            {icon}{label}
        </button>
    );

    return (
        <div ref={ref} className="relative">
            <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="w-7 h-7 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-foreground/10 bg-background shadow-2xl z-50 py-1 overflow-hidden">
                    {item("View Details", <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>, onViewDetails)}
                    {item("Edit Client", <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>, onEdit)}
                    {item("Related Project", <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>, onProjects)}
                    <div className="border-t border-foreground/10 my-1" />
                    {item("Delete 🗑", <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>, onDelete, true)}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortRegion, setSortRegion] = useState(false);
    const [sortSector, setSortSector] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    // Modals
    const [addModal, setAddModal] = useState(false);
    const [editClient, setEditClient] = useState<Client | null>(null);
    const [viewClient, setViewClient] = useState<Client | null>(null);
    const [projectsClient, setProjectsClient] = useState<Client | null>(null);
    const [deleteClient_, setDeleteClient] = useState<Client | null>(null);
    const [deleteProjectCount, setDeleteProjectCount] = useState(0);

    // Bulk action modals
    const [exportModal, setExportModal] = useState(false);
    const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

    const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

    const fetchClients = useCallback(() => {
        const token = getToken();
        if (!token) { router.push("/login?redirect=/clients"); return; }
        setLoading(true);
        getClients({ limit: 200 })
            .then((data) => { setClients(data); setLoading(false); })
            .catch((err) => {
                if (err?.status === 401 || err?.message?.includes("Not authenticated")) {
                    router.push("/login?redirect=/clients"); return;
                }
                setError("Failed to load clients");
                setLoading(false);
            });
    }, [router]);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    const handleDeleteOpen = async (client: Client) => {
        setDeleteClient(client);
        try {
            const projs = await getClientProjects(client.id);
            setDeleteProjectCount(projs.length);
        } catch { setDeleteProjectCount(0); }
    };

    // Filter + sort
    let filtered = clients.filter((c) => {
        if (!searchTerm) return true;
        return c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.alias ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.region ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    });
    if (sortRegion) filtered = [...filtered].sort((a, b) => (a.region ?? "").localeCompare(b.region ?? ""));
    if (sortSector) filtered = [...filtered].sort((a, b) => (a.business_sector ?? "").localeCompare(b.business_sector ?? ""));

    const toggleAll = () => {
        if (selectedIds.size === filtered.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filtered.map((c) => c.id)));
    };
    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };

    if (loading) return <Skeleton />;
    if (error) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <p className="text-foreground/60 text-sm">{error}</p>
                <button onClick={fetchClients} className="mt-4 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">Retry</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-5 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Manage Clients</h1>
                <button onClick={() => setAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 active:scale-95 transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                    Add Client
                </button>
            </div>

            {/* How It Works */}
            <HowItWorks
                pageKey="clients"
                color="green"
                description="Clients lets you manage your company's client accounts, including contact info, billing details, and linked projects."
                bullets={[
                    "Click Add Client to register a new client with contact details, region, and business sector.",
                    "Click any row to open the client's detail panel.",
                    "Click the ⋯ menu to edit, view related projects, or delete a client.",
                    "Select multiple clients with checkboxes to bulk export them as CSV.",
                ]}
            />

            {/* Bulk Selection Bar — shown when 1+ selected */}
            {selectedIds.size > 0 && (
                <BulkSelectionBar
                    count={selectedIds.size}
                    onExport={() => setExportModal(true)}
                    onDelete={() => setBulkDeleteModal(true)}
                    onClear={() => setSelectedIds(new Set())}
                />
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Sort Region */}
                    <button onClick={() => { setSortRegion(!sortRegion); if (!sortRegion) setSortSector(false); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${sortRegion ? "bg-blue-600 text-white border-blue-600" : "bg-transparent text-foreground/70 border-foreground/20 hover:border-foreground/40"}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                        Sort By Region
                        {sortRegion && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m6 9 6 6 6-6" /></svg>}
                    </button>
                    {/* Sort Sector */}
                    <button onClick={() => { setSortSector(!sortSector); if (!sortSector) setSortRegion(false); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${sortSector ? "bg-blue-600 text-white border-blue-600" : "bg-transparent text-foreground/70 border-foreground/20 hover:border-foreground/40"}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                        Sort By Sector
                        {sortSector && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m6 9 6 6 6-6" /></svg>}
                    </button>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2">
                    {searchOpen && (
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search clients..." autoFocus
                            className="w-52 border border-foreground/15 rounded-lg px-3 py-1.5 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-blue-500/40 transition" />
                    )}
                    <button onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchTerm(""); }}
                        className="text-foreground/50 hover:text-foreground transition flex items-center gap-1 text-xs">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[40px_1fr_160px_160px_160px_160px_48px] items-center px-4 py-3 border-b border-foreground/10 text-xs font-semibold text-foreground/40 uppercase tracking-wider">
                    <div>
                        <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleAll}
                            className="w-4 h-4 rounded border-foreground/30 accent-blue-600" />
                    </div>
                    <div>Client Name</div>
                    <div>Client ID</div>
                    <div>Client Alias</div>
                    <div>Region</div>
                    <div>Business Sector</div>
                    <div />
                </div>

                {/* Empty State */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="text-foreground/15 mb-4">
                            <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                        </svg>
                        <p className="text-sm font-semibold text-foreground/60">No clients yet!</p>
                        <p className="text-xs text-foreground/35 mt-1.5 max-w-xs">
                            Create, update, and manage clients here. All client-related changes are automatically communicated to managers.
                        </p>
                        <button onClick={() => setAddModal(true)}
                            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                            Add Client
                        </button>
                    </div>
                ) : (
                    filtered.map((client) => (
                        <div key={client.id}
                            className="grid grid-cols-[40px_1fr_160px_160px_160px_160px_48px] items-center px-4 py-3.5 border-b border-foreground/5 hover:bg-foreground/[0.03] transition group cursor-pointer"
                            onClick={() => setViewClient(client)}>
                            <div onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selectedIds.has(client.id)} onChange={() => toggleOne(client.id)}
                                    className="w-4 h-4 rounded border-foreground/30 accent-blue-600" />
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg text-[10px] flex items-center justify-center text-white font-bold shrink-0"
                                    style={{ background: avatarBg(client.name) }}>
                                    {getInitials(client.name)}
                                </span>
                                <span className="text-sm font-medium text-foreground/90">{client.name}</span>
                            </div>
                            <div className="text-xs text-foreground/60 font-mono">{shortId(client.id)}</div>
                            <div className="text-xs text-foreground/70">{client.alias || "—"}</div>
                            <div className="text-xs text-foreground/70">{client.region || "—"}</div>
                            <div className="text-xs text-foreground/70">{client.business_sector || "—"}</div>
                            <div onClick={(e) => e.stopPropagation()}>
                                <RowMenu
                                    onViewDetails={() => setViewClient(client)}
                                    onEdit={() => setEditClient(client)}
                                    onProjects={() => setProjectsClient(client)}
                                    onDelete={() => handleDeleteOpen(client)}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {addModal && <AddClientModal onClose={() => setAddModal(false)} onCreated={() => { fetchClients(); showToast("Client created successfully!"); }} />}
            {editClient && <EditClientModal client={editClient} onClose={() => setEditClient(null)} onSaved={() => { fetchClients(); showToast("Client updated successfully!"); }} />}
            {viewClient && (
                <ViewDetailsPanel
                    client={viewClient}
                    onClose={() => setViewClient(null)}
                    onEdit={() => { setEditClient(viewClient); setViewClient(null); }}
                />
            )}
            {projectsClient && <RelatedProjectsModal client={projectsClient} onClose={() => setProjectsClient(null)} />}
            {deleteClient_ && (
                <DeleteModal
                    client={deleteClient_}
                    projectCount={deleteProjectCount}
                    onClose={() => setDeleteClient(null)}
                    onDeleted={() => { fetchClients(); showToast("Client removed successfully!"); }}
                />
            )}

            {/* Bulk Modals */}
            {exportModal && (
                <ExportModal
                    clients={clients.filter((c) => selectedIds.has(c.id))}
                    onClose={() => setExportModal(false)}
                    onExported={() => showToast(`Exported ${selectedIds.size} client${selectedIds.size > 1 ? "s" : ""} successfully!`)}
                />
            )}
            {bulkDeleteModal && (
                <BulkDeleteModal
                    clients={clients.filter((c) => selectedIds.has(c.id))}
                    onClose={() => setBulkDeleteModal(false)}
                    onDeleted={(count) => {
                        setSelectedIds(new Set());
                        fetchClients();
                        showToast(`${count} client${count > 1 ? "s" : ""} removed successfully!`);
                    }}
                />
            )}

            {/* Toast */}
            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </div>
    );
}
