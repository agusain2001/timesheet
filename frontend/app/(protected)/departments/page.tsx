"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
    getDepartments,
    getDepartmentMembers,
    getDepartmentProjects,
    createDepartment,
} from "@/services/departments";
import type { Department, DepartmentMember, DepartmentProject } from "@/types/api";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ============ Helpers ============
function getInitials(name: string): string {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function avatarBg(name: string): string {
    const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 60%, 45%)`;
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
}: {
    dept: Department;
    onViewDetails: () => void;
    onViewMembers: () => void;
    onViewProjects: () => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="w-7 h-7 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-foreground/10 bg-background shadow-2xl z-50 py-1 overflow-hidden">
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError("Department name is required."); return; }
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
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground/70">Department Name <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Engineering, Marketing..."
                            autoFocus
                            className="w-full border border-foreground/15 rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-blue-500/50 transition"
                        />
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

                    {error && (
                        <p className="text-xs text-red-400 flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </p>
                    )}

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
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
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
                    onCreated={fetchDepartments}
                />
            )}
        </div>
    );
}
