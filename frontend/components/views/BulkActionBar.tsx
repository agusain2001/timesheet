"use client";

import { useState } from "react";
import { X, CheckSquare, Trash2, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onBulkStatusChange: (status: string) => void;
    onBulkPriorityChange: (priority: string) => void;
    onBulkDelete: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "completed", label: "Done" },
    { value: "blocked", label: "Blocked" },
    { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
    { value: "critical", label: "🔴 Critical" },
    { value: "high", label: "🟠 High" },
    { value: "medium", label: "🟡 Medium" },
    { value: "low", label: "🟢 Low" },
];

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function DropdownButton({
    label,
    options,
    onSelect,
}: {
    label: string;
    options: { value: string; label: string }[];
    onSelect: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-foreground/10 hover:bg-foreground/15 text-foreground/80 transition-colors"
            >
                {label}
                <ChevronDown size={13} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute bottom-full mb-2 left-0 z-50 min-w-[150px] bg-background border border-foreground/10 rounded-xl shadow-xl p-1">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { onSelect(opt.value); setOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm rounded-lg text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground transition-colors"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── BulkActionBar ────────────────────────────────────────────────────────────

export default function BulkActionBar({
    selectedCount,
    onClearSelection,
    onBulkStatusChange,
    onBulkPriorityChange,
    onBulkDelete,
}: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-background border border-foreground/15 shadow-2xl shadow-black/30 backdrop-blur-sm">
            {/* Selection count */}
            <div className="flex items-center gap-2 pr-3 border-r border-foreground/10">
                <CheckSquare size={15} className="text-blue-400" />
                <span className="text-sm font-semibold text-foreground">
                    {selectedCount} selected
                </span>
            </div>

            {/* Actions */}
            <DropdownButton
                label="Set Status"
                options={STATUS_OPTIONS}
                onSelect={onBulkStatusChange}
            />
            <DropdownButton
                label="Set Priority"
                options={PRIORITY_OPTIONS}
                onSelect={onBulkPriorityChange}
            />

            <div className="w-px h-5 bg-foreground/10 mx-1" />

            <button
                onClick={onBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
                <Trash2 size={13} />
                Delete
            </button>

            {/* Clear */}
            <button
                onClick={onClearSelection}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-foreground/40 hover:bg-foreground/10 hover:text-foreground/70 transition-colors ml-1"
                title="Clear selection"
            >
                <X size={14} />
            </button>
        </div>
    );
}
