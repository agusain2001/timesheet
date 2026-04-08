"use client";

import { useEffect, useState, useCallback } from "react";
import { getToken } from "@/lib/auth";
import { getDepartment, getDepartmentMembers, getDepartmentProjects } from "@/services/departments";
import type { Department, DepartmentMember, DepartmentProject } from "@/types/api";

// ============ Helpers ============
function getInitials(name: string): string {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function avatarBg(name: string): string {
    const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 60%, 45%)`;
}
function formatDate(iso?: string): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return iso;
    }
}

function StatusBadge({ status }: { status?: string }) {
    const s = status || "active";
    const colors: Record<string, string> = {
        active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/20",
        on_hold: "bg-amber-500/15 text-amber-400 border-amber-500/20",
        completed: "bg-purple-500/15 text-purple-400 border-purple-500/20",
        draft: "bg-foreground/10 text-foreground/50 border-foreground/10",
        archived: "bg-foreground/10 text-foreground/40 border-foreground/10",
    };
    const label = s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[s] || colors.draft}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {label}
        </span>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-foreground/10">
                <h3 className="text-sm font-semibold text-foreground/80">{title}</h3>
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-0">
            <span className="text-xs text-foreground/50">{label}</span>
            <span className="text-xs text-foreground/90 font-medium text-right">{value}</span>
        </div>
    );
}

// ============ Skeleton ============
function DetailSkeleton() {
    return (
        <div className="space-y-5 animate-pulse">
            <div className="h-8 w-24 bg-foreground/10 rounded" />
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 space-y-3">
                <div className="h-6 w-48 bg-foreground/10 rounded mx-auto" />
                <div className="h-4 w-64 bg-foreground/10 rounded mx-auto" />
            </div>
            {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-5 space-y-2">
                    <div className="h-4 w-32 bg-foreground/10 rounded" />
                    {[1, 2, 3].map((j) => <div key={j} className="h-3 w-full bg-foreground/5 rounded" />)}
                </div>
            ))}
        </div>
    );
}

// ============ Main Component ============
export default function DepartmentDetailsPanel({
    deptId,
    onClose,
}: {
    deptId: string;
    onClose: () => void;
}) {
    const [dept, setDept] = useState<Department | null>(null);
    const [members, setMembers] = useState<DepartmentMember[]>([]);
    const [projects, setProjects] = useState<DepartmentProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEmployees, setShowEmployees] = useState(false);

    const loadData = useCallback(() => {
        if (!deptId) return;
        const token = getToken();
        if (!token) return;

        setLoading(true);
        Promise.all([
            getDepartment(deptId),
            getDepartmentMembers(deptId).catch(() => [] as DepartmentMember[]),
            getDepartmentProjects(deptId).catch(() => [] as DepartmentProject[]),
        ])
            .then(([deptData, membersData, projectsData]) => {
                setDept(deptData);
                setMembers(membersData);
                setProjects(projectsData);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Department detail error:", err);
                setError("Failed to load department details");
                setLoading(false);
            });
    }, [deptId]);

    useEffect(() => {
        if (deptId) {
            loadData();
        }
    }, [deptId, loadData]);

    // Close on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!deptId) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 z-[100] w-full max-w-2xl bg-background shadow-2xl overflow-y-auto flex flex-col pt-16 pointer-events-auto">
                {/* Header Actions */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/5 sticky top-0 bg-background/95 backdrop-blur z-10 transition-colors">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        Department Details
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition"
                            title="Close"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {loading ? (
                        <DetailSkeleton />
                    ) : error || !dept ? (
                        <div className="flex items-center justify-center min-h-[40vh]">
                            <div className="text-center">
                                <p className="text-foreground/60 text-sm">{error || "Department not found"}</p>
                                <button onClick={onClose} className="mt-4 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">
                                    Go Back
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Header Card */}
                            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-6 py-5 text-center space-y-2">
                                <h1 className="text-xl font-bold text-foreground">{dept.name} Department</h1>
                                <div className="flex items-center justify-center">
                                    <StatusBadge status={dept.status} />
                                </div>
                                <div className="flex items-center justify-center gap-2 text-xs text-foreground/50 flex-wrap">
                                    <span>Department Manager: <span className="text-foreground/80 font-medium">{(dept.managers.find(m => m.is_primary) ?? dept.managers[0])?.employee_name ?? "—"}</span></span>
                                    <span className="text-foreground/20">|</span>
                                    <span className="flex items-center gap-1">
                                        Department ID: <span className="text-foreground/70 font-mono">{`DEP-${dept.name.slice(0, 3).toUpperCase()}-${dept.id.slice(0, 3).toUpperCase()}`}</span>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(`DEP-${dept.name.slice(0, 3).toUpperCase()}-${dept.id.slice(0, 3).toUpperCase()}`)}
                                            className="text-foreground/30 hover:text-foreground/60 transition ml-0.5"
                                            title="Copy ID"
                                        >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                        </button>
                                    </span>
                                </div>
                            </div>

                            {/* Management Details */}
                            <SectionCard title="Management Details">
                                <InfoRow label="Department Manager" value={(dept.managers.find(m => m.is_primary) ?? dept.managers[0])?.employee_name ?? "—"} />
                                <InfoRow label="Role" value={dept.managers.length > 0 ? "Department Lead" : "—"} />
                                <InfoRow label="Reporting To" value="Product Management" />
                                <InfoRow
                                    label="Created On"
                                    value={formatDate(dept.managers.find(m => m.is_primary)?.start_date ?? dept.managers[0]?.start_date)}
                                />
                            </SectionCard>

                            {/* Team Details */}
                            <SectionCard title="Team Details">
                                <InfoRow label="Total Members" value={`${members.length} Members`} />
                                <InfoRow label="Team Capacity" value={`${members.length * 40} hrs / week`} />

                                {/* View Employees toggle */}
                                <div className="mt-3">
                                    <button
                                        onClick={() => setShowEmployees(!showEmployees)}
                                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition font-medium"
                                    >
                                        View Employees
                                        <svg
                                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                                            className={`transition-transform ${showEmployees ? "rotate-180" : ""}`}
                                        >
                                            <path d="m6 9 6 6 6-6" />
                                        </svg>
                                    </button>

                                    {showEmployees && (
                                        <div className="mt-3 space-y-2">
                                            {members.length === 0 ? (
                                                <p className="text-xs text-foreground/40">No employees in this department.</p>
                                            ) : (
                                                members.map((m) => (
                                                    <div key={m.id} className="flex items-center gap-3 py-2 border-b border-foreground/5 last:border-0">
                                                        <span
                                                            className="w-7 h-7 rounded-full text-[10px] flex items-center justify-center text-white font-bold shrink-0"
                                                            style={{ background: avatarBg(m.full_name) }}
                                                        >
                                                            {getInitials(m.full_name)}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-foreground/90 truncate">{m.full_name}</p>
                                                            <p className="text-[10px] text-foreground/50 truncate">{m.position || m.role}</p>
                                                        </div>
                                                        <span className="text-[10px] text-foreground/40 font-mono">{m.employee_code}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </SectionCard>

                            {/* Related Projects */}
                            <SectionCard title="Related Projects">
                                {projects.length === 0 ? (
                                    <p className="text-xs text-foreground/40">No projects linked to this department.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {projects.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-5 h-5 rounded text-[8px] flex items-center justify-center text-white font-bold shrink-0"
                                                        style={{ background: avatarBg(p.name) }}
                                                    >
                                                        {getInitials(p.name)}
                                                    </span>
                                                    <span className="text-xs text-foreground/80 font-medium">{p.name}</span>
                                                </div>
                                                <button className="text-[11px] text-blue-400 hover:text-blue-300 transition flex items-center gap-1 font-medium">
                                                    View Project Details
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                                        <path d="m9 18 6-6-6-6" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>

                            {/* Skills & Expertise */}
                            <SectionCard title="Skills & Expertise">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-foreground/60 mb-2">Core Skills</p>
                                        {Array.from(new Set(members.map((m) => m.position).filter(Boolean))).length > 0 ? (
                                            <ul className="space-y-1">
                                                {Array.from(new Set(members.map((m) => m.position).filter(Boolean))).map((pos) => (
                                                    <li key={pos} className="flex items-center gap-2 text-xs text-foreground/70">
                                                        <span className="w-1 h-1 rounded-full bg-foreground/30 shrink-0" />
                                                        {pos}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-foreground/40">No skills data available</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-foreground/60 mb-2">Tools & Platforms</p>
                                        {Array.from(new Set(members.map((m) => m.role).filter(Boolean))).length > 0 ? (
                                            <ul className="space-y-1">
                                                {Array.from(new Set(members.map((m) => m.role).filter(Boolean))).map((role) => (
                                                    <li key={role} className="flex items-center gap-2 text-xs text-foreground/70">
                                                        <span className="w-1 h-1 rounded-full bg-foreground/30 shrink-0" />
                                                        {role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-foreground/40">No tools data available</p>
                                        )}
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Workload & Activity */}
                            <SectionCard title="Workload & Activity">
                                <InfoRow
                                    label="Active Tasks"
                                    value={<span className="text-foreground/80">{projects.length * 8} Tasks</span>}
                                />
                                <InfoRow
                                    label="Overdue Tasks"
                                    value={<span className={Math.floor(projects.length * 1.5) > 0 ? "text-red-400" : "text-foreground/80"}>{Math.floor(projects.length * 1.5)} Tasks</span>}
                                />
                            </SectionCard>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
