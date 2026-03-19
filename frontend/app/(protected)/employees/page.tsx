"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getToken } from "@/lib/auth";
import { getUsers, getUserProjects, exportUsers, updateUser, deleteUser, createUser, type UsersParams, type UserProject } from "@/services/users";
import { getDepartments } from "@/services/departments";
import type { User, Department } from "@/types/api";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { validateSafeText } from "@/utils/validation";

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
            <div className="w-full max-w-3xl bg-[#1e1e1e] border border-foreground/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10 bg-[#1e1e1e]">
                    <div>
                        <h3 className="text-lg font-bold text-white">Related Projects</h3>
                        <p className="text-xs text-white/50">All projects associated with this employee are listed below for quick access and management.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 text-white/50 hover:text-white hover:bg-foreground/[0.05] transition">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 bg-[#1a1a1a]">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-foreground/[0.02] rounded animate-pulse" />)}
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-foreground/[0.02] flex items-center justify-center text-white/20">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                            </div>
                            <div className="text-white/40 text-sm">No related projects found.</div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-foreground/10 overflow-hidden">
                            <table className="w-full text-left text-sm text-white/80">
                                <thead className="bg-foreground/[0.02] text-xs text-white/40 uppercase font-semibold">
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
                                        <tr key={p.id} className="hover:bg-foreground/[0.02] transition group">
                                            <td className="px-5 py-3 font-medium text-white">{p.name}</td>
                                            <td className="px-5 py-3">{p.role === "Manager" ? user.full_name : "Other"}</td>
                                            <td className="px-5 py-3 text-white/60">{p.business_sector}</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border
                                                    ${p.status === 'active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-foreground/[0.02] text-white/50 border-foreground/10'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-blue-400' :
                                                        p.status === 'completed' ? 'bg-emerald-400' :
                                                            'bg-white/40'}`}></span>
                                                    <span className="capitalize">{p.status}</span>
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button className="text-[10px] px-2 py-1 rounded border border-foreground/10 hover:bg-foreground/[0.05] hover:text-white text-white/40 transition opacity-0 group-hover:opacity-100">
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
            <div className="w-[400px] bg-[#1a1a1a] border border-foreground/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-4 right-4">
                    <button onClick={onClose} className="text-white/30 hover:text-white transition rounded-full p-1 hover:bg-foreground/[0.05]">
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
                            className="w-full appearance-none bg-[#252525] border border-foreground/10 rounded-lg py-3 px-4 text-sm text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition cursor-pointer"
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

// ─── Invite Modal ──────────────────────────────────────────────────────────────────────
function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleInvite = async () => {
        if (!email.trim()) { setError("Email is required"); return; }
        setSaving(true); setError("");
        try {
            const token = getToken();
            const res = await fetch("/api/advanced/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email: email.trim(), role }),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Failed to send invite"); }
            onDone(`Invite sent to ${email}`);
            onClose();
        } catch (e: any) { setError(e?.message); }
        finally { setSaving(false); }
    };

    const cls = "w-full px-3 py-2.5 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-blue-500/50";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-background border border-foreground/10 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-foreground/10">
                    <h2 className="font-semibold text-foreground">Invite User</h2>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                    <div>
                        <label className="block text-xs text-foreground/50 mb-1">Email Address *</label>
                        <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleInvite()} placeholder="colleague@company.com" className={cls} />
                    </div>
                    <div>
                        <label className="block text-xs text-foreground/50 mb-1">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className={cls}>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-5 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/50 hover:text-foreground">Cancel</button>
                    <button onClick={handleInvite} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
                        {saving ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={.25} /><path d="M21 12a9 9 0 00-9-9" /></svg> : null}
                        Send Invite
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Bulk Upload Modal ──────────────────────────────────────────────────────────────────────
function BulkUploadModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const handleUpload = async () => {
        if (!file) { setError("Please select a CSV file"); return; }
        setUploading(true); setError("");
        try {
            const token = getToken();
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/advanced/bulk-create-users", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || "Upload failed");
            onDone(`Uploaded ${data.created ?? "?"} users successfully`);
            onClose();
        } catch (e: any) { setError(e?.message); }
        finally { setUploading(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-background border border-foreground/10 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-foreground/10">
                    <h2 className="font-semibold text-foreground">Bulk Upload Employees</h2>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                    <div className="rounded-xl border-2 border-dashed border-foreground/10 p-6 text-center">
                        <svg className="w-8 h-8 text-foreground/30 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
                        <p className="text-xs text-foreground/50 mb-3">Select a CSV file with columns: full_name, email, role, department</p>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/5 border border-foreground/10 text-xs text-foreground/70 hover:bg-foreground/10 transition">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            {file ? file.name : "Choose CSV file"}
                            <input type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                        </label>
                    </div>
                    <p className="text-[10px] text-foreground/30">Tip: Download a sample CSV template if needed. Max 500 rows per upload.</p>
                </div>
                <div className="flex justify-end gap-3 p-5 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-foreground/50 hover:text-foreground">Cancel</button>
                    <button onClick={handleUpload} disabled={uploading || !file}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
                        {uploading ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={.25} /><path d="M21 12a9 9 0 00-9-9" /></svg> : null}
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────
function AddEmployeeModal({
    departments,
    onClose,
    onCreated,
}: {
    departments: Department[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const [form, setForm] = useState({
        full_name: "",
        email: "",
        password: "",
        position: "",
        department_id: "",
        role: "employee",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const valErr = validateSafeText(form.full_name, "Full Name", 100);
        if (valErr) { setError(valErr); return; }
        if (!form.email.trim()) { setError("Email is required."); return; }
        if (!form.password || form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
        setSaving(true); setError(null);
        try {
            await createUser({
                full_name: form.full_name.trim(),
                email: form.email.trim(),
                password: form.password,
                position: form.position.trim() || undefined,
                department_id: form.department_id || undefined,
                role: form.role || "employee",
            });
            onCreated();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create employee");
            setSaving(false);
        }
    };

    const inp = "w-full border border-foreground/15 rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-blue-500/50 transition";

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[500px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-foreground/10">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Add New Employee</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">Create a new employee account in the workspace.</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
                    {/* Error Banner */}
                    {error && (
                        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-medium text-foreground/70">Full Name <span className="text-red-400">*</span></label>
                            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoFocus className={inp} placeholder="e.g. John Doe" />
                            <p className="text-[10px] text-foreground/40 mt-1">Only letters, numbers, spaces and basic punctuation (- &apos; . ) are allowed.</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground/70">Email <span className="text-red-400">*</span></label>
                            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} placeholder="john@company.com" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground/70">Password <span className="text-red-400">*</span></label>
                            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inp} placeholder="Min 6 characters" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground/70">Position</label>
                            <input type="text" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inp} placeholder="e.g. Software Engineer" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground/70">Role</label>
                            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inp + " cursor-pointer"}>
                                <option value="employee">Employee</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-medium text-foreground/70">Department</label>
                            <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className={inp + " cursor-pointer"}>
                                <option value="">Select Department</option>
                                {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-1.5">
                            {saving ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Creating...</> : "Add Employee"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Edit Employee Modal ───────────────────────────────────────────────────────
function EditEmployeeModal({
    employee,
    departments,
    onClose,
    onSaved,
}: {
    employee: User;
    departments: Department[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState({
        full_name: employee.full_name ?? "",
        position: employee.position ?? "",
        department_id: employee.department_id ?? "",
        phone: (employee as any).phone ?? "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const valErr = validateSafeText(form.full_name, "Full Name", 100);
        if (valErr) { setError(valErr); return; }
        
        setSaving(true); setError(null);
        try {
            await updateUser(employee.id, {
                full_name: form.full_name.trim(),
                position: form.position.trim() || undefined,
                department_id: form.department_id || undefined,
            });
            onSaved();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update employee");
            setSaving(false);
        }
    };

    const inp = "w-full border border-foreground/15 rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-blue-500/50 transition";

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[460px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-foreground/10">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Edit Employee</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">Update employee details and department assignment.</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
                    {/* Error Banner */}
                    {error && (
                        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground/70">Full Name <span className="text-red-400">*</span></label>
                        <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoFocus className={inp} placeholder="Employee full name" />
                        <p className="text-[10px] text-foreground/40 mt-1">Only letters, numbers, spaces and basic punctuation (- &apos; . ) are allowed.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground/70">Position</label>
                            <input type="text" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inp} placeholder="e.g. Software Engineer" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground/70">Department</label>
                            <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className={inp + " cursor-pointer"}>
                                <option value="">Select Department</option>
                                {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                            </select>
                        </div>
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

// ─── Delete Employee Modal ────────────────────────────────────────────────────
function DeleteEmployeeModal({
    employee,
    onClose,
    onDeleted,
}: {
    employee: User;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setDeleting(true); setError(null);
        try {
            await deleteUser(employee.id);
            onDeleted();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to delete employee");
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[380px] rounded-2xl border border-foreground/10 bg-background shadow-2xl mx-4 p-6 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-red-500">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">Remove Employee</h2>
                <p className="text-xs text-foreground/50 mb-4">This will permanently remove the employee from the workspace and all linked data.</p>
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 text-left mb-5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-foreground/50">Name</span>
                        <span className="text-foreground/90 font-medium">{employee.full_name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-foreground/50">Email</span>
                        <span className="text-foreground/90 font-medium">{employee.email}</span>
                    </div>
                </div>
                {error && (
                    <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3 text-left">
                        {error}
                    </div>
                )}
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition">
                        {deleting ? "Removing..." : "Remove"}
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
    const [editUser_, setEditUser] = useState<User | null>(null);
    const [deleteUser_, setDeleteUser_] = useState<User | null>(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showAddEmployee, setShowAddEmployee] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const showToast = useCallback((message: string, type: "success" | "error" = "success") => setToast({ message, type }), []);

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
    const [menuOpenAbove, setMenuOpenAbove] = useState(false);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="space-y-5 min-h-full bg-background text-foreground">
            {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">View Employees</h1>
                    <div className="flex items-center gap-2 text-xs text-foreground/50 mt-1">
                        <span>Home</span>
                        <span>/</span>
                        <span>View Employees</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setExportOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Export ({selectedIds.size})
                        </button>
                    )}
                    <button onClick={() => setShowBulkUpload(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground/70 text-xs font-medium hover:bg-foreground/10 transition">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Bulk Upload
                    </button>
                    <button onClick={() => setShowInvite(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground/70 text-xs font-medium hover:bg-foreground/10 transition">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                        Invite User
                    </button>
                    <button onClick={() => setShowAddEmployee(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                        Add Employee
                    </button>
                </div>
            </div>

            {/* How It Works */}
            <HowItWorks
                pageKey="employees"
                color="green"
                description="Employees shows all users in your workspace — view their profiles, department, position, and related projects."
                bullets={[
                    "Click the ⋯ menu on any row to view details or see related projects.",
                    "Select employees with checkboxes then click Export to download as CSV or Excel.",
                    "Click Invite User to send an email invitation to a new team member.",
                    "Use Bulk Upload to add multiple employees at once via a CSV file.",
                ]}
            />

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
                                        <button onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMenuOpenAbove(window.innerHeight - rect.bottom < 220);
                                            setMenuOpen(menuOpen === user.id ? null : user.id);
                                        }} className="text-foreground/40 hover:text-foreground transition p-1 rounded-md hover:bg-foreground/10">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {menuOpen === user.id && (
                                            <div ref={menuRef} className={`absolute right-0 ${menuOpenAbove ? "bottom-full mb-1" : "top-full mt-1"} w-44 rounded-xl border border-foreground/10 bg-background shadow-2xl py-1 z-20`}>
                                                <button onClick={() => { setSelectedUser(user); setMenuOpen(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-foreground/5 text-foreground/80 transition">View Details</button>
                                                <button onClick={() => { setRelatedProjectsUser(user); setMenuOpen(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-foreground/5 text-foreground/80 transition">Related Projects</button>
                                                <div className="border-t border-foreground/8 my-1" />
                                                <button onClick={() => { setEditUser(user); setMenuOpen(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-foreground/5 text-foreground/80 transition">Edit Employee</button>
                                                <button onClick={() => { setDeleteUser_(user); setMenuOpen(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-red-500/10 text-red-500 transition">Remove Employee</button>
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
            {/* Add Employee Modal */}
            {showAddEmployee && (
                <AddEmployeeModal
                    departments={departments}
                    onClose={() => setShowAddEmployee(false)}
                    onCreated={() => { loadData(); showToast("Employee added successfully"); }}
                />
            )}
            {/* Invite Modal */}
            {showInvite && (
                <InviteModal onClose={() => setShowInvite(false)} onDone={(msg) => { showToast(msg); }} />
            )}
            {/* Bulk Upload Modal */}
            {showBulkUpload && (
                <BulkUploadModal onClose={() => setShowBulkUpload(false)} onDone={(msg) => { showToast(msg); }} />
            )}
            {/* Edit Employee Modal */}
            {editUser_ && (
                <EditEmployeeModal
                    employee={editUser_}
                    departments={departments}
                    onClose={() => setEditUser(null)}
                    onSaved={() => { loadData(); showToast("Employee updated successfully"); }}
                />
            )}
            {/* Delete Employee Modal */}
            {deleteUser_ && (
                <DeleteEmployeeModal
                    employee={deleteUser_}
                    onClose={() => setDeleteUser_(null)}
                    onDeleted={() => { loadData(); showToast("Employee removed successfully"); }}
                />
            )}
        </div>
    );
}
