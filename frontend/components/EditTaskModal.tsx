"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiGet, apiPut } from "@/services/api";
import type { MyTimeTask } from "@/services/my-time";
import { validateSafeText } from "@/utils/validation";

// ============ Types ============

interface ProjectOption { id: string; name: string; }
interface UserOption { id: string; full_name: string; }

interface TaskFormData {
    name: string;
    project_id: string;
    task_type: string;
    description: string;
    priority: string;
    due_date: string;
    estimated_hours: string;
    status: string;
    assignee_id: string;
}

interface EditTaskModalProps {
    isOpen: boolean;
    task: MyTimeTask | null;
    onClose: () => void;
    onTaskUpdated?: () => void;
}

// ============ Config ============

const TASK_TYPES = [
    { value: "project", label: "#Project" },
    { value: "personal", label: "#Personal" },
    { value: "bug", label: "#Bug" },
    { value: "feature", label: "#Feature" },
    { value: "improvement", label: "#Improvement" },
    { value: "assigned", label: "#Assigned" },
];

const PRIORITIES = [
    { value: "urgent", label: "Urgent", color: "#ef4444" },
    { value: "high", label: "High", color: "#f97316" },
    { value: "critical", label: "Critical", color: "#dc2626" },
    { value: "medium", label: "Normal", color: "#3b82f6" },
    { value: "low", label: "Low", color: "#6b7280" },
];

const STATUSES = [
    { value: "in_progress", label: "In Progress", color: "#3b82f6" },
    { value: "todo", label: "To Do", color: "#8b5cf6" },
    { value: "backlog", label: "Backlog", color: "#6b7280" },
    { value: "waiting", label: "On Hold", color: "#f97316" },
    { value: "draft", label: "Draft", color: "#6b7280" },
    { value: "review", label: "Review", color: "#eab308" },
    { value: "completed", label: "Completed", color: "#22c55e" },
    { value: "blocked", label: "Blocked", color: "#ef4444" },
    { value: "cancelled", label: "Cancelled", color: "#9ca3af" },
];

// ============ Custom Dropdown ============

interface DropdownOption { value: string; label: string; color?: string; }

function CustomDropdown({
    label, placeholder, value, onChange, options, variant = "default",
}: {
    label: string; placeholder: string; value: string; onChange: (v: string) => void;
    options: DropdownOption[]; variant?: "default" | "hashtag" | "priority" | "status";
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = options.find((o) => o.value === value);

    const renderSelected = () => {
        if (!selected) return <span className="text-foreground/30">{placeholder}</span>;
        if (variant === "hashtag") return <span className="text-blue-500 dark:text-blue-400 font-medium">{selected.label}</span>;
        if (variant === "priority") return (
            <span className="flex items-center gap-2">
                <FlagIcon color={selected.color!} />
                <span className="text-foreground">{selected.label}</span>
            </span>
        );
        if (variant === "status") return (
            <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: selected.color }} />
                <span className="text-foreground">{selected.label}</span>
            </span>
        );
        return <span className="text-foreground">{selected.label}</span>;
    };

    const renderOption = (opt: DropdownOption) => {
        if (variant === "hashtag") return <span className="text-foreground/80">{opt.label}</span>;
        if (variant === "priority") return (
            <span className="flex items-center gap-2.5">
                <FlagIcon color={opt.color!} />
                <span className="text-foreground/80">{opt.label}</span>
            </span>
        );
        if (variant === "status") return (
            <span
                className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: `${opt.color}20`, color: opt.color }}
            >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: opt.color }} />
                {opt.label}
            </span>
        );
        return <span className="text-foreground/80">{opt.label}</span>;
    };

    return (
        <div ref={ref} className="relative">
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">{label}</label>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition hover:border-foreground/20"
            >
                {renderSelected()}
                <svg className={`w-4 h-4 text-foreground/30 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full min-w-[180px] bg-background border border-foreground/10 rounded-lg shadow-2xl overflow-hidden">
                    <div className="max-h-[240px] overflow-y-auto">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-foreground/[0.06] transition flex items-center ${value === opt.value ? "bg-foreground/[0.04]" : ""}`}
                            >
                                {renderOption(opt)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function FlagIcon({ color }: { color: string }) {
    return (
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color }} viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 1a1 1 0 0 1 1 1v1h6.5a1 1 0 0 1 .8.4l1.25 1.67a1 1 0 0 1 0 1.2L10.3 7.93a1 1 0 0 1-.8.4H3v6a1 1 0 1 1-2 0V2a1 1 0 0 1 1-1z" />
        </svg>
    );
}

// ============ Main Modal ============

