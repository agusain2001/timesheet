"use client";

import { useState } from "react";
import {
    List,
    LayoutGrid,
    Calendar,
    GanttChartSquare,
    Rows3,
    BookmarkPlus,
    Share2,
    ChevronDown,
    Filter,
    ArrowUpDown,
    Search,
    X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewType = "list" | "kanban" | "calendar" | "gantt" | "swimlane";

interface ViewSwitcherProps {
    currentView: ViewType;
    onChange: (view: ViewType) => void;
    onSaveView?: () => void;
    onShareView?: () => void;
}

type FilterState = {
    status: string;
    priority: string;
    assignee: string;
    search: string;
};

interface ViewToolbarProps {
    filters: FilterState;
    onFiltersChange: (f: FilterState) => void;
    sortBy: string;
    onSortChange: (s: string) => void;
    groupBy: string;
    onGroupChange: (g: string) => void;
    users?: { id: string; full_name: string }[];
}

// ─── View config ──────────────────────────────────────────────────────────────

const VIEWS: { id: ViewType; label: string; Icon: any }[] = [
    { id: "list", label: "List", Icon: List },
    { id: "kanban", label: "Kanban", Icon: LayoutGrid },
    { id: "calendar", label: "Calendar", Icon: Calendar },
    { id: "gantt", label: "Timeline", Icon: GanttChartSquare },
    { id: "swimlane", label: "Swimlane", Icon: Rows3 },
];

const SORT_OPTIONS = [
    { value: "due_date", label: "Due Date" },
    { value: "priority", label: "Priority" },
    { value: "created_at", label: "Created" },
    { value: "name", label: "Name" },
    { value: "status", label: "Status" },
];

const GROUP_OPTIONS = [
    { value: "", label: "No grouping" },
    { value: "status", label: "Status" },
    { value: "priority", label: "Priority" },
    { value: "assignee", label: "Assignee" },
    { value: "project", label: "Project" },
];

const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "backlog", label: "Backlog" },
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "blocked", label: "Blocked" },
    { value: "completed", label: "Done" },
    { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
    { value: "", label: "All Priorities" },
    { value: "critical", label: "🔴 Critical" },
    { value: "high", label: "🟠 High" },
    { value: "medium", label: "🟡 Medium" },
    { value: "low", label: "🟢 Low" },
];

// ─── ViewSwitcher ─────────────────────────────────────────────────────────────

export function ViewSwitcher({ currentView, onChange, onSaveView, onShareView }: ViewSwitcherProps) {
    return (
        <div className="flex items-center gap-2">
            {/* View tabs */}
            <div className="flex items-center bg-foreground/[0.05] border border-foreground/10 rounded-xl p-1 gap-0.5">
                {VIEWS.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        title={label}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentView === id
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-foreground/50 hover:text-foreground/80 hover:bg-foreground/[0.05]"
                            }`}
                    >
                        <Icon size={13} />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                ))}
            </div>

            {/* Save / Share */}
            {onSaveView && (
                <button
                    onClick={onSaveView}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/50 hover:text-foreground/80 text-xs transition-colors"
                    title="Save view"
                >
                    <BookmarkPlus size={13} />
                </button>
            )}
            {onShareView && (
                <button
                    onClick={onShareView}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/50 hover:text-foreground/80 text-xs transition-colors"
                    title="Share view"
                >
                    <Share2 size={13} />
                </button>
            )}
        </div>
    );
}

// ─── ViewToolbar ──────────────────────────────────────────────────────────────

export function ViewToolbar({
    filters,
    onFiltersChange,
    sortBy,
    onSortChange,
    groupBy,
    onGroupChange,
    users = [],
}: ViewToolbarProps) {
    const [showFilters, setShowFilters] = useState(false);
    const activeFilterCount = [filters.status, filters.priority, filters.assignee].filter(Boolean).length;

    const handleClear = () => {
        onFiltersChange({ status: "", priority: "", assignee: "", search: "" });
    };

    return (
        <div className="space-y-2">
            {/* Toolbar row */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
                    <input
                        value={filters.search}
                        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                        placeholder="Search tasks..."
                        className="pl-8 pr-3 py-2 rounded-xl bg-foreground/[0.05] border border-foreground/10 text-foreground/80 placeholder-foreground/40 text-xs focus:outline-none focus:border-blue-500/40 w-48"
                    />
                </div>

                {/* Filter toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-colors ${showFilters || activeFilterCount > 0
                            ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                            : "bg-foreground/[0.05] border-foreground/10 text-foreground/50 hover:text-foreground/80"
                        }`}
                >
                    <Filter size={12} />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {/* Sort */}
                <div className="relative">
                    <ArrowUpDown size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="pl-8 pr-6 py-2 rounded-xl bg-foreground/[0.05] border border-foreground/10 text-foreground/60 text-xs appearance-none focus:outline-none focus:border-blue-500/40"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
                </div>

                {/* Group by */}
                <div className="relative">
                    <Rows3 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
                    <select
                        value={groupBy}
                        onChange={(e) => onGroupChange(e.target.value)}
                        className="pl-8 pr-6 py-2 rounded-xl bg-foreground/[0.05] border border-foreground/10 text-foreground/60 text-xs appearance-none focus:outline-none focus:border-blue-500/40"
                    >
                        {GROUP_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
                </div>

                {/* Clear filters */}
                {activeFilterCount > 0 && (
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-1 text-xs text-foreground/50 hover:text-red-400 transition-colors"
                    >
                        <X size={12} /> Clear
                    </button>
                )}
            </div>

            {/* Expanded filter panel */}
            {showFilters && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.01] border border-foreground/10 flex-wrap">
                    <select
                        value={filters.status}
                        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/80 text-xs"
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    <select
                        value={filters.priority}
                        onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/80 text-xs"
                    >
                        {PRIORITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    {users.length > 0 && (
                        <select
                            value={filters.assignee}
                            onChange={(e) => onFiltersChange({ ...filters, assignee: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-foreground/80 text-xs"
                        >
                            <option value="">All Assignees</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                        </select>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export type { FilterState };
export { STATUS_OPTIONS, PRIORITY_OPTIONS };
