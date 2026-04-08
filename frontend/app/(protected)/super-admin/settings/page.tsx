"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Settings, Plus, Trash2, Save, ChevronRight, ArrowLeft,
    RefreshCw, Check, X, AlertCircle, Tag, Palette,
    GripVertical, Edit2, Crown, Database, Layers
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DropdownOption {
    id: string;
    category: string;
    key: string;
    label: string;
    color: string | null;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
    is_default: boolean;
}

interface CategoryMeta {
    category: string;
    label: string;
    group: string;
}

// ─── Colour presets ───────────────────────────────────────────────────────────

const COLOR_PRESETS = [
    "#6b7280", "#3b82f6", "#8b5cf6", "#06b6d4",
    "#10b981", "#22c55e", "#eab308", "#f97316", "#ef4444", "#dc2626",
    "#f43f5e", "#ec4899", "#a855f7", "#14b8a6",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GROUP_ICONS: Record<string, string> = {
    Tasks: "📋", Projects: "📁", Employees: "👤", Clients: "🏢",
    Finance: "💰", Teams: "👥", Workspaces: "🗂️", Departments: "🏗️",
};

function ColorDot({ color }: { color: string | null }) {
    if (!color) return <div className="w-3 h-3 rounded-full bg-foreground/10" />;
    return <div className="w-3 h-3 rounded-full border border-black/10" style={{ background: color }} />;
}

function InlineColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => onChange(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ background: c }} />
            ))}
        </div>
    );
}

// ─── Edit Row ─────────────────────────────────────────────────────────────────