export default function EditTaskModal({ isOpen, task, onClose, onTaskUpdated }: EditTaskModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [form, setForm] = useState<TaskFormData>({
        name: "", project_id: "", task_type: "", description: "",
        priority: "", due_date: "", estimated_hours: "", status: "", assignee_id: "",
    });
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pre-populate form from task
    useEffect(() => {
        if (!isOpen || !task) return;
        setForm({
            name: task.name || "",
            project_id: task.project_id || "",
            task_type: task.task_type || "",
            description: task.description || "",
            priority: task.priority || "",
            due_date: task.due_date ? task.due_date.split("T")[0] : "",
            estimated_hours: task.estimated_hours ? String(task.estimated_hours) : "",
            status: task.status || "",
            assignee_id: task.assignee_id || "",
        });
        setError(null);
        apiGet<ProjectOption[]>("/api/projects").then(setProjects).catch(() => { });
        apiGet<UserOption[]>("/api/users").then(setUsers).catch(() => { });
    }, [isOpen, task]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const updateField = useCallback((field: keyof TaskFormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = async () => {
        if (!task) return;
        const valErr = validateSafeText(form.name, "Task Name", 150);
        if (valErr) { setError(valErr); return; }
        
        setSubmitting(true);
        setError(null);
        try {
            const payload: Record<string, unknown> = {};
            if (form.name.trim() !== task.name) payload.name = form.name.trim();
            if (form.project_id !== (task.project_id || "")) payload.project_id = form.project_id || null;
            if (form.task_type !== task.task_type) payload.task_type = form.task_type;
            if (form.description !== (task.description || "")) payload.description = form.description;
            if (form.priority !== task.priority) payload.priority = form.priority;
            if (form.status !== task.status) payload.status = form.status;
            if (form.assignee_id !== (task.assignee_id || "")) payload.assignee_id = form.assignee_id || null;
            if (form.estimated_hours !== (task.estimated_hours ? String(task.estimated_hours) : "")) {
                payload.estimated_hours = form.estimated_hours ? parseFloat(form.estimated_hours) : null;
            }
            const formDate = form.due_date || "";
            const taskDate = task.due_date ? task.due_date.split("T")[0] : "";
            if (formDate !== taskDate) {
                payload.due_date = form.due_date ? new Date(form.due_date).toISOString() : null;
            }

            if (Object.keys(payload).length === 0) {
                onClose();
                return;
            }

            await apiPut(`/api/tasks/${task.id}`, payload);
            onTaskUpdated?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update task");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !task) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="relative w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-2xl border border-foreground/10 bg-background shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-background flex items-start justify-between p-6 pb-2 border-b border-foreground/5">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Edit Task</h2>
                        <p className="text-xs text-foreground/40 mt-0.5">Update task details below.</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-foreground/10 transition text-foreground/50 hover:text-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">{error}</div>
                    )}

                    <Section title="Task Details">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Task Name" placeholder="e.g. Create Dashboard UI" value={form.name} onChange={(v) => updateField("name", v)} hint="Only letters, numbers, spaces and basic punctuation (- &apos; . ) are allowed." />
                            <CustomDropdown label="Project" placeholder="Select Project" value={form.project_id} onChange={(v) => updateField("project_id", v)} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
                        </div>
                        <CustomDropdown label="Task Type" placeholder="Select Task Type" value={form.task_type} onChange={(v) => updateField("task_type", v)} options={TASK_TYPES} variant="hashtag" />
                        <div>
                            <label className="block text-xs font-medium text-foreground/60 mb-1.5">Description <span className="text-foreground/30">(Optional)</span></label>
                            <textarea
                                value={form.description}
                                onChange={(e) => updateField("description", e.target.value)}
                                placeholder="Add task details, requirements, or notes..."
                                rows={3}
                                className="w-full px-3 py-2.5 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-lg text-foreground placeholder-foreground/25 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition resize-none"
                            />
                        </div>
                    </Section>

                    <Section title="Priority & Scheduling">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <CustomDropdown label="Priority" placeholder="Select Priority" value={form.priority} onChange={(v) => updateField("priority", v)} options={PRIORITIES} variant="priority" />
                            <div>
                                <label className="block text-xs font-medium text-foreground/60 mb-1.5">Due Date</label>
                                <input
                                    type="date"
                                    value={form.due_date}
                                    onChange={(e) => updateField("due_date", e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                                />
                            </div>
                        </div>
                        <InputField label="Estimated Effort" placeholder="e.g. 8h" value={form.estimated_hours} onChange={(v) => updateField("estimated_hours", v)} />
                    </Section>

                    <Section title="Assignment & Status">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <CustomDropdown label="Status" placeholder="Select Status" value={form.status} onChange={(v) => updateField("status", v)} options={STATUSES} variant="status" />
                            <CustomDropdown label="Assignee" placeholder="Select Assignee" value={form.assignee_id} onChange={(v) => updateField("assignee_id", v)} options={users.map((u) => ({ value: u.id, label: u.full_name }))} />
                        </div>
                    </Section>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-background flex items-center justify-end gap-3 p-6 pt-4 border-t border-foreground/5">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition disabled:opacity-40"
                    >
                        {submitting ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ Sub-components ============

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-foreground/8 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {children}
        </div>
    );
}

function InputField({ label, placeholder, value, onChange, hint }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; hint?: string; }) {
    return (
        <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-lg text-foreground placeholder-foreground/25 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
            />
            {hint && <p className="text-[10px] text-foreground/40 mt-1">{hint}</p>}
        </div>
    );
}
