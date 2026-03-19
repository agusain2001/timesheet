"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
    getDepartments,
    getDepartmentMembers,
    getDepartmentProjects,
    createDepartment,
    updateDepartment,
    deleteDepartment,
} from "@/services/departments";
import type { DepartmentUpdate } from "@/types/api";
import type { Department, DepartmentMember, DepartmentProject } from "@/types/api";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ============ Toast ============
function Toast({ message, type, onDone }: { message: string; type: "success" | "error"; onDone: () => void }) {
    useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
    return (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in slide-in-from-bottom-2
            ${type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {type === "success"
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
            {message}
        </div>
    );
}

// ============ Helpers ============
function getInitials(name: string): string {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function avatarBg(name: string): string {
    const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 60%, 45%)`;
}

// Allowed: letters, numbers, spaces, hyphens, ampersands, apostrophes, dots, parentheses
const DEPT_NAME_REGEX = /^[a-zA-Z0-9 \-&'().]+$/;
function validateDeptName(name: string): string | null {
    if (!name.trim()) return "Department name is required.";
    if (name.trim().length < 2) return "Department name must be at least 2 characters.";
    if (name.trim().length > 80) return "Department name must be 80 characters or fewer.";
    if (!DEPT_NAME_REGEX.test(name.trim())) return "Department name can only contain letters, numbers, spaces, hyphens (-), ampersands (&), apostrophes (\'), periods (.), and parentheses.";
    return null;
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/20",
        on_hold: "bg-amber-500/15 text-amber-400 border-amber-500/20",
        completed: "bg-purple-500/15 text-purple-400 border-purple-500/20",
        draft: "bg-foreground/10 text-foreground/50 border-foreground/10",
        archived: "bg-foreground/10 text-foreground/40 border-foreground/10",
    };
    const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[status] || colors.draft}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {label}
        </span>
    );
}

// ============ Members Modal ============
function MembersModal({
    dept,
    onClose,
}: {
    dept: Department;
    onClose: () => void;
}) {
    const [members, setMembers] = useState<DepartmentMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDepartmentMembers(dept.id)
            .then(setMembers)
            .catch(() => setMembers([]))
            .finally(() => setLoading(false));
    }, [dept.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-[580px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-5 pb-3">
                    <div>
                        <h2 className="text-base font-bold text-foreground">All Members</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">
                            All Members associated by this department are listed below for quick access and management.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Table */}
                <div className="px-6 pb-5">
                    <div className="rounded-xl border border-foreground/10 overflow-hidden">
                        <div className="grid grid-cols-[60px_1fr_1fr_1fr] px-4 py-2.5 border-b border-foreground/10 text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">
                            <div>Photo</div>
                            <div>Employee Code</div>
                            <div>Employee Name</div>
                            <div>Position</div>
                        </div>
                        {loading ? (
                            <div className="py-10 text-center text-xs text-foreground/40">Loading...</div>
                        ) : members.length === 0 ? (
                            <div className="py-10 text-center text-xs text-foreground/40">No members found</div>
                        ) : (
                            members.map((m) => (
                                <div key={m.id} className="grid grid-cols-[60px_1fr_1fr_1fr] items-center px-4 py-3 border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.03] transition">
                                    <div>
                                        <span
                                            className="w-8 h-8 rounded-full text-[11px] flex items-center justify-center text-white font-bold"
                                            style={{ background: avatarBg(m.full_name) }}
                                        >
                                            {getInitials(m.full_name)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-foreground/70 font-mono">{m.employee_code || m.id.slice(0, 8).toUpperCase()}</div>
                                    <div className="text-xs text-foreground/90 font-medium">{m.full_name}</div>
                                    <div className="text-xs text-foreground/60">{m.position || m.role}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============ Projects Modal ============
function ProjectsModal({
    dept,
    onClose,
}: {
    dept: Department;
    onClose: () => void;
}) {
    const [projects, setProjects] = useState<DepartmentProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    useEffect(() => {
        getDepartmentProjects(dept.id)
            .then(setProjects)
            .catch(() => setProjects([]))
            .finally(() => setLoading(false));
    }, [dept.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-[600px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-5 pb-3">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Related Projects</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">
                            All projects handled by this department are listed below for quick access and management.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Table */}
                <div className="px-6 pb-5">
                    <div className="rounded-xl border border-foreground/10 overflow-hidden">
                        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] px-4 py-2.5 border-b border-foreground/10 text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">
                            <div>Project Name</div>
                            <div>Managed By</div>
                            <div>Business Sector</div>
                            <div>Status</div>
                        </div>
                        {loading ? (
                            <div className="py-10 text-center text-xs text-foreground/40">Loading...</div>
                        ) : projects.length === 0 ? (
                            <div className="py-10 text-center text-xs text-foreground/40">No projects found</div>
                        ) : (
                            projects.map((p) => (
                                <div
                                    key={p.id}
                                    className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center px-4 py-3 border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.03] transition relative"
                                    onMouseEnter={() => setHoveredId(p.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    <div className="text-xs text-foreground/90 font-medium">{p.name}</div>
                                    <div className="text-xs text-foreground/60">{p.managed_by || "—"}</div>
                                    <div className="text-xs text-foreground/60">{p.business_sector || "—"}</div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={p.status} />
                                        {hoveredId === p.id && (
                                            <span className="text-[10px] text-blue-400 font-medium cursor-pointer hover:underline whitespace-nowrap">
                                                View Details
                                            </span>
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

// ============ Row Context Menu ============
function RowMenu({
    dept,
    onViewDetails,
    onViewMembers,
    onViewProjects,
    onEdit,
    onDelete,
}: {
    dept: Department;
    onViewDetails: () => void;
    onViewMembers: () => void;
    onViewProjects: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [openAbove, setOpenAbove] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setOpenAbove(window.innerHeight - rect.bottom < 260);
        }
        setOpen(!open);
    };

    return (
        <div ref={ref} className="relative">
            <button
                ref={btnRef}
                onClick={handleToggle}
                className="w-7 h-7 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
            </button>
            {open && (
                <div className={`absolute right-0 ${openAbove ? "bottom-full mb-1" : "top-full mt-1"} w-48 rounded-xl border border-foreground/10 bg-background shadow-2xl z-50 py-1 overflow-hidden`}>
                    <button
                        onClick={() => { setOpen(false); onViewDetails(); }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-foreground/80 hover:bg-foreground/10 hover:text-foreground transition"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                        View Details
                    </button>
                    <button
                        onClick={() => { setOpen(false); onViewMembers(); }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-foreground/80 hover:bg-foreground/10 hover:text-foreground transition"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        View Members
                    </button>
                    <button
                        onClick={() => { setOpen(false); onViewProjects(); }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-foreground/80 hover:bg-foreground/10 hover:text-foreground transition"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        Related Projects
                    </button>
                    <div className="border-t border-foreground/8 my-1" />
                    <button
                        onClick={() => { setOpen(false); onEdit(); }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-foreground/80 hover:bg-foreground/10 hover:text-foreground transition"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit Department
                    </button>
                    <button
                        onClick={() => { setOpen(false); onDelete(); }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-red-500 hover:bg-red-500/10 transition"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                        Delete Department
                    </button>
                </div>
            )}
        </div>
    );
}

// ============ Add Department Modal ============
function AddDepartmentModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: () => void;
}) {
    const [name, setName] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setName(val);
        // Real-time validation feedback
        if (val) setError(validateDeptName(val));
        else setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nameErr = validateDeptName(name);
        if (nameErr) { setError(nameErr); return; }
        setSaving(true);
        setError(null);
        try {
            await createDepartment({ name: name.trim(), notes: notes.trim() || undefined });
            onCreated();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to create department";
            setError(msg);
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-[440px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-foreground/10">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Add Department</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">Create a new department in your organization.</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Error Banner — top of form like Workspace modal */}
                    {error && (
                        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground/70">Department Name <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="e.g. Engineering, Marketing..."
                            autoFocus
                            maxLength={80}
                            className={`w-full border rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/30 transition ${
                                error && name ? "border-red-500/50 focus:border-red-500/70" : "border-foreground/15 focus:border-blue-500/50"
                            }`}
                        />
                        <p className="text-[10px] text-foreground/40">Only letters, numbers, spaces and basic punctuation (- &amp; &apos; . ) are allowed.</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground/70">Description <span className="text-foreground/30">(optional)</span></label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Brief description of this department..."
                            rows={3}
                            className="w-full border border-foreground/15 rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-blue-500/50 transition resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    Create Department
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============ Edit Department Modal ============
function EditDepartmentModal({
    dept,
    onClose,
    onSaved,
}: {
    dept: Department;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [name, setName] = useState(dept.name);
    const [notes, setNotes] = useState(dept.notes ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setName(val);
        if (val) setError(validateDeptName(val));
        else setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nameErr = validateDeptName(name);
        if (nameErr) { setError(nameErr); return; }
        setSaving(true);
        setError(null);
        try {
            const data: DepartmentUpdate = { name: name.trim(), notes: notes.trim() || undefined };
            await updateDepartment(dept.id, data);
            onSaved();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update department");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[440px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-foreground/10">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Edit Department</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">Update department name or description.</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Error Banner */}
                    {error && (
                        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground/70">Department Name <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={handleNameChange}
                            autoFocus
                            maxLength={80}
                            className={`w-full border rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/30 transition ${
                                error && name ? "border-red-500/50 focus:border-red-500/70" : "border-foreground/15 focus:border-blue-500/50"
                            }`}
                        />
                        <p className="text-[10px] text-foreground/40">Only letters, numbers, spaces and basic punctuation (- &amp; &apos; . ) are allowed.</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground/70">Description <span className="text-foreground/30">(optional)</span></label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full border border-foreground/15 rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-blue-500/50 transition resize-none"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-1.5">
                            {saving ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Saving...</> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============ Delete Department Modal ============
function DeleteDepartmentModal({
    dept,
    onClose,
    onDeleted,
}: {
    dept: Department;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setDeleting(true);
        setError(null);
        try {
            await deleteDepartment(dept.id);
            onDeleted();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to delete department");
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[380px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden p-6 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-red-500">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                    </svg>
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">Delete Department</h2>
                <p className="text-xs text-foreground/50 mb-4">This will permanently remove the department and may affect linked members and projects.</p>
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 text-left mb-5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-foreground/50">Department Name</span>
                        <span className="text-foreground/90 font-medium">{dept.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-foreground/50">Members</span>
                        <span className="text-foreground/90 font-medium">{dept.member_count ?? 0} members</span>
                    </div>
                </div>
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition">
                        {deleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ Bulk Delete Department Modal ============
function BulkDeleteDepartmentModal({
    count,
    onClose,
    onConfirm,
}: {
    count: number;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setDeleting(true);
        setError(null);
        try {
            await onConfirm();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to delete departments");
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[380px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden p-6 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-red-500">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                    </svg>
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">Delete {count} Departments</h2>
                <p className="text-xs text-foreground/50 mb-5">This will permanently remove the selected departments and may affect linked members and projects. This action cannot be undone.</p>
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition">
                        {deleting ? "Deleting..." : "Delete All"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ Bulk Selection Bar ============
function BulkSelectionBar({ count, onDelete, onClear }: { count: number; onDelete: () => void; onClear: () => void; }) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">{count}</span>
                <span className="text-xs font-medium text-foreground/80">
                    {count} department{count > 1 ? "s" : ""} selected
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

function DeptSkeleton() {
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="h-8 w-40 bg-foreground/10 rounded animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
                <div className="h-8 w-36 bg-foreground/10 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-foreground/10 rounded animate-pulse" />
            </div>
            <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="h-10 bg-foreground/5 border-b border-foreground/10" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 border-b border-foreground/5 px-4 flex items-center gap-4">
                        <div className="w-4 h-4 bg-foreground/10 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-foreground/10 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-foreground/10 rounded animate-pulse ml-8" />
                        <div className="h-4 w-8 bg-foreground/10 rounded animate-pulse ml-8" />
                        <div className="h-4 flex-1 bg-foreground/10 rounded animate-pulse ml-8" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============ Main Page ============
export default function DepartmentsPage() {
    const router = useRouter();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortByMembers, setSortByMembers] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modals
    const [membersModal, setMembersModal] = useState<Department | null>(null);
    const [projectsModal, setProjectsModal] = useState<Department | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [editModal, setEditModal] = useState<Department | null>(null);
    const [deleteModal, setDeleteModal] = useState<Department | null>(null);
    const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

    // Toast
    const [toastMsg, setToastMsg] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const showToast = useCallback((message: string, type: "success" | "error" = "success") => setToastMsg({ message, type }), []);

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map(id => deleteDepartment(id)));
        setSelectedIds(new Set());
        setBulkDeleteModal(false);
        fetchDepartments();
        showToast(`Successfully deleted ${ids.length} department${ids.length > 1 ? 's' : ''}`);
    };

    const fetchDepartments = useCallback(() => {
        const token = getToken();
        if (!token) {
            router.push("/login?redirect=/departments");
            return;
        }
        setLoading(true);
        getDepartments({ limit: 200 })
            .then((data) => {
                setDepartments(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Departments fetch error:", err);
                if (err?.status === 401 || err?.message?.includes("Not authenticated")) {
                    router.push("/login?redirect=/departments");
                    return;
                }
                setError("Failed to load departments");
                setLoading(false);
            });
    }, [router]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    // Filtering & sorting
    let filtered = departments.filter((d) => {
        if (!searchTerm) return true;
        return d.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
    if (sortByMembers) {
        filtered = [...filtered].sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0));
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filtered.map((d) => d.id)));
    };
    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };

    if (loading) return <DeptSkeleton />;

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-foreground/60 text-sm">{error}</p>
                    <button onClick={fetchDepartments} className="mt-4 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">
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
                <h1 className="text-2xl font-bold text-foreground">Departments</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setAddModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 active:scale-95 transition"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add Department
                    </button>
                </div>
            </div>

            {/* How It Works */}
            <HowItWorks
                pageKey="departments"
                color="amber"
                description="Departments lets you organise employees into company divisions, view their projects, and manage headcount at a glance."
                bullets={[
                    "Click Add Department to create a new division with a name and description.",
                    "Click any row to open the department's details page.",
                    "Click the ⋯ menu to view all members or see all projects handled by that department.",
                    "Use the Sort By No. of Members button to order departments by headcount.",
                ]}
            />
            
            {/* Bulk Selection Bar — shown when 1+ selected */}
            {selectedIds.size > 0 && (
                <BulkSelectionBar
                    count={selectedIds.size}
                    onDelete={() => setBulkDeleteModal(true)}
                    onClear={() => setSelectedIds(new Set())}
                />
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Sort chip */}
                    <button
                        onClick={() => setSortByMembers(!sortByMembers)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${sortByMembers
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-transparent text-foreground/70 border-foreground/20 hover:border-foreground/40"
                            }`}
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Sort By No. of Members
                        {sortByMembers && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2">
                    {searchOpen && (
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search departments..."
                            autoFocus
                            className="w-52 border border-foreground/15 rounded-lg px-3 py-1.5 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-blue-500/40 transition"
                        />
                    )}
                    <button
                        onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchTerm(""); }}
                        className="text-foreground/50 hover:text-foreground transition flex items-center gap-1 text-xs"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02]">
                {/* Header row */}
                <div className="grid grid-cols-[40px_1fr_180px_100px_1fr_48px] items-center px-4 py-3 border-b border-foreground/10 text-xs font-semibold text-foreground/40 uppercase tracking-wider">
                    <div>
                        <input
                            type="checkbox"
                            checked={filtered.length > 0 && selectedIds.size === filtered.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-foreground/30 accent-blue-600"
                        />
                    </div>
                    <div>Department Name</div>
                    <div>Manager Name</div>
                    <div>Members</div>
                    <div>Description</div>
                    <div />
                </div>

                {/* Rows */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="text-foreground/15 mb-4">
                            <rect x="2" y="7" width="20" height="14" rx="2" />
                            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                            <line x1="12" y1="12" x2="12" y2="16" />
                            <line x1="10" y1="14" x2="14" y2="14" />
                        </svg>
                        <p className="text-sm font-semibold text-foreground/60">Add employees to get started</p>
                        <p className="text-xs text-foreground/35 mt-1.5 max-w-xs">
                            Add employees to manage roles, departments, and responsibilities across your organization efficiently.
                        </p>
                    </div>
                ) : (
                    filtered.map((dept) => {
                        const primaryManager = dept.managers.find((m) => m.is_primary) ?? dept.managers[0];
                        return (
                            <div
                                key={dept.id}
                                className="grid grid-cols-[40px_1fr_180px_100px_1fr_48px] items-center px-4 py-3.5 border-b border-foreground/5 hover:bg-foreground/[0.03] transition group cursor-pointer"
                                onClick={() => router.push(`/departments/${dept.id}`)}
                            >
                                <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(dept.id)}
                                        onChange={() => toggleSelect(dept.id)}
                                        className="w-4 h-4 rounded border-foreground/30 accent-blue-600"
                                    />
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span
                                        className="w-7 h-7 rounded-lg text-[10px] flex items-center justify-center text-white font-bold shrink-0"
                                        style={{ background: avatarBg(dept.name) }}
                                    >
                                        {getInitials(dept.name)}
                                    </span>
                                    <span className="text-sm font-medium text-foreground/90">{dept.name}</span>
                                </div>
                                <div className="text-sm text-foreground/70">
                                    {primaryManager?.employee_name ?? "—"}
                                </div>
                                <div className="text-sm text-foreground/70">
                                    {dept.member_count ?? 0}
                                </div>
                                <div className="text-xs text-foreground/50 line-clamp-2 pr-4">
                                    {dept.notes || "—"}
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <RowMenu
                                        dept={dept}
                                        onViewDetails={() => router.push(`/departments/${dept.id}`)}
                                        onViewMembers={() => setMembersModal(dept)}
                                        onViewProjects={() => setProjectsModal(dept)}
                                        onEdit={() => setEditModal(dept)}
                                        onDelete={() => setDeleteModal(dept)}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modals */}
            {membersModal && (
                <MembersModal dept={membersModal} onClose={() => setMembersModal(null)} />
            )}
            {projectsModal && (
                <ProjectsModal dept={projectsModal} onClose={() => setProjectsModal(null)} />
            )}
            {addModal && (
                <AddDepartmentModal
                    onClose={() => setAddModal(false)}
                    onCreated={() => { fetchDepartments(); showToast("Department created successfully"); }}
                />
            )}
            {editModal && (
                <EditDepartmentModal
                    dept={editModal}
                    onClose={() => setEditModal(null)}
                    onSaved={() => { fetchDepartments(); showToast("Department updated successfully"); }}
                />
            )}
            {deleteModal && (
                <DeleteDepartmentModal
                    dept={deleteModal}
                    onClose={() => setDeleteModal(null)}
                    onDeleted={() => { fetchDepartments(); showToast("Department deleted successfully"); }}
                />
            )}
            {bulkDeleteModal && (
                <BulkDeleteDepartmentModal
                    count={selectedIds.size}
                    onClose={() => setBulkDeleteModal(false)}
                    onConfirm={handleBulkDelete}
                />
            )}
            {toastMsg && (
                <Toast message={toastMsg.message} type={toastMsg.type} onDone={() => setToastMsg(null)} />
            )}
        </div>
    );
}
