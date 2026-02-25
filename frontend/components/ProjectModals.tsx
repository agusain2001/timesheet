"use client";

import { useState, useEffect } from "react";
import { createProject, updateProject } from "@/services/projects";
import { getClients } from "@/services/clients";
import type { Project, ProjectCreate, ProjectUpdate, ProjectStatus } from "@/services/projects";
import type { Client } from "@/types/api";

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls = "w-full border border-foreground/15 rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-blue-500/50 transition";
const selectCls = inputCls + " cursor-pointer";

// ─── Project Form ─────────────────────────────────────────────────────────────
interface ProjectFormData {
    name: string;
    status: ProjectStatus;
    client_id: string;
    business_sector: string;
    start_date: string;
    end_date: string;
    notes: string;
}

const EMPTY_FORM: ProjectFormData = {
    name: "", status: "active", client_id: "", business_sector: "", start_date: "", end_date: "", notes: "",
};

const SECTORS = ["Pharmacy", "Technology", "Finance", "Healthcare", "Education", "Manufacturing", "Retail", "Other"];
const STATUSES: { value: ProjectStatus; label: string }[] = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
    { value: "archived", label: "Archived" },
];

function ProjectFormBody({ form, setForm, clients }: { form: ProjectFormData; setForm: (f: ProjectFormData) => void; clients: Client[] }) {
    const upd = (key: keyof ProjectFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm({ ...form, [key]: e.target.value });

    return (
        <div className="space-y-5 px-6 py-4 overflow-y-auto max-h-[65vh]">
            <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-3">Project Basics</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Project Name" required>
                        <input className={inputCls} value={form.name} onChange={upd("name")} placeholder="Enter Project Name" />
                    </Field>
                    <Field label="Status">
                        <select className={selectCls} value={form.status} onChange={upd("status")}>
                            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Project ID">
                        <input className={inputCls + " opacity-50 cursor-not-allowed"} value="**Auto-generated**" readOnly />
                    </Field>
                    <Field label="Client Name">
                        <select className={selectCls} value={form.client_id} onChange={upd("client_id")}>
                            <option value="">Select Client</option>
                            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </Field>
                </div>
            </div>
            <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-3">Project Overview</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Business Sector">
                        <select className={selectCls} value={form.business_sector} onChange={upd("business_sector")}>
                            <option value="">Select Sector</option>
                            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <div />
                    <Field label="Start Date">
                        <input type="date" className={inputCls} value={form.start_date} onChange={upd("start_date")} />
                    </Field>
                    <Field label="Expected End Date">
                        <input type="date" className={inputCls} value={form.end_date} onChange={upd("end_date")} />
                    </Field>
                    <div className="col-span-2">
                        <Field label="Description (Optional)">
                            <textarea className={inputCls + " resize-none"} rows={3} value={form.notes} onChange={upd("notes")} placeholder="Some information to be noted related to Project" />
                        </Field>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Add Project Modal ────────────────────────────────────────────────────────
export function AddProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void; }) {
    const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM);
    const [clients, setClients] = useState<Client[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getClients().then(setClients).catch(() => { });
    }, []);

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError("Project name is required."); return; }
        setSaving(true); setError(null);
        try {
            const data: ProjectCreate = {
                name: form.name.trim(),
                status: form.status,
                client_id: form.client_id || undefined,
                notes: form.notes.trim() || undefined,
                start_date: form.start_date || undefined,
                end_date: form.end_date || undefined,
            };
            await createProject(data);
            onCreated(); onClose();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to create project");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-[560px] rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-foreground/10">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Add Project</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">Create and manage project information, tasks, and team details. The manager will be automatically notified.</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <ProjectFormBody form={form} setForm={setForm} clients={clients} />
                {error && <p className="px-6 pb-2 text-xs text-red-400">{error}</p>}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Discard</button>
                    <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-1.5">
                        {saving ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Saving...</> : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Project Modal ───────────────────────────────────────────────────────
export function EditProjectModal({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: () => void; }) {
    const [clients, setClients] = useState<Client[]>([]);
    const [form, setForm] = useState<ProjectFormData>({
        name: project.name ?? "",
        status: project.status ?? "active",
        client_id: project.client_id ?? "",
        business_sector: "",
        start_date: project.start_date ?? "",
        end_date: project.end_date ?? "",
        notes: project.notes ?? "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getClients().then(setClients).catch(() => { });
    }, []);

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Project name is required."); return; }
        setSaving(true); setError(null);
        try {
            const data: ProjectUpdate = {
                name: form.name.trim(),
                status: form.status,
                client_id: form.client_id || undefined,
                notes: form.notes.trim() || undefined,
                start_date: form.start_date || undefined,
                end_date: form.end_date || undefined,
            };
            await updateProject(project.id, data);
            onSaved(); onClose();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to update project");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-[560px] rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-foreground/10">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Edit Project</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">Edit team information, projects, and billing details. The manager will be informed about the changes you have done.</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <ProjectFormBody form={form} setForm={setForm} clients={clients} />
                {error && <p className="px-6 pb-2 text-xs text-red-400">{error}</p>}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Discard</button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-1.5">
                        {saving ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Saving...</> : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
