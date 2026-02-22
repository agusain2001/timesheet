"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getToken } from "@/lib/auth";
import { getUsers, getUserProjects, exportUsers, type UsersParams, type UserProject } from "@/services/users";
import { getDepartments } from "@/services/departments";
import type { User, Department } from "@/types/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function avatarBg(name: string) {
    const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 60%, 45%)`;
}
function shortId(id: string) { return id.slice(0, 8).toUpperCase(); }

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
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 border-b border-foreground/5 px-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-foreground/10 animate-pulse" />
                        <div className="h-4 w-32 bg-foreground/10 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-foreground/10 rounded animate-pulse ml-auto" />
                        <div className="h-4 w-24 bg-foreground/10 rounded animate-pulse ml-4" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Employee Details Panel ───────────────────────────────────────────────────
function EmployeeDetailsPanel({ employee, departments, onClose }: { employee: User; departments: Department[]; onClose: () => void }) {
    const deptName = departments.find(d => d.id === employee.department_id)?.name || "—";

    const row = (label: string, value?: string) => (
        <div className="flex justify-between py-2 border-b border-foreground/5 last:border-0">
            <span className="text-xs text-foreground/50">{label}</span>
            <span className="text-xs text-foreground/90 font-medium text-right max-w-[55%]">{value || "—"}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex" onClick={onClose}>
            <div className="flex-1" />
            <div className="w-full max-w-[400px] h-full bg-background border-l border-foreground/10 shadow-2xl overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/10 sticky top-0 bg-background z-10">
                    <button onClick={onClose} className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                        Go Back
                    </button>
                    <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center text-xs text-foreground/50">
                        {/* Placeholder for actions */}
                    </div>
                </div>

                <div className="flex flex-col items-center py-8 border-b border-foreground/10">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-3 shadow-lg" style={{ background: avatarBg(employee.full_name) }}>
                        {employee.avatar_url ? <img src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(employee.full_name)}
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{employee.full_name}</h2>
                    <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-500 border border-blue-500/20">
                        {employee.role || "Employee"}
                    </span>
                    <p className="text-xs text-foreground/50 mt-2 flex items-center gap-2">
                        <span>Department: {deptName}</span>
                        <span className="text-foreground/20">|</span>
                        <span className="font-mono">ID: {shortId(employee.id)}</span>
                    </p>
                </div>

                <div className="px-5 py-4 space-y-6">
                    <div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Employee Details</p>
                        {row("Designation", employee.position)}
                        {row("Employment Type", "Full-time")}
                        {/* Static data for visual completeness as per design */}
                        {row("Work Location", "Remote / Hybrid")}
                        {row("Last Activity", "Updated recently")}
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Work & Availability Information</p>
                        {row("Reporting Manager", "—")}
                        {row("Availability Status", "Available")}
                        {row("Working Hours", "9:00 AM – 5:00 PM")}
                        {row("Time Zone", "UTC")}
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Contact & Skills</p>
                        {row("Email", employee.email)}
                        {row("Phone", "—")}
                    </div>

                    <div className="rounded-xl bg-foreground/[0.02] border border-foreground/5 p-4">
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Related Projects</p>
                        <div className="text-xs text-foreground/50 text-center py-2">No active projects</div>
                        <div className="flex justify-end mt-2">
                            <button className="text-[10px] text-blue-500 hover:text-blue-400 flex items-center gap-1">
                                View Project Details <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Related Projects Modal ───────────────────────────────────────────────────
function RelatedProjectsModal({ user, onClose }: { user: User; onClose: () => void }) {
    const [projects, setProjects] = useState<UserProject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getUserProjects(user.id)
            .then(setProjects)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user.id]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-3xl bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1e1e1e]">
                    <div>
                        <h3 className="text-lg font-bold text-white">Related Projects</h3>
                        <p className="text-xs text-white/50">All projects associated with this employee are listed below for quick access and management.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 text-white/50 hover:text-white hover:bg-white/10 transition">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 bg-[#1a1a1a]">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)}
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                            </div>
                            <div className="text-white/40 text-sm">No related projects found.</div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-white/10 overflow-hidden">
                            <table className="w-full text-left text-sm text-white/80">
                                <thead className="bg-white/5 text-xs text-white/40 uppercase font-semibold">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">Project Name</th>
                                        <th className="px-5 py-3 font-medium">Managed By</th>
                                        <th className="px-5 py-3 font-medium">Business Sector</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-[#1e1e1e]">
                                    {projects.map((p) => (
                                        <tr key={p.id} className="hover:bg-white/5 transition group">
                                            <td className="px-5 py-3 font-medium text-white">{p.name}</td>
                                            <td className="px-5 py-3">{p.role === "Manager" ? user.full_name : "Other"}</td>
                                            <td className="px-5 py-3 text-white/60">{p.business_sector}</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border
                                                    ${p.status === 'active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-white/5 text-white/50 border-white/10'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-blue-400' :
                                                        p.status === 'completed' ? 'bg-emerald-400' :
                                                            'bg-white/40'}`}></span>
                                                    <span className="capitalize">{p.status}</span>
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button className="text-[10px] px-2 py-1 rounded border border-white/10 hover:bg-white/10 hover:text-white text-white/40 transition opacity-0 group-hover:opacity-100">
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Export Modal ─────────────────────────────────────────────────────────────
function ExportModal({ count, onClose, onExport }: { count: number; onClose: () => void; onExport: (format: "csv" | "excel") => void }) {
    const [format, setFormat] = useState<"csv" | "excel">("csv");

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-[400px] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-4 right-4">
                    <button onClick={onClose} className="text-white/30 hover:text-white transition rounded-full p-1 hover:bg-white/10">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 ring-4 ring-blue-500/5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">Export Selected Employees</h3>
                <p className="text-xs text-white/50 mb-6 px-4 leading-relaxed">Export the selected employee records for reporting or offline use. Choose a file format to continue.</p>

                <div className="w-full space-y-4">
                    <div className="relative group">
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value as any)}
                            className="w-full appearance-none bg-[#252525] border border-white/10 rounded-lg py-3 px-4 text-sm text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition cursor-pointer"
                        >
                            <option value="csv">CSV (.csv)</option>
                            <option value="excel">Excel (.xlsx)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none transition group-hover:text-white/70">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>
                        </div>
                    </div>
                    <p className="text-[10px] text-white/30 text-left -mt-2 ml-1">
                        {format === 'csv' ? 'CSV is recommended for large datasets.' : 'Excel is best for viewing and editing.'}
                    </p>

                    <button
                        onClick={() => onExport(format)}
                        className="w-full py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 transition shadow-lg shadow-white/5 active:scale-[0.98]"
                    >
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<string>("created_at");

    // UI States
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [relatedProjectsUser, setRelatedProjectsUser] = useState<User | null>(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersData, deptsData] = await Promise.all([
                getUsers({ search, sort_by: sortBy, sort_order: "asc" }), // Default asc for now
                getDepartments()
            ]);
            setUsers(usersData);
            setDepartments(deptsData);
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load employees", type: "error" });
        } finally {
            setLoading(false);
        }
    }, [search, sortBy]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300); // Debounce search
        return () => clearTimeout(timer);
    }, [loadData]);


    const toggleAll = () => {
        if (selectedIds.size === users.length && users.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(users.map(u => u.id)));
        }
    };

    const toggleOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleExport = async (format: "csv" | "excel") => {
        setExportOpen(false);
        if (selectedIds.size === 0) return;

        try {
            const blob = await exportUsers(Array.from(selectedIds), format as any);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `employees_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setToast({ message: "Export downloaded successfully", type: "success" });
            setSelectedIds(new Set()); // Clear selection
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to export employees", type: "error" });
        }
    };

    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="p-6 space-y-5 min-h-full bg-background text-foreground">
            {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">View Employees</h1>
                    <div className="flex items-center gap-2 text-xs text-foreground/50 mt-1">
                        <span>Home</span>
                        <span>/</span>
                        <span>View Employees</span>
                    </div>
                </div>
                {/* Export Button */}
                {selectedIds.size > 0 && (
                    <button
                        onClick={() => setExportOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 animate-in fade-in duration-200"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Export ({selectedIds.size})
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                            Sort By {sortBy === 'department' ? 'Department' : sortBy === 'position' ? 'Position' : 'Default'}
                        </button>
                        <div className="absolute left-0 top-full mt-2 w-40 bg-background border border-foreground/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-20">
                            <button onClick={() => setSortBy("department")} className="w-full text-left px-4 py-2 text-xs hover:bg-foreground/5">Department</button>
                            <button onClick={() => setSortBy("position")} className="w-full text-left px-4 py-2 text-xs hover:bg-foreground/5">Position</button>
                            <button onClick={() => setSortBy("created_at")} className="w-full text-left px-4 py-2 text-xs hover:bg-foreground/5">Date Added</button>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input
                        className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-foreground/15 bg-foreground/[0.03] text-foreground outline-none placeholder:text-foreground/30 focus:border-blue-500/50 transition w-64"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? <Skeleton /> : (
                <div className="rounded-xl border border-foreground/10 overflow-visible min-h-[400px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[40px_60px_1.5fr_1.5fr_1.5fr_1.5fr_40px] px-4 py-3 border-b border-foreground/10 bg-foreground/[0.02] text-[10px] font-semibold text-foreground/40 uppercase tracking-wider items-center">
                        <div><input type="checkbox" checked={users.length > 0 && selectedIds.size === users.length} onChange={toggleAll} className="rounded border-foreground/20" /></div>
                        <div>Profile</div>
                        <div>Employee Code</div>
                        <div>Employee Name</div>
                        <div>Department</div>
                        <div>Position</div>
                        <div></div>
                    </div>

                    {/* Table Body */}
                    {users.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center">
                                <svg className="text-foreground/20" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-bold text-foreground">Employees not added yet</h3>
                                <p className="text-xs text-foreground/50 max-w-[280px] mt-1">This section will display employee profiles, roles, and department details once they are set up.</p>
                            </div>
                        </div>
                    ) : (
                        users.map((user) => {
                            const dept = departments.find(d => d.id === user.department_id);
                            return (
                                <div key={user.id} className="grid grid-cols-[40px_60px_1.5fr_1.5fr_1.5fr_1.5fr_40px] px-4 py-3 border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.02] transition items-center relative group">
                                    <div><input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggleOne(user.id)} className="rounded border-foreground/20" /></div>
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden" style={{ background: avatarBg(user.full_name) }}>
                                            {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(user.full_name)}
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-foreground/60">{shortId(user.id)}</div>
                                    <div className="text-xs font-medium text-foreground">{user.full_name}</div>
                                    <div className="text-xs text-foreground/70">{dept ? dept.name : "—"}</div>
                                    <div className="text-xs text-foreground/70">{user.position || "—"}</div>

                                    {/* Action Menu Trigger */}
                                    <div className="relative">
                                        <button onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)} className="text-foreground/40 hover:text-foreground transition p-1 rounded-md hover:bg-foreground/10">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {menuOpen === user.id && (
                                            <div ref={menuRef} className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-foreground/10 bg-background shadow-2xl py-1 z-20">
                                                <button onClick={() => { setSelectedUser(user); setMenuOpen(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-foreground/5 text-foreground/80 transition">View Details</button>
                                                <button onClick={() => { setRelatedProjectsUser(user); setMenuOpen(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-foreground/5 text-foreground/80 transition">Related Projects</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Pagination Controls could go here */}

            {/* Details Panel */}
            {selectedUser && (
                <EmployeeDetailsPanel employee={selectedUser} departments={departments} onClose={() => setSelectedUser(null)} />
            )}

            {/* Related Projects Modal */}
            {relatedProjectsUser && (
                <RelatedProjectsModal user={relatedProjectsUser} onClose={() => setRelatedProjectsUser(null)} />
            )}

            {/* Export Modal */}
            {exportOpen && (
                <ExportModal count={selectedIds.size} onClose={() => setExportOpen(false)} onExport={handleExport} />
            )}
        </div>
    );
}
