"use client";

import { useState, useEffect } from "react";
import type { SavedView, ViewColumn, ViewFilter, ViewSort } from "@/services/views";

// =============== Types ===============

interface ViewCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentView?: SavedView;
    viewType: SavedView["type"];
    availableColumns: ViewColumn[];
    onSave: (view: Partial<SavedView>) => void;
    onApply: (view: Partial<SavedView>) => void;
}

// =============== Icons ===============

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const GripIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

// =============== Filter Operators ===============

const filterOperators = [
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
    { value: "gt", label: "Greater than" },
    { value: "lt", label: "Less than" },
    { value: "gte", label: "Greater or equal" },
    { value: "lte", label: "Less or equal" },
    { value: "in", label: "In list" },
    { value: "not_in", label: "Not in list" },
];

const filterFields = [
    { value: "status", label: "Status" },
    { value: "priority", label: "Priority" },
    { value: "assignee", label: "Assignee" },
    { value: "project", label: "Project" },
    { value: "dueDate", label: "Due Date" },
    { value: "tags", label: "Tags" },
    { value: "createdAt", label: "Created Date" },
];

// =============== Component ===============

export function ViewCustomizationModal({
    isOpen,
    onClose,
    currentView,
    viewType,
    availableColumns,
    onSave,
    onApply,
}: ViewCustomizationModalProps) {
    const [activeTab, setActiveTab] = useState<"columns" | "filters" | "sort" | "general">("columns");
    const [viewName, setViewName] = useState(currentView?.name || "");
    const [viewDescription, setViewDescription] = useState(currentView?.description || "");
    const [isDefault, setIsDefault] = useState(currentView?.isDefault || false);
    const [isShared, setIsShared] = useState(currentView?.isShared || false);
    const [columns, setColumns] = useState<ViewColumn[]>(currentView?.columns || availableColumns);
    const [filters, setFilters] = useState<ViewFilter[]>(currentView?.filters || []);
    const [sorts, setSorts] = useState<ViewSort[]>(currentView?.sorts || []);

    useEffect(() => {
        if (currentView) {
            setViewName(currentView.name);
            setViewDescription(currentView.description || "");
            setIsDefault(currentView.isDefault);
            setIsShared(currentView.isShared);
            setColumns(currentView.columns);
            setFilters(currentView.filters);
            setSorts(currentView.sorts);
        } else {
            setViewName("");
            setViewDescription("");
            setIsDefault(false);
            setIsShared(false);
            setColumns(availableColumns);
            setFilters([]);
            setSorts([{ field: "dueDate", direction: "asc" }]);
        }
    }, [currentView, availableColumns]);

    if (!isOpen) return null;

    const toggleColumnVisibility = (columnId: string) => {
        setColumns(prev =>
            prev.map(col =>
                col.id === columnId ? { ...col, visible: !col.visible } : col
            )
        );
    };

    const moveColumn = (fromIndex: number, direction: "up" | "down") => {
        const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= columns.length) return;

        const newColumns = [...columns];
        [newColumns[fromIndex], newColumns[toIndex]] = [newColumns[toIndex], newColumns[fromIndex]];
        newColumns.forEach((col, i) => (col.order = i));
        setColumns(newColumns);
    };

    const addFilter = () => {
        setFilters(prev => [...prev, { field: "status", operator: "equals", value: "" }]);
    };

    const updateFilter = (index: number, updates: Partial<ViewFilter>) => {
        setFilters(prev =>
            prev.map((filter, i) => (i === index ? { ...filter, ...updates } : filter))
        );
    };

    const removeFilter = (index: number) => {
        setFilters(prev => prev.filter((_, i) => i !== index));
    };

    const addSort = () => {
        if (sorts.length < 3) {
            setSorts(prev => [...prev, { field: "name", direction: "asc" }]);
        }
    };

    const updateSort = (index: number, updates: Partial<ViewSort>) => {
        setSorts(prev =>
            prev.map((sort, i) => (i === index ? { ...sort, ...updates } : sort))
        );
    };

    const removeSort = (index: number) => {
        setSorts(prev => prev.filter((_, i) => i !== index));
    };

    const buildView = (): Partial<SavedView> => ({
        id: currentView?.id,
        name: viewName || `New ${viewType} View`,
        description: viewDescription,
        type: viewType,
        isDefault,
        isShared,
        columns,
        filters,
        sorts,
    });

    const handleApply = () => {
        onApply(buildView());
    };

    const handleSave = () => {
        onSave(buildView());
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-background border border-foreground/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
                    <h2 className="text-lg font-semibold text-foreground">
                        {currentView ? "Edit View" : "Create View"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-foreground/40 hover:text-foreground rounded transition-colors"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-foreground/10">
                    {(["general", "columns", "filters", "sort"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab
                                    ? "text-blue-500 border-b-2 border-blue-500"
                                    : "text-foreground/60 hover:text-foreground"
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* General Tab */}
                    {activeTab === "general" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground/70 mb-1">
                                    View Name
                                </label>
                                <input
                                    type="text"
                                    value={viewName}
                                    onChange={e => setViewName(e.target.value)}
                                    placeholder="e.g., My Tasks This Week"
                                    className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground/70 mb-1">
                                    Description (optional)
                                </label>
                                <textarea
                                    value={viewDescription}
                                    onChange={e => setViewDescription(e.target.value)}
                                    placeholder="Describe what this view shows..."
                                    rows={2}
                                    className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isDefault}
                                        onChange={e => setIsDefault(e.target.checked)}
                                        className="w-4 h-4 rounded border-foreground/30 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-foreground/70">Set as default view</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isShared}
                                        onChange={e => setIsShared(e.target.checked)}
                                        className="w-4 h-4 rounded border-foreground/30 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-foreground/70">Share with team</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Columns Tab */}
                    {activeTab === "columns" && (
                        <div className="space-y-2">
                            <p className="text-sm text-foreground/50 mb-4">
                                Drag to reorder. Toggle visibility for each column.
                            </p>

                            {columns
                                .sort((a, b) => a.order - b.order)
                                .map((column, index) => (
                                    <div
                                        key={column.id}
                                        className="flex items-center gap-3 p-3 bg-foreground/[0.02] border border-foreground/10 rounded-lg"
                                    >
                                        <button className="text-foreground/30 cursor-grab">
                                            <GripIcon />
                                        </button>

                                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={column.visible}
                                                onChange={() => toggleColumnVisibility(column.id)}
                                                className="w-4 h-4 rounded border-foreground/30 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-foreground">{column.label}</span>
                                        </label>

                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => moveColumn(index, "up")}
                                                disabled={index === 0}
                                                className="p-1 text-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                onClick={() => moveColumn(index, "down")}
                                                disabled={index === columns.length - 1}
                                                className="p-1 text-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors"
                                            >
                                                ↓
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* Filters Tab */}
                    {activeTab === "filters" && (
                        <div className="space-y-4">
                            {filters.length === 0 ? (
                                <p className="text-sm text-foreground/50 text-center py-8">
                                    No filters applied. Add a filter to narrow down your view.
                                </p>
                            ) : (
                                filters.map((filter, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <select
                                            value={filter.field}
                                            onChange={e => updateFilter(index, { field: e.target.value })}
                                            className="flex-1 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground text-sm"
                                        >
                                            {filterFields.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={filter.operator}
                                            onChange={e => updateFilter(index, { operator: e.target.value as ViewFilter["operator"] })}
                                            className="w-32 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground text-sm"
                                        >
                                            {filterOperators.map(op => (
                                                <option key={op.value} value={op.value}>{op.label}</option>
                                            ))}
                                        </select>

                                        <input
                                            type="text"
                                            value={filter.value as string}
                                            onChange={e => updateFilter(index, { value: e.target.value })}
                                            placeholder="Value"
                                            className="flex-1 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground placeholder-foreground/40 text-sm"
                                        />

                                        <button
                                            onClick={() => removeFilter(index)}
                                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))
                            )}

                            <button
                                onClick={addFilter}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
                            >
                                <PlusIcon />
                                Add Filter
                            </button>
                        </div>
                    )}

                    {/* Sort Tab */}
                    {activeTab === "sort" && (
                        <div className="space-y-4">
                            {sorts.map((sort, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="text-sm text-foreground/50 w-16">
                                        {index === 0 ? "Sort by" : "Then by"}
                                    </span>

                                    <select
                                        value={sort.field}
                                        onChange={e => updateSort(index, { field: e.target.value })}
                                        className="flex-1 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground text-sm"
                                    >
                                        {filterFields.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={sort.direction}
                                        onChange={e => updateSort(index, { direction: e.target.value as "asc" | "desc" })}
                                        className="w-32 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground text-sm"
                                    >
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>

                                    {sorts.length > 1 && (
                                        <button
                                            onClick={() => removeSort(index)}
                                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            <TrashIcon />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {sorts.length < 3 && (
                                <button
                                    onClick={addSort}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
                                >
                                    <PlusIcon />
                                    Add Sort Level
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-foreground/10">
                    <button
                        onClick={handleApply}
                        className="px-4 py-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
                    >
                        Apply Without Saving
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-foreground/70 hover:text-foreground bg-foreground/5 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            Save View
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============== View Selector Component ===============

interface ViewSelectorProps {
    views: SavedView[];
    currentViewId?: string;
    onSelectView: (view: SavedView) => void;
    onCreateNew: () => void;
    onEditView: (view: SavedView) => void;
    onDeleteView: (viewId: string) => void;
}

export function ViewSelector({
    views,
    currentViewId,
    onSelectView,
    onCreateNew,
    onEditView,
    onDeleteView,
}: ViewSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const currentView = views.find(v => v.id === currentViewId);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground hover:bg-foreground/10 transition-colors"
            >
                <span>{currentView?.name || "Default View"}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-foreground/10 rounded-lg shadow-xl z-50">
                        <div className="p-2">
                            <div className="text-xs font-medium text-foreground/50 px-2 py-1 uppercase">
                                My Views
                            </div>
                            {views.filter(v => !v.isShared).map(view => (
                                <div
                                    key={view.id}
                                    className={`flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer group ${view.id === currentViewId ? "bg-blue-500/10" : "hover:bg-foreground/5"
                                        }`}
                                    onClick={() => { onSelectView(view); setIsOpen(false); }}
                                >
                                    <div className="flex items-center gap-2">
                                        {view.isDefault && (
                                            <span className="text-xs text-blue-400">★</span>
                                        )}
                                        <span className="text-sm text-foreground">{view.name}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditView(view); }}
                                            className="p-1 text-foreground/50 hover:text-foreground"
                                        >
                                            ✎
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteView(view.id); }}
                                            className="p-1 text-red-400 hover:text-red-300"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {views.some(v => v.isShared) && (
                                <>
                                    <div className="text-xs font-medium text-foreground/50 px-2 py-1 mt-2 uppercase">
                                        Shared Views
                                    </div>
                                    {views.filter(v => v.isShared).map(view => (
                                        <div
                                            key={view.id}
                                            className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-foreground/5"
                                            onClick={() => { onSelectView(view); setIsOpen(false); }}
                                        >
                                            <span className="text-xs text-purple-400">⟳</span>
                                            <span className="text-sm text-foreground">{view.name}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        <div className="border-t border-foreground/10 p-2">
                            <button
                                onClick={() => { onCreateNew(); setIsOpen(false); }}
                                className="flex items-center gap-2 w-full px-2 py-2 text-sm text-blue-500 hover:bg-foreground/5 rounded-lg transition-colors"
                            >
                                <PlusIcon />
                                Create New View
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
