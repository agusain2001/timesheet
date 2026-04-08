"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiGet, apiPost } from "@/services/api";
import RichTextEditor from "@/components/RichTextEditor";
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
    assignee_ids: string[];
}

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated?: () => void;
    prefillTemplate?: TaskTemplate | null;
}

interface TaskTemplate {
    id: string;
    name: string;
    priority?: string;
    status?: string;
    task_type?: string;
    estimated_hours?: number;
    description?: string;
    checklist?: string[];
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

interface DropdownOption {
    value: string;
    label: string;
    color?: string;
}

function CustomDropdown({
    label,
    placeholder,
    value,
    onChange,
    options,
    variant = "default",
}: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    options: DropdownOption[];
    variant?: "default" | "hashtag" | "priority" | "status";
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
                <span className="text-foreground/30 ml-0.5">•••</span>
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

// ============ Flag Icon ============

function FlagIcon({ color }: { color: string }) {
    return (
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color }} viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 1a1 1 0 0 1 1 1v1h6.5a1 1 0 0 1 .8.4l1.25 1.67a1 1 0 0 1 0 1.2L10.3 7.93a1 1 0 0 1-.8.4H3v6a1 1 0 1 1-2 0V2a1 1 0 0 1 1-1z" />
        </svg>
    );
}

// ============ Calendar Picker ============

function CalendarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [showCal, setShowCal] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const today = new Date();
    const selected = value ? new Date(value) : null;
    const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth());
    const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear());

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setShowCal(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
        else setViewMonth(viewMonth - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
        else setViewMonth(viewMonth + 1);
    };

    const pickDay = (day: number) => {
        const m = String(viewMonth + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        onChange(`${viewYear}-${m}-${d}`);
        setShowCal(false);
    };

    const formatDisplay = (val: string) => {
        if (!val) return null;
        const dt = new Date(val);
        return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div ref={ref} className="relative">
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">Due Date</label>
            <button
                type="button"
                onClick={() => setShowCal(!showCal)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition hover:border-foreground/20"
            >
                {value ? (
                    <span className="text-foreground">{formatDisplay(value)}</span>
                ) : (
                    <span className="text-foreground/30">Select due date</span>
                )}
                <svg className="w-4 h-4 text-foreground/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {showCal && (
                <div className="absolute z-50 mt-1 right-0 bg-background border border-foreground/10 rounded-xl shadow-2xl p-4 w-[320px]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-sm font-medium text-foreground">{monthNames[viewMonth]} {viewYear}</span>
                        <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    {/* Day names */}
                    <div className="grid grid-cols-7 mb-1">
                        {dayNames.map((d) => (
                            <div key={d} className="text-center text-[10px] font-medium text-foreground/30 py-1">{d}</div>
                        ))}
                    </div>
                    {/* Days grid */}
                    <div className="grid grid-cols-7">
                        {cells.map((day, i) => {
                            if (day === null) return <div key={`e${i}`} />;
                            const isSelected = selected && selected.getDate() === day && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear;
                            const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => pickDay(day)}
                                    className={`w-9 h-9 mx-auto rounded-full text-sm flex items-center justify-center transition
                                        ${isSelected
                                            ? "bg-foreground text-background font-bold"
                                            : isToday
                                                ? "ring-1 ring-foreground/30 text-foreground"
                                                : "text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
                                        }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ Main Modal ============

export default function AddTaskModal({ isOpen, onClose, onTaskCreated, prefillTemplate }: AddTaskModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [form, setForm] = useState<TaskFormData>({
        name: "", project_id: "", task_type: "", description: "",
        priority: "", due_date: "", estimated_hours: "", status: "", assignee_id: "", assignee_ids: [],
    });
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [applyingTemplate, setApplyingTemplate] = useState(false);
    const [customFields, setCustomFields] = useState<{ id: string; name: string; field_type: string; options: string[] | null; is_required: boolean }[]>([]);
    const [customValues, setCustomValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!isOpen) return;
        apiGet<ProjectOption[]>("/api/projects").then(setProjects).catch(() => { });
        apiGet<UserOption[]>("/api/users").then(setUsers).catch(() => { });
        apiGet<TaskTemplate[]>("/api/task-templates?limit=20").then(setTemplates).catch(() => { });
        
        if (prefillTemplate) {
            setForm((prev) => ({
                ...prev,
                name: prefillTemplate.name || "",
                task_type: prefillTemplate.task_type || "",
                description: prefillTemplate.description || "",
                priority: prefillTemplate.priority || "",
                estimated_hours: prefillTemplate.estimated_hours?.toString() || "",
                status: prefillTemplate.status || "",
            }));
            apiPost(`/api/task-templates/${prefillTemplate.id}/use`, {}).catch(() => {});
        } else {
            setForm({ name: "", project_id: "", task_type: "", description: "", priority: "", due_date: "", estimated_hours: "", status: "", assignee_id: "", assignee_ids: [] });
        }
    }, [isOpen, prefillTemplate]);

    // Load custom fields when project changes
    useEffect(() => {
        if (!form.project_id) { setCustomFields([]); return; }
        apiGet<any[]>(`/api/tasks/projects/${form.project_id}/custom-fields`)
            .then(setCustomFields).catch(() => setCustomFields([]));
    }, [form.project_id]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    const applyTemplate = async (tpl: TaskTemplate) => {
        setApplyingTemplate(true);
        try {
            // call /use to increment counter, then pre-fill form
            await apiPost(`/api/task-templates/${tpl.id}/use`, {});
            setForm((prev) => ({
                ...prev,
                task_type: tpl.task_type || prev.task_type,
                description: tpl.description || prev.description,
                priority: tpl.priority || prev.priority,
                status: tpl.status || prev.status,
                estimated_hours: tpl.estimated_hours?.toString() || prev.estimated_hours,
            }));
        } catch { } finally { setApplyingTemplate(false); }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const updateField = useCallback((field: keyof TaskFormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const handleSubmit = async (asDraft: boolean) => {
        const valErr = validateSafeText(form.name, "Task Name", 150);
        if (valErr) { setError(valErr); return; }
        
        setSubmitting(true);
        setError(null);
        try {
            const payload: Record<string, unknown> = { name: form.name.trim() };
            if (form.project_id) payload.project_id = form.project_id;
            if (form.task_type) payload.task_type = form.task_type;
            if (form.description) payload.description = form.description;
            if (form.priority) payload.priority = form.priority;
            if (form.due_date) payload.due_date = new Date(form.due_date).toISOString();
            if (form.estimated_hours) payload.estimated_hours = parseFloat(form.estimated_hours);
            // Primary assignee (first of multi or single)
            const primary = form.assignee_ids.length > 0 ? form.assignee_ids[0] : form.assignee_id;
            if (primary) payload.assignee_id = primary;
            if (form.assignee_ids.length > 0) payload.assignee_ids = form.assignee_ids;
            if (asDraft) payload.status = "draft";
            else if (form.status) payload.status = form.status;

            const created = await apiPost<{ id: string }>("/api/tasks/", payload);

            // Save custom field values if any
            if (created?.id && Object.values(customValues).some(v => v !== "")) {
                const vals: Record<string, string> = {};
                Object.entries(customValues).forEach(([k, v]) => { if (v !== "") vals[k] = v; });
                await apiPost(`/api/tasks/${created.id}/custom-field-values`, { values: vals }).catch(() => { });
            }

            setForm({ name: "", project_id: "", task_type: "", description: "", priority: "", due_date: "", estimated_hours: "", status: "", assignee_id: "", assignee_ids: [] });
            setAttachments([]);
            setCustomValues({});
            onTaskCreated?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create task");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

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
                        <h2 className="text-lg font-bold text-foreground">Add Task</h2>
                        <p className="text-xs text-foreground/40 mt-0.5">This task will be visible to your project manager.</p>
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

                    {/* ---- From Template ---- */}
                    {templates.length > 0 && (
                        <div className="rounded-xl border border-foreground/8 p-4">
                            <h3 className="text-sm font-semibold text-foreground mb-2">From Template</h3>
                            <div className="flex flex-wrap gap-2">
                                {templates.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        onClick={() => applyTemplate(tpl)}
                                        disabled={applyingTemplate}
                                        className="px-2.5 py-1 rounded-lg text-xs bg-foreground/[0.04] border border-foreground/10 text-foreground/70 hover:bg-foreground/[0.08] hover:border-foreground/20 transition disabled:opacity-50"
                                    >
                                        {tpl.name.replace(/\s*\(Copy\)(\s*\d*)?$/i, '').trim() || tpl.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ---- Task Details ---- */}
                    <Section title="Task Details">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Task Name" placeholder="e.g. Create Dashboard UI" value={form.name} onChange={(v) => updateField("name", v)} hint="Only letters, numbers, spaces and basic punctuation (- &apos; . ) are allowed." />
                            <CustomDropdown
                                label="Project"
                                placeholder="Select Project"
                                value={form.project_id}
                                onChange={(v) => updateField("project_id", v)}
                                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                            />
                        </div>
                        <CustomDropdown
                            label="Task Type"
                            placeholder="Select Task Type"
                            value={form.task_type}
                            onChange={(v) => updateField("task_type", v)}
                            options={TASK_TYPES}
                            variant="hashtag"
                        />
                        <div>
                            <label className="block text-xs font-medium text-foreground/60 mb-1.5">Description <span className="text-foreground/30">(Optional)</span></label>
                            <RichTextEditor
                                value={form.description}
                                onChange={(html) => updateField("description", html)}
                                placeholder="Add task details, requirements, or notes..."
                                minHeight="100px"
                            />
                        </div>
                    </Section>

                    {/* ---- Priority & Scheduling ---- */}
                    <Section title="Priority & Scheduling">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <CustomDropdown
                                label="Priority"
                                placeholder="Select Priority"
                                value={form.priority}
                                onChange={(v) => updateField("priority", v)}
                                options={PRIORITIES}
                                variant="priority"
                            />
                            <CalendarPicker value={form.due_date} onChange={(v) => updateField("due_date", v)} />
                        </div>
                        <InputField label="Estimated Effort" placeholder="e.g. 8h" value={form.estimated_hours} onChange={(v) => updateField("estimated_hours", v)} />
                    </Section>

                    {/* ---- Assignment & Status ---- */}
                    <Section title="Assignment & Status">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <CustomDropdown
                                label="Status"
                                placeholder="Select Status"
                                value={form.status}
                                onChange={(v) => updateField("status", v)}
                                options={STATUSES}
                                variant="status"
                            />
                            {/* Multi-assignee selector */}
                            <div>
                                <label className="block text-xs font-medium text-foreground/60 mb-1.5">Assignees</label>
                                <div className="border border-foreground/10 rounded-lg bg-foreground/[0.04] max-h-36 overflow-y-auto divide-y divide-foreground/5">
                                    {users.length === 0 && <p className="text-xs text-foreground/30 px-3 py-2">Loading…</p>}
                                    {users.map(u => {
                                        const checked = form.assignee_ids.includes(u.id);
                                        return (
                                            <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-foreground/5 transition">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {
                                                        setForm(prev => ({
                                                            ...prev,
                                                            assignee_ids: checked
                                                                ? prev.assignee_ids.filter(id => id !== u.id)
                                                                : [...prev.assignee_ids, u.id],
                                                            assignee_id: !checked && prev.assignee_ids.length === 0 ? u.id : prev.assignee_id,
                                                        }));
                                                    }}
                                                    className="w-3.5 h-3.5 rounded accent-blue-500"
                                                />
                                                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-bold text-blue-400 flex-shrink-0">
                                                    {u.full_name.charAt(0)}
                                                </div>
                                                <span className="text-sm text-foreground/80 truncate">{u.full_name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {form.assignee_ids.length > 0 && (
                                    <p className="text-[10px] text-foreground/40 mt-1">{form.assignee_ids.length} assignee{form.assignee_ids.length > 1 ? "s" : ""} selected</p>
                                )}
                            </div>
                        </div>
                    </Section>

                    {/* ---- Custom Fields (if project has any) ---- */}
                    {customFields.length > 0 && (
                        <Section title="Custom Fields">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {customFields.map(field => (
                                    <div key={field.id}>
                                        <label className="block text-xs font-medium text-foreground/60 mb-1.5">
                                            {field.name}{field.is_required && <span className="text-red-400 ml-0.5">*</span>}
                                        </label>
                                        {field.field_type === "select" && field.options ? (
                                            <select
                                                value={customValues[field.id] ?? ""}
                                                onChange={e => setCustomValues(p => ({ ...p, [field.id]: e.target.value }))}
                                                className="w-full px-3 py-2.5 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-lg text-foreground outline-none focus:ring-1 focus:ring-blue-500/50"
                                            >
                                                <option value="">Select…</option>
                                                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : field.field_type === "checkbox" ? (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={customValues[field.id] === "true"}
                                                    onChange={e => setCustomValues(p => ({ ...p, [field.id]: e.target.checked ? "true" : "false" }))}
                                                    className="w-4 h-4 rounded accent-blue-500"
                                                />
                                                <span className="text-sm text-foreground/70">{field.name}</span>
                                            </label>
                                        ) : (
                                            <input
                                                type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
                                                value={customValues[field.id] ?? ""}
                                                onChange={e => setCustomValues(p => ({ ...p, [field.id]: e.target.value }))}
                                                placeholder={`Enter ${field.name.toLowerCase()}…`}
                                                className="w-full px-3 py-2.5 text-sm bg-foreground/[0.04] border border-foreground/10 rounded-lg text-foreground placeholder-foreground/25 outline-none focus:ring-1 focus:ring-blue-500/50"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* ---- Attachments ---- */}
                    <Section title="Attachments">
                        {attachments.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {attachments.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-foreground/[0.04] border border-foreground/10 rounded-lg">
                                        <span className="text-sm text-foreground/70 truncate">
                                            {file.name} <span className="text-foreground/30 text-xs">(Click to View)</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                                            className="text-foreground/30 hover:text-red-500 transition ml-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <label className="flex items-center gap-3 px-3 py-2.5 bg-foreground/[0.04] border border-foreground/10 rounded-lg cursor-pointer hover:bg-foreground/[0.06] transition">
                            <span className="text-sm text-foreground/30 flex-1">Upload a File (.jpg, .png, .jpeg)</span>
                            <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <input type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                        </label>
                    </Section>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-background flex items-center justify-end gap-3 p-6 pt-4 border-t border-foreground/5">
                    <button
                        onClick={() => handleSubmit(true)}
                        disabled={submitting}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition disabled:opacity-40"
                    >
                        Save as Draft
                    </button>
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition disabled:opacity-40"
                    >
                        {submitting ? "Creating..." : "Add Task"}
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
