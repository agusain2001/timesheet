"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getToken } from "@/lib/auth";
import {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    type Project,
    type ProjectCreate,
    type ProjectUpdate,
    type ProjectStatus,
} from "@/services/projects";
import { getClients } from "@/services/clients";
import type { Client } from "@/types/api";
import { AddProjectModal, EditProjectModal } from "@/components/ProjectModals";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function avatarBg(name: string) {
    const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 60%, 45%)`;
}
function shortId(id: string) { return id.slice(0, 8).toUpperCase(); }
function fmtDate(d?: string) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
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

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }: { message: string; type: "success" | "error"; onDone: () => void }) {
    useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
    return (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium
            ${type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {type === "success"
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
            {message}
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="h-8 w-44 bg-foreground/10 rounded animate-pulse" />
                <div className="h-9 w-32 bg-foreground/10 rounded-lg animate-pulse" />
            </div>
            <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="h-10 bg-foreground/5 border-b border-foreground/10" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 border-b border-foreground/5 px-4 flex items-center gap-4">
                        <div className="w-4 h-4 bg-foreground/10 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-foreground/10 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-foreground/10 rounded animate-pulse ml-4" />
                        <div className="h-4 w-24 bg-foreground/10 rounded animate-pulse ml-4" />
                    </div>
                ))}
            </div>
        </div>
    );
}



// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ project, onClose, onDeleted }: { project: Project; onClose: () => void; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);
    const handleDelete = async () => {
        setDeleting(true);
        try { await deleteProject(project.id); onDeleted(); onClose(); }
        catch { setDeleting(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[380px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden p-6 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-red-500">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">Remove Project</h2>
                <p className="text-xs text-foreground/50 mb-4">Deleting this project will remove all linked data including tasks and time entries.</p>
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 text-left mb-5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-foreground/50">Project Name</span>
                        <span className="text-foreground/90 font-medium">{project.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-foreground/50">Project ID</span>
                        <span className="text-foreground/90 font-medium font-mono">{shortId(project.id)}</span>
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
function BulkSelectionBar({ count, onDelete, onClear }: { count: number; onDelete: () => void; onClear: () => void; }) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">{count}</span>
                <span className="text-xs font-medium text-foreground/80">
                    {count} project{count > 1 ? "s" : ""} selected
                </span>
                <button onClick={onClear} className="text-[10px] text-foreground/40 hover:text-foreground/70 underline transition">Clear</button>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onDelete}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/90 text-white hover:bg-red-500 transition">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                    Delete Selected
                </button>
            </div>
        </div>
    );
}

// ─── Bulk Delete Modal ────────────────────────────────────────────────────────
function BulkDeleteModal({ count, onClose, onDeleted }: { count: number; onClose: () => void; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[380px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden p-6 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-red-500">
                        <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">Delete {count} Projects</h2>
                <p className="text-xs text-foreground/50 mb-6">Are you sure you want to delete these projects? This action is permanent and will remove all associated tasks and data.</p>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Cancel</button>
                    <button onClick={() => { setDeleting(true); onDeleted(); }} disabled={deleting} className="flex-1 px-4 py-2 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition">
                        {deleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Project Member type ──────────────────────────────────────────────────────
interface ProjectMember {
    id: string;
    full_name: string;
    email: string;
    position?: string;
    role: string;
    avatar_url?: string;
    employee_code?: string;
}

// ─── Team Members Modal ───────────────────────────────────────────────────────
function TeamMembersModal({
    project, onClose, onViewMember,
}: { project: Project; onClose: () => void; onViewMember: (m: ProjectMember) => void }) {
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const token = getToken();
        fetch(`/api/projects/${project.id}/members`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then(setMembers)
            .catch(() => setMembers([]))
            .finally(() => setLoading(false));
    }, [project.id]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[600px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 pt-5 pb-3">
                    <div>
                        <h2 className="text-base font-bold text-foreground">All Members</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">All Members associated by this projects are listed below for quick access and management.</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="px-6 pb-5">
                    <div className="rounded-xl border border-foreground/10 overflow-hidden">
                        <div className="grid grid-cols-[48px_1fr_1fr_1fr_40px] px-4 py-2.5 border-b border-foreground/10 text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">
                            <div>Photo</div><div>Employee Code</div><div>Employee Name</div><div>Position</div><div />
                        </div>
                        {loading ? (
                            <div className="py-10 text-center text-xs text-foreground/40">Loading members...</div>
                        ) : members.length === 0 ? (
                            <div className="py-10 text-center text-xs text-foreground/40">No members found for this project</div>
                        ) : (
                            members.map((m) => (
                                <div key={m.id} className="grid grid-cols-[48px_1fr_1fr_1fr_40px] items-center px-4 py-3 border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.03] transition relative">
                                    <div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: avatarBg(m.full_name) }}>
                                            {getInitials(m.full_name)}
                                        </div>
                                    </div>
                                    <div className="text-xs text-foreground/60 font-mono">{m.employee_code || shortId(m.id)}</div>
                                    <div className="text-xs text-foreground/90 font-medium">{m.full_name}</div>
                                    <div className="text-xs text-foreground/60">{m.position || m.role || "—"}</div>
                                    <div className="relative" ref={menuOpen === m.id ? menuRef : null}>
                                        <button
                                            onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                                            className="p-1.5 rounded-md hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
                                        </button>
                                        {menuOpen === m.id && (
                                            <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-foreground/10 bg-background shadow-2xl py-1 text-xs">
                                                <button onClick={() => { onViewMember(m); setMenuOpen(null); onClose(); }} className="w-full text-left px-3 py-2 hover:bg-foreground/5 text-foreground/80 transition">View Member Details</button>
                                                <button onClick={() => setMenuOpen(null)} className="w-full text-left px-3 py-2 hover:bg-foreground/5 text-foreground/80 transition">View Task</button>
                                                <button onClick={() => setMenuOpen(null)} className="w-full text-left px-3 py-2 hover:bg-foreground/5 text-foreground/80 transition">Related Projects</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Member Details Panel ─────────────────────────────────────────────────────
function MemberDetailsPanel({ member, onClose }: { member: ProjectMember; onClose: () => void }) {
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
                <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/10 sticky top-0 bg-background z-10">
                    <button onClick={onClose} className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                        Go Back
                    </button>
                </div>
                <div className="flex flex-col items-center py-8 border-b border-foreground/10">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3" style={{ background: avatarBg(member.full_name) }}>
                        {getInitials(member.full_name)}
                    </div>
                    <h2 className="text-lg font-bold text-foreground">{member.full_name}</h2>
                    <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-500 border border-blue-500/20">
                        {member.role || "Employee"}
                    </span>
                    <p className="text-xs text-foreground/50 mt-2">
                        Department: Design &nbsp;|&nbsp; ID: {shortId(member.id)} ©
                    </p>
                </div>
                <div className="px-5 py-4 space-y-5">
                    <div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Employee Details</p>
                        {row("Designation", member.position)}
                        {row("Employment Type", "Employee")}
                        {row("Work Location", "Kanpur, India")}
                        {row("Last Activity", "Updated 2 days ago")}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Work & Availability Information</p>
                        {row("Reporting Manager", "—")}
                        {row("Availability Status", "Partially Available")}
                        {row("Working Hours", "9:30 AM – 6:30 PM")}
                        {row("Time Zone", "IST (UTC +05:30)")}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Contact</p>
                        {row("Email", member.email)}
                        {row("Employee Code", member.employee_code)}
                    </div>
                </div>
            </div>
        </div>
    );
}


// ─── Structure Tree ───────────────────────────────────────────────────────────
function StructureTree({ projectId }: { projectId: string }) {
    const [phases, setPhases] = useState<any[]>([]);
    const [epics, setEpics] = useState<Record<string, any[]>>({});
    const [milestones, setMilestones] = useState<Record<string, any[]>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [newPhase, setNewPhase] = useState("");
    const [addPhase, setAddPhase] = useState(false);

    const token = () => getToken();
    const hdr = { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/project-structure/projects/${projectId}/phases`, { headers: hdr });
            if (res.ok) setPhases(await res.json());
        } catch { }
        setLoading(false);
    };

    const loadEpics = async (phaseId: string) => {
        if (epics[phaseId]) return;
        const res = await fetch(`/api/project-structure/phases/${phaseId}/epics`, { headers: hdr });
        if (res.ok) { const data = await res.json(); setEpics(p => ({ ...p, [phaseId]: data })); }
    };

    const loadMilestones = async (epicId: string) => {
        if (milestones[epicId]) return;
        const res = await fetch(`/api/project-structure/epics/${epicId}/milestones`, { headers: hdr });
        if (res.ok) { const data = await res.json(); setMilestones(p => ({ ...p, [epicId]: data })); }
    };

    useEffect(() => { load(); }, [projectId]);

    const createPhase = async () => {
        if (!newPhase.trim()) return;
        await fetch(`/api/project-structure/projects/${projectId}/phases`, {
            method: "POST", headers: hdr,
            body: JSON.stringify({ name: newPhase, project_id: projectId }),
        });
        setNewPhase(""); setAddPhase(false); load();
    };

    const deletePhase = async (id: string) => {
        await fetch(`/api/project-structure/phases/${id}`, { method: "DELETE", headers: hdr });
        load();
    };

    if (loading) return <div className="py-8 text-center text-foreground/40 text-sm">Loading structure…</div>;

    return (
        <div className="space-y-2">
            {phases.length === 0 && !addPhase && (
                <p className="text-xs text-foreground/40 py-4 text-center">No phases yet. Add one below.</p>
            )}
            {phases.map(phase => {
                const phaseOpen = expanded[phase.id];
                const phEpics = epics[phase.id] ?? [];
                return (
                    <div key={phase.id} className="rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                        {/* Phase row */}
                        <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-foreground/5 group"
                            onClick={() => {
                                setExpanded(p => ({ ...p, [phase.id]: !p[phase.id] }));
                                if (!phaseOpen) loadEpics(phase.id);
                            }}>
                            <span className="text-foreground/40 text-xs">{phaseOpen ? "▼" : "▶"}</span>
                            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                            <span className="text-sm font-semibold text-foreground/80 flex-1">{phase.name}</span>
                            <button onClick={e => { e.stopPropagation(); deletePhase(phase.id); }}
                                className="opacity-0 group-hover:opacity-100 text-foreground/30 hover:text-red-400 transition text-xs">✕</button>
                        </div>
                        {/* Epics */}
                        {phaseOpen && (
                            <div className="pl-6 pb-2 space-y-1">
                                {phEpics.map(epic => {
                                    const epicOpen = expanded[epic.id];
                                    const mils = milestones[epic.id] ?? [];
                                    return (
                                        <div key={epic.id}>
                                            <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-foreground/5 rounded-lg group"
                                                onClick={() => {
                                                    setExpanded(p => ({ ...p, [epic.id]: !p[epic.id] }));
                                                    if (!epicOpen) loadMilestones(epic.id);
                                                }}>
                                                <span className="text-foreground/30 text-xs">{epicOpen ? "▼" : "▶"}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                <span className="text-xs text-foreground/70 flex-1">{epic.name}</span>
                                            </div>
                                            {/* Milestones */}
                                            {epicOpen && mils.map(ms => (
                                                <div key={ms.id} className="flex items-center gap-2 px-3 py-1.5 pl-8">
                                                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                                                    <span className="text-[11px] text-foreground/50">{ms.name}</span>
                                                    {ms.due_date && <span className="text-[10px] text-foreground/30 ml-auto">{ms.due_date.slice(0, 10)}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                                {phEpics.length === 0 && <p className="text-[11px] text-foreground/30 px-3 py-1">No epics</p>}
                            </div>
                        )}
                    </div>
                );
            })}
            {/* Add Phase */}
            {addPhase ? (
                <div className="flex gap-2 mt-2">
                    <input autoFocus value={newPhase} onChange={e => setNewPhase(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && createPhase()}
                        placeholder="Phase name…"
                        className="flex-1 px-3 py-1.5 text-xs bg-foreground/5 border border-foreground/10 rounded-lg outline-none focus:border-blue-500 text-foreground" />
                    <button onClick={createPhase} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Add</button>
                    <button onClick={() => setAddPhase(false)} className="text-foreground/40 text-xs hover:text-foreground transition">Cancel</button>
                </div>
            ) : (
                <button onClick={() => setAddPhase(true)} className="mt-1 text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1">
                    <span>+</span> Add Phase
                </button>
            )}
        </div>
    );
}

// ─── Project Details Panel ────────────────────────────────────────────────────
function ProjectDetailsPanel({
    project, clients, onClose, onEdit, onViewTasks,
}: { project: Project; clients: Client[]; onClose: () => void; onEdit: () => void; onViewTasks: () => void }) {
    const [panelTab, setPanelTab] = useState<"details" | "structure">("details");
    const [showMembers, setShowMembers] = useState(false);
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);

    const clientName = clients.find((c) => c.id === project.client_id)?.name ?? "—";
    const managerName = project.project_managers?.[0]?.employee_name ?? "—";

    const loadMembers = useCallback(async () => {
        if (members.length > 0) { setShowMembers(!showMembers); return; }
        setLoadingMembers(true);
        try {
            const token = getToken();
            const res = await fetch(`/api/projects/${project.id}/members`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setMembers(data);
            setShowMembers(true);
        } catch { setMembers([]); setShowMembers(true); }
        finally { setLoadingMembers(false); }
    }, [project.id, members.length, showMembers]);

    const row = (label: string, value?: string) => (
        <div className="flex justify-between py-2 border-b border-foreground/5 last:border-0">
            <span className="text-xs text-foreground/50">{label}</span>
            <span className="text-xs text-foreground/90 font-medium text-right max-w-[55%]">{value || "—"}</span>
        </div>
    );

    if (selectedMember) {
        return <MemberDetailsPanel member={selectedMember} onClose={() => setSelectedMember(null)} />;
    }

    return (
        <div className="fixed inset-0 z-40 flex" onClick={onClose}>
            <div className="flex-1" />
            <div className="w-full max-w-[420px] h-full bg-background border-l border-foreground/10 shadow-2xl overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/10 sticky top-0 bg-background z-10">
                    <button onClick={onClose} className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                        Go Back
                    </button>
                    <button onClick={onViewTasks} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                        Move to Tasks
                    </button>
                </div>

                {/* Project title */}
                <div className="px-5 pt-5 pb-4 border-b border-foreground/10">
                    <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={project.status} />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
                    <p className="text-xs text-foreground/50 mt-1">
                        Managed By: {managerName} &nbsp;|&nbsp; Project ID: {shortId(project.id)} ©
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-5 pb-3 border-b border-foreground/10">
                    <button onClick={() => setPanelTab("details")} className={panelTab === "details" ? "px-3 py-1 text-xs rounded-lg bg-blue-600 text-white font-medium" : "px-3 py-1 text-xs rounded-lg text-foreground/50 hover:text-foreground transition"}>Details</button>
                    <button onClick={() => setPanelTab("structure")} className={panelTab === "structure" ? "px-3 py-1 text-xs rounded-lg bg-blue-600 text-white font-medium" : "px-3 py-1 text-xs rounded-lg text-foreground/50 hover:text-foreground transition"}>Structure</button>
                </div>

                <div className="px-5 py-4 space-y-5">
                    {panelTab === "structure" ? (
                        <StructureTree projectId={project.id} />
                    ) : (
                        <>
                            {/* Project Overview */}
                            <div>
                                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Project Overview</p>
                                {row("Client Name", clientName)}
                                {row("Business Sector", "—")}
                                {row("Start Date", fmtDate(project.start_date))}
                                {row("Expected End Date", fmtDate(project.end_date))}
                                {project.notes && (
                                    <div className="py-2">
                                        <p className="text-xs text-foreground/50 mb-1">Description</p>
                                        <p className="text-xs text-foreground/80 leading-relaxed">{project.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* My Involvement */}
                            <div>
                                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">My Involvement</p>
                                {row("Your Role", "Design Intern")}
                                {row("Assigned Tasks", "4 Tasks")}
                                {row("Overdue Tasks", "1 Tasks")}
                                {row("Time Logged", "18h 30m")}
                            </div>

                            {/* Project Team */}
                            <div>
                                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Project Team</p>
                                {row("My Manager", managerName)}
                                {row("Total Members", String(members.length || "—"))}
                                <button
                                    onClick={loadMembers}
                                    className="mt-2 text-xs text-blue-500 hover:text-blue-400 transition flex items-center gap-1"
                                >
                                    {loadingMembers ? "Loading..." : showMembers ? "Hide Team Members ▲" : "View Team Members ▼"}
                                </button>
                                {showMembers && members.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {members.map((m) => (
                                            <div key={m.id} className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: avatarBg(m.full_name) }}>
                                                        {getInitials(m.full_name)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-foreground/90 font-medium">{m.full_name}</p>
                                                        <p className="text-[10px] text-foreground/50">{m.position || m.role}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedMember(m)} className="text-[10px] text-blue-500 hover:text-blue-400 transition">
                                                    View Member Details →
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Edit button */}
                            <button onClick={onEdit} className="w-full py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition flex items-center justify-center gap-1.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                Edit Project Details
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────
function RowMenu({
    project, onView, onEdit, onTeam, onDelete, onClose, openAbove,
}: { project: Project; onView: () => void; onEdit: () => void; onTeam: () => void; onDelete: () => void; onClose: () => void; openAbove?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    return (
        <div ref={ref} className="absolute right-4 z-50 w-48 rounded-xl border border-foreground/10 bg-background shadow-2xl py-1 text-xs" style={openAbove ? { bottom: "100%" } : { top: "100%" }}>
            <button onClick={() => { onView(); onClose(); }} className="w-full text-left px-3 py-2 hover:bg-foreground/5 text-foreground/80 transition">View Project Details</button>
            <button onClick={() => { onEdit(); onClose(); }} className="w-full text-left px-3 py-2 hover:bg-foreground/5 text-foreground/80 transition">Edit Details</button>
            <button onClick={() => { onClose(); }} className="w-full text-left px-3 py-2 hover:bg-foreground/5 text-foreground/80 transition">View My Tasks</button>
            <button onClick={() => { onTeam(); onClose(); }} className="w-full text-left px-3 py-2 hover:bg-foreground/5 text-foreground/80 transition">View Team Members</button>
            <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-3 py-2 hover:bg-foreground/5 text-red-500 transition">Delete 🗑</button>
        </div>
    );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, options, selected, onChange }: {
    label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggle = (v: string) => {
        onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition
                    ${selected.length > 0
                        ? "bg-blue-500/15 border-blue-500/30 text-blue-500"
                        : "bg-foreground/5 border-foreground/15 text-foreground/70 hover:bg-foreground/10"}`}
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                {label}
                {selected.length > 0 && (
                    <>
                        : {selected.join(", ")}
                        <span onClick={(e) => { e.stopPropagation(); onChange([]); }} className="ml-1 hover:text-red-400 transition">×</span>
                    </>
                )}
            </button>
            {open && (
                <div className="absolute left-0 top-9 z-50 w-52 rounded-xl border border-foreground/10 bg-background shadow-2xl py-2">
                    {options.map((opt) => (
                        <button key={opt} onClick={() => toggle(opt)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-foreground/5 text-xs text-foreground/80 transition">
                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${selected.includes(opt) ? "bg-blue-600 border-blue-600" : "border-foreground/30"}`}>
                                {selected.includes(opt) && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="M20 6L9 17l-5-5" /></svg>}
                            </span>
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const SECTORS = ["Pharmacy", "Technology", "Finance", "Healthcare", "Education", "Manufacturing", "Retail", "Other"];

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sectorFilter, setSectorFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Modal/panel state
    const [showAdd, setShowAdd] = useState(false);
    const [editProject, setEditProject] = useState<Project | null>(null);
    const [deleteProject_, setDeleteProject] = useState<Project | null>(null);
    const [detailProject, setDetailProject] = useState<Project | null>(null);
    const [teamProject, setTeamProject] = useState<Project | null>(null);
    const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
    const [menuRow, setMenuRow] = useState<string | null>(null);
    const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

    const [menuOpenAbove, setMenuOpenAbove] = useState(false);

    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const showToast = useCallback((message: string, type: "success" | "error") => {
        setToast({ message, type });
    }, []);

    const loadProjects = useCallback(async () => {
        try {
            const data = await getProjects();
            setProjects(data);
        } catch {
            showToast("Failed to load projects", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadProjects();
        getClients().then(setClients).catch(() => setClients([]));
    }, [loadProjects]);

    // Filtered projects
    const filtered = projects.filter((p) => {
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter.length === 0 || statusFilter.some((s) => s.toLowerCase().replace(/ /g, "_") === p.status);
        // sector filter: we don't have business_sector on project directly, skip for now
        const matchSector = sectorFilter.length === 0;
        return matchSearch && matchStatus && matchSector;
    });

    const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
    const toggleAll = () => {
        if (allChecked) setSelected(new Set());
        else setSelected(new Set(filtered.map((p) => p.id)));
    };
    const toggleOne = (id: string) => {
        const s = new Set(selected);
        s.has(id) ? s.delete(id) : s.add(id);
        setSelected(s);
    };

    const handleBulkDelete = async () => {
        let success = 0;
        let fail = 0;
        const ids = Array.from(selected);
        
        for (const id of ids) {
            try {
                await deleteProject(id);
                success++;
            } catch {
                fail++;
            }
        }
        
        if (success > 0) {
            showToast(`Successfully deleted ${success} project${success > 1 ? "s" : ""}`, "success");
            loadProjects();
            setSelected(new Set());
        }
        if (fail > 0) {
            showToast(`Failed to delete ${fail} project${fail > 1 ? "s" : ""}`, "error");
        }
        setBulkDeleteModal(false);
    };

    const clientName = (id?: string) => clients.find((c) => c.id === id)?.name ?? "—";
    const managerName = (p: Project) => p.project_managers?.[0]?.employee_name ?? "—";

    const SECTOR_OPTIONS = SECTORS;
    const STATUS_OPTIONS = ["Draft", "Active", "On Hold", "Completed", "Archived"];

    return (
        <div className="space-y-5 min-h-full bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
                <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                    Add Project
                </button>
            </div>

            {/* How It Works */}
            <HowItWorks
                pageKey="projects"
                color="blue"
                description="Projects lets you create and manage all your company's projects, track their status, and see which team members are involved."
                bullets={[
                    "Click Add Project to create a new project with a client, manager, dates, and status.",
                    "Click the ⋯ menu on any row to view project details, edit, manage team members, or delete.",
                    "Click View Project Details to open the side panel showing project info and team structure.",
                    "Use the Sector and Status filter chips to narrow down the project list.",
                    "Click Move to Tasks in the detail panel to jump straight to that project's tasks.",
                ]}
            />

            {/* Bulk Selection Bar — shown when 1+ selected */}
            {selected.size > 0 && (
                <BulkSelectionBar
                    count={selected.size}
                    onDelete={() => setBulkDeleteModal(true)}
                    onClear={() => setSelected(new Set())}
                />
            )}

            {/* Filters row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <FilterChip label="Sort By Sector" options={SECTOR_OPTIONS} selected={sectorFilter} onChange={setSectorFilter} />
                    <FilterChip label="Sort By Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
                </div>
                {/* Search */}
                <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input
                        className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-foreground/15 bg-foreground/[0.03] text-foreground outline-none placeholder:text-foreground/30 focus:border-blue-500/50 transition w-48"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? <Skeleton /> : (
                <div className="rounded-xl border border-foreground/10 overflow-visible">
                    {/* Table header */}
                    <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_1fr_1fr_1fr_40px] px-4 py-3 border-b border-foreground/10 bg-foreground/[0.02] text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">
                        <div><input type="checkbox" checked={allChecked} onChange={toggleAll} className="rounded" /></div>
                        <div>Project Name</div>
                        <div>Project ID</div>
                        <div>Client Name</div>
                        <div>Managed By</div>
                        <div>Business Sector</div>
                        <div>Status</div>
                        <div />
                    </div>

                    {/* Empty state */}
                    {filtered.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-foreground/5 border border-foreground/10 flex items-center justify-center">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-foreground/30">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-foreground">No projects added yet</p>
                                <p className="text-xs text-foreground/50 mt-1 max-w-xs">Add a project to get started, and your manager will be automatically notified for visibility and coordination across teams.</p>
                            </div>
                            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-foreground/20 text-sm text-foreground/70 hover:bg-foreground/5 transition">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                                Add Project
                            </button>
                        </div>
                    ) : (
                        filtered.map((p) => (
                            <div key={p.id} className="relative grid grid-cols-[40px_1.5fr_1fr_1fr_1fr_1fr_1fr_40px] items-center px-4 py-3.5 border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.02] transition group">
                                <div><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="rounded" /></div>
                                <div className="text-sm text-foreground/90 font-medium truncate pr-2">{p.name}</div>
                                <div className="text-xs text-foreground/60 font-mono">{shortId(p.id)}</div>
                                <div className="text-xs text-foreground/70">{clientName(p.client_id)}</div>
                                <div className="text-xs text-foreground/70">{managerName(p)}</div>
                                <div className="text-xs text-foreground/70">—</div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={p.status} />
                                </div>
                                {/* Row action button */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMenuOpenAbove(window.innerHeight - rect.bottom < 240);
                                            setMenuRow(menuRow === p.id ? null : p.id);
                                        }}
                                        className="p-1.5 rounded-md hover:bg-foreground/10 text-foreground/40 hover:text-foreground transition opacity-0 group-hover:opacity-100"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
                                    </button>
                                    {menuRow === p.id && (
                                        <RowMenu
                                            project={p}
                                            onView={() => setDetailProject(p)}
                                            onEdit={() => setEditProject(p)}
                                            onTeam={() => setTeamProject(p)}
                                            onDelete={() => setDeleteProject(p)}
                                            onClose={() => setMenuRow(null)}
                                            openAbove={menuOpenAbove}
                                        />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modals */}
            {showAdd && (
                <AddProjectModal
                    onClose={() => setShowAdd(false)}
                    onCreated={() => { loadProjects(); showToast("Project created successfully", "success"); }}
                />
            )}
            {editProject && (
                <EditProjectModal
                    project={editProject}
                    onClose={() => setEditProject(null)}
                    onSaved={() => { loadProjects(); showToast("Project updated successfully", "success"); }}
                />
            )}
            {deleteProject_ && (
                <DeleteModal
                    project={deleteProject_}
                    onClose={() => setDeleteProject(null)}
                    onDeleted={() => { loadProjects(); showToast("Project deleted", "success"); }}
                />
            )}
            {detailProject && (
                <ProjectDetailsPanel
                    project={detailProject}
                    clients={clients}
                    onClose={() => setDetailProject(null)}
                    onEdit={() => { setEditProject(detailProject); setDetailProject(null); }}
                    onViewTasks={() => setDetailProject(null)}
                />
            )}
            {teamProject && (
                <TeamMembersModal
                    project={teamProject}
                    onClose={() => setTeamProject(null)}
                    onViewMember={(m) => { setSelectedMember(m); setTeamProject(null); }}
                />
            )}
            {selectedMember && (
                <MemberDetailsPanel
                    member={selectedMember}
                    onClose={() => setSelectedMember(null)}
                />
            )}

            {bulkDeleteModal && (
                <BulkDeleteModal 
                    count={selected.size} 
                    onClose={() => setBulkDeleteModal(false)} 
                    onDeleted={handleBulkDelete} 
                />
            )}

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
        </div>
    );
}