function OptionRow({
    option, onSave, onDelete, onToggle,
}: {
    option: DropdownOption;
    onSave: (id: string, label: string, color: string, key: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onToggle: (id: string, active: boolean) => Promise<void>;
}) {
    const [editing, setEditing] = useState(false);
    const [label, setLabel] = useState(option.label);
    const [key, setKey] = useState(option.key);
    const [color, setColor] = useState(option.color || "");
    const [saving, setSaving] = useState(false);
    const [showColors, setShowColors] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(option.id, label, color, key);
        setSaving(false);
        setEditing(false);
        setShowColors(false);
    };

    const handleCancel = () => {
        setLabel(option.label);
        setKey(option.key);
        setColor(option.color || "");
        setEditing(false);
        setShowColors(false);
    };

    return (
        <div className={`group border border-foreground/8 rounded-xl overflow-hidden transition-all ${editing ? "border-blue-500/40 bg-blue-500/[0.02]" : "bg-foreground/[0.01] hover:bg-foreground/[0.03]"}`}>
            {/* Row header */}
            <div className="flex items-center gap-3 px-4 py-3">
                <GripVertical size={14} className="text-foreground/20 flex-shrink-0 cursor-grab" />
                <ColorDot color={option.color} />
                {editing ? (
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                        <input value={label} onChange={e => setLabel(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm bg-background border border-foreground/10 rounded-lg outline-none focus:border-blue-500 text-foreground min-w-0"
                            placeholder="Display label" autoFocus />
                        <input value={key} onChange={e => setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                            className="w-32 px-2 py-1 text-xs bg-background border border-foreground/10 rounded-lg outline-none focus:border-blue-500 text-foreground/70 font-mono"
                            placeholder="key_name" />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-foreground">{option.label}</span>
                        <code className="text-xs text-foreground/30 bg-foreground/5 px-1.5 py-0.5 rounded font-mono">{option.key}</code>
                        {option.is_default && <span className="text-xs text-foreground/30 bg-foreground/5 px-1.5 py-0.5 rounded">default</span>}
                        {!option.is_active && <span className="text-xs text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded">hidden</span>}
                    </div>
                )}

                <div className="flex items-center gap-1 flex-shrink-0">
                    {editing ? (
                        <>
                            <button onClick={() => setShowColors(!showColors)}
                                className={`p-1.5 rounded-lg transition-all ${showColors ? "bg-blue-500/10 text-blue-400" : "text-foreground/40 hover:text-foreground hover:bg-foreground/5"}`}>
                                <Palette size={14} />
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50">
                                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={handleCancel} className="p-1.5 text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all">
                                <X size={14} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => onToggle(option.id, !option.is_active)}
                                title={option.is_active ? "Hide option" : "Show option"}
                                className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${option.is_active ? "text-foreground/30 hover:text-amber-400" : "text-amber-400"}`}>
                                {option.is_active ? <Check size={14} /> : <X size={14} />}
                            </button>
                            <button onClick={() => setEditing(true)}
                                className="p-1.5 text-foreground/30 hover:text-foreground hover:bg-foreground/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => onDelete(option.id)}
                                disabled={option.is_default}
                                title={option.is_default ? "Cannot delete system defaults" : "Delete"}
                                className="p-1.5 text-foreground/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Color picker panel */}
            {editing && showColors && (
                <div className="px-4 pb-3 border-t border-foreground/5">
                    <p className="text-xs text-foreground/40 mb-2 mt-2">Pick a colour</p>
                    <InlineColorPicker value={color} onChange={setColor} />
                </div>
            )}
        </div>
    );
}

// ─── Add Option Form ──────────────────────────────────────────────────────────

function AddOptionForm({ category, onAdd }: { category: string; onAdd: () => void }) {
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState("");
    const [key, setKey] = useState("");
    const [color, setColor] = useState("");
    const [showColors, setShowColors] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAdd = async () => {
        if (!label.trim()) { setError("Label is required"); return; }
        const k = key.trim() || label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        setLoading(true);
        setError("");
        try {
            await apiPost("/api/dropdown-config", { category, key: k, label: label.trim(), color: color || undefined, sort_order: 100 });
            setLabel(""); setKey(""); setColor(""); setOpen(false);
            onAdd();
        } catch (e: any) {
            setError(e.message || "Failed to add option");
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <button onClick={() => setOpen(true)}
                className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-foreground/15 text-sm text-foreground/40 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/[0.02] transition-all">
                <Plus size={15} /> Add new option
            </button>
        );
    }

    return (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.02] p-4 space-y-3">
            {error && <div className="flex items-center gap-2 text-xs text-red-400"><AlertCircle size={13} />{error}</div>}
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-foreground/20 flex-shrink-0" style={color ? { background: color } : {}} />
                <input value={label} onChange={e => setLabel(e.target.value)}
                    placeholder="Display label (e.g. In Progress)"
                    className="flex-1 px-3 py-2 text-sm bg-background border border-foreground/10 rounded-lg outline-none focus:border-blue-500 text-foreground"
                    onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus />
                <input value={key} onChange={e => setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                    placeholder="key (auto)"
                    className="w-28 px-3 py-2 text-xs bg-background border border-foreground/10 rounded-lg outline-none focus:border-blue-500 text-foreground/70 font-mono" />
                <button onClick={() => setShowColors(!showColors)}
                    className={`p-2 rounded-lg transition-all ${showColors ? "bg-blue-500/10 text-blue-400" : "text-foreground/40 hover:text-foreground"}`}>
                    <Palette size={15} />
                </button>
            </div>
            {showColors && (
                <div>
                    <p className="text-xs text-foreground/40 mb-2">Pick a colour</p>
                    <InlineColorPicker value={color} onChange={setColor} />
                </div>
            )}
            <div className="flex items-center gap-2 justify-end">
                <button onClick={() => { setOpen(false); setError(""); }}
                    className="px-3 py-1.5 text-sm text-foreground/50 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all">Cancel</button>
                <button onClick={handleAdd} disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-50">
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} Add Option
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdminSettingsPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<CategoryMeta[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [options, setOptions] = useState<DropdownOption[]>([]);
    const [catLoading, setCatLoading] = useState(true);
    const [optsLoading, setOptsLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [seedSuccess, setSeedSuccess] = useState(false);
    const [error, setError] = useState("");

    // ─── Load categories ──────────────────────────────────────────────────────
    const fetchCategories = useCallback(async () => {
        setCatLoading(true);
        try {
            const data = await apiGet<CategoryMeta[]>("/api/dropdown-config/categories");
            setCategories(data);
            if (data.length > 0 && !selectedCategory) setSelectedCategory(data[0].category);
        } catch (e: any) {
            setError(e.message || "Failed to load categories");
        } finally {
            setCatLoading(false);
        }
    }, [selectedCategory]);

    // ─── Load options for selected category ───────────────────────────────────
    const fetchOptions = useCallback(async () => {
        if (!selectedCategory) return;
        setOptsLoading(true);
        try {
            const data = await apiGet<DropdownOption[]>("/api/dropdown-config", {
                category: selectedCategory,
                include_inactive: true,
            });
            setOptions(data);
        } catch (e: any) {
            setError(e.message || "Failed to load options");
        } finally {
            setOptsLoading(false);
        }
    }, [selectedCategory]);

    useEffect(() => { fetchCategories(); }, []);
    useEffect(() => { fetchOptions(); }, [selectedCategory]);

    // ─── Seed defaults ────────────────────────────────────────────────────────
    const handleSeedDefaults = async () => {
        setSeeding(true);
        setSeedSuccess(false);
        try {
            await apiPost("/api/dropdown-config/seed", {});
            setSeedSuccess(true);
            fetchOptions();
            setTimeout(() => setSeedSuccess(false), 3000);
        } catch (e: any) {
            setError(e.message || "Failed to seed defaults");
        } finally {
            setSeeding(false);
        }
    };

    // ─── CRUD handlers ────────────────────────────────────────────────────────
    const handleSaveOption = async (id: string, label: string, color: string, key: string) => {
        await apiPut(`/api/dropdown-config/${id}`, { label, color: color || null, key });
        fetchOptions();
    };

    const handleDeleteOption = async (id: string) => {
        if (!confirm("Delete this option? This cannot be undone.")) return;
        try { await apiDelete(`/api/dropdown-config/${id}`); fetchOptions(); }
        catch (e: any) { setError(e.message || "Failed to delete"); }
    };

    const handleToggleOption = async (id: string, is_active: boolean) => {
        await apiPut(`/api/dropdown-config/${id}`, { is_active });
        fetchOptions();
    };

    // ─── Group categories by group ────────────────────────────────────────────
    const grouped = categories.reduce<Record<string, CategoryMeta[]>>((acc, cat) => {
        if (!acc[cat.group]) acc[cat.group] = [];
        acc[cat.group].push(cat);
        return acc;
    }, {});

    const currentCatMeta = categories.find(c => c.category === selectedCategory);

    return (
        <div className="-m-6 bg-background text-foreground min-h-screen">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-foreground/5 bg-gradient-to-br from-background via-background to-blue-950/10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.07),transparent_60%)]" />
                <div className="relative p-6 lg:p-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push("/super-admin")}
                                className="flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors">
                                <ArrowLeft size={15} /> Super Admin
                            </button>
                            <ChevronRight size={14} className="text-foreground/20" />
                            <span className="text-sm text-foreground/70">Settings</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleSeedDefaults} disabled={seeding}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${seedSuccess
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                    : "border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-foreground/60 hover:text-foreground"
                                    }`}>
                                {seeding ? <RefreshCw size={14} className="animate-spin" /> :
                                    seedSuccess ? <Check size={14} /> : <Database size={14} />}
                                {seeding ? "Seeding…" : seedSuccess ? "Seeded!" : "Seed Defaults"}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-blue-500/20">
                            <Settings size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Dynamic Settings</h1>
                            <p className="text-sm text-foreground/40">Manage dropdown options used across the platform</p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mx-6 mt-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle size={16} />{error}
                    <button onClick={() => setError("")} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {/* Body */}
            <div className="flex h-[calc(100vh-240px)] overflow-hidden">
                {/* Sidebar — category list */}
                <div className="w-72 flex-shrink-0 border-r border-foreground/5 overflow-y-auto">
                    {catLoading ? (
                        <div className="flex items-center justify-center py-12 text-foreground/30">
                            <RefreshCw size={18} className="animate-spin" />
                        </div>
                    ) : (
                        <div className="p-3 space-y-4">
                            {Object.entries(grouped).map(([group, cats]) => (
                                <div key={group}>
                                    <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                                        <span className="text-base">{GROUP_ICONS[group] || "📦"}</span>
                                        <span className="text-xs font-semibold text-foreground/30 uppercase tracking-wider">{group}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {cats.map(cat => (
                                            <button key={cat.category} onClick={() => setSelectedCategory(cat.category)}
                                                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all ${selectedCategory === cat.category
                                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                                                    }`}>
                                                <span className="text-sm font-medium">{cat.label}</span>
                                                <ChevronRight size={13} className="opacity-40 flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main panel — options for selected category */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    {selectedCategory ? (
                        <div className="max-w-2xl">
                            {/* Category header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h2 className="text-lg font-bold text-foreground">{currentCatMeta?.label || selectedCategory}</h2>
                                        <span className="text-xs text-foreground/30 bg-foreground/5 px-2 py-0.5 rounded-full font-mono">{selectedCategory}</span>
                                    </div>
                                    <p className="text-sm text-foreground/40">{options.length} option{options.length !== 1 ? "s" : ""} configured</p>
                                </div>
                                <button onClick={fetchOptions} className="p-2 rounded-xl text-foreground/30 hover:text-foreground hover:bg-foreground/5 transition-all">
                                    <RefreshCw size={15} className={optsLoading ? "animate-spin" : ""} />
                                </button>
                            </div>

                            {optsLoading ? (
                                <div className="flex items-center justify-center py-16 text-foreground/30">
                                    <RefreshCw size={20} className="animate-spin mr-2" /> Loading options…
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {options.map(opt => (
                                        <OptionRow key={opt.id} option={opt}
                                            onSave={handleSaveOption}
                                            onDelete={handleDeleteOption}
                                            onToggle={handleToggleOption} />
                                    ))}

                                    {options.length === 0 && (
                                        <div className="text-center py-12 text-foreground/30">
                                            <Layers size={40} className="mx-auto mb-3 opacity-20" />
                                            <p className="text-sm font-medium">No options yet</p>
                                            <p className="text-xs mt-1">Click "Seed Defaults" to load system defaults, or add manually below</p>
                                        </div>
                                    )}

                                    <AddOptionForm category={selectedCategory} onAdd={fetchOptions} />
                                </div>
                            )}

                            {/* Info box */}
                            <div className="mt-8 rounded-xl border border-foreground/5 bg-foreground/[0.01] p-4">
                                <div className="flex items-start gap-3">
                                    <Tag size={15} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-foreground/40 space-y-1">
                                        <p className="font-medium text-foreground/60">How this works</p>
                                        <p>These options are available to your frontend to power any dropdown or select field.</p>
                                        <p>Default options (marked "default") are system-wide and visible to all organisations. Grayed items are hidden from users but kept for historical records.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-foreground/30">
                            <Settings size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Select a category</p>
                            <p className="text-sm mt-1 opacity-60">Choose a dropdown category from the left sidebar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
