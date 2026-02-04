'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Filter, X, Download, BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Generic data types for drill-down
export interface DrillDownColumn<T = any> {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: T, level: number) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface DrillDownRow<T = any> {
    id: string;
    data: T;
    children?: DrillDownRow<T>[];
    level?: number;
}

interface DrillDownReportProps<T = any> {
    title: string;
    columns: DrillDownColumn<T>[];
    data: DrillDownRow<T>[];
    defaultExpanded?: boolean;
    maxDepth?: number;
    onRowClick?: (row: DrillDownRow<T>) => void;
    onExport?: (format: 'csv' | 'json') => void;
    showAggregations?: boolean;
    className?: string;
}

// Filter state
interface FilterState {
    column: string;
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
    value: string;
}

export function DrillDownReport<T extends Record<string, any>>({
    title,
    columns,
    data,
    defaultExpanded = false,
    maxDepth = 5,
    onRowClick,
    onExport,
    showAggregations = true,
    className = ''
}: DrillDownReportProps<T>) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [filters, setFilters] = useState<FilterState[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Toggle row expansion
    const toggleRow = useCallback((rowId: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(rowId)) {
                next.delete(rowId);
            } else {
                next.add(rowId);
            }
            return next;
        });
    }, []);

    // Expand all rows
    const expandAll = useCallback(() => {
        const collectIds = (rows: DrillDownRow<T>[]): string[] => {
            return rows.flatMap(row => [row.id, ...(row.children ? collectIds(row.children) : [])]);
        };
        setExpandedRows(new Set(collectIds(data)));
    }, [data]);

    // Collapse all rows
    const collapseAll = useCallback(() => {
        setExpandedRows(new Set());
    }, []);

    // Apply filters
    const applyFilter = (row: DrillDownRow<T>): boolean => {
        if (filters.length === 0) return true;

        return filters.every(filter => {
            const value = row.data[filter.column];
            const filterValue = filter.value.toLowerCase();
            const strValue = String(value).toLowerCase();

            switch (filter.operator) {
                case 'equals':
                    return strValue === filterValue;
                case 'contains':
                    return strValue.includes(filterValue);
                case 'gt':
                    return Number(value) > Number(filter.value);
                case 'lt':
                    return Number(value) < Number(filter.value);
                case 'gte':
                    return Number(value) >= Number(filter.value);
                case 'lte':
                    return Number(value) <= Number(filter.value);
                default:
                    return true;
            }
        });
    };

    // Filter data recursively
    const filteredData = useMemo(() => {
        const filterRows = (rows: DrillDownRow<T>[]): DrillDownRow<T>[] => {
            const result: DrillDownRow<T>[] = [];

            for (const row of rows) {
                const filteredChildren = row.children ? filterRows(row.children) : undefined;
                const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;
                const matchesSelf = applyFilter(row);

                if (matchesSelf || hasMatchingChildren) {
                    result.push({
                        ...row,
                        children: filteredChildren
                    });
                }
            }

            return result;
        };

        return filterRows(data);
    }, [data, filters]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig) return filteredData;

        const sortRows = (rows: DrillDownRow<T>[]): DrillDownRow<T>[] => {
            const sorted = [...rows].sort((a, b) => {
                const aVal = a.data[sortConfig.key];
                const bVal = b.data[sortConfig.key];

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });

            return sorted.map(row => ({
                ...row,
                children: row.children ? sortRows(row.children) : undefined
            }));
        };

        return sortRows(filteredData);
    }, [filteredData, sortConfig]);

    // Calculate aggregations
    const aggregations = useMemo(() => {
        if (!showAggregations) return null;

        const result: Record<string, number> = {};

        const aggregate = (rows: DrillDownRow<T>[]) => {
            rows.forEach(row => {
                columns.forEach(col => {
                    if (col.aggregation) {
                        const value = Number(row.data[col.key]) || 0;
                        const key = col.key;

                        switch (col.aggregation) {
                            case 'sum':
                                result[key] = (result[key] || 0) + value;
                                break;
                            case 'count':
                                result[key] = (result[key] || 0) + 1;
                                break;
                            case 'min':
                                result[key] = Math.min(result[key] ?? Infinity, value);
                                break;
                            case 'max':
                                result[key] = Math.max(result[key] ?? -Infinity, value);
                                break;
                            case 'avg':
                                result[`${key}_sum`] = (result[`${key}_sum`] || 0) + value;
                                result[`${key}_count`] = (result[`${key}_count`] || 0) + 1;
                                result[key] = result[`${key}_sum`] / result[`${key}_count`];
                                break;
                        }
                    }
                });

                if (row.children) aggregate(row.children);
            });
        };

        aggregate(sortedData);
        return result;
    }, [sortedData, columns, showAggregations]);

    // Toggle sort
    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                if (prev.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    // Add filter
    const addFilter = (column: string) => {
        setFilters(prev => [
            ...prev,
            { column, operator: 'contains', value: '' }
        ]);
        setShowFilterPanel(true);
    };

    // Remove filter
    const removeFilter = (index: number) => {
        setFilters(prev => prev.filter((_, i) => i !== index));
    };

    // Update filter
    const updateFilter = (index: number, updates: Partial<FilterState>) => {
        setFilters(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
    };

    // Render a single row
    const renderRow = (row: DrillDownRow<T>, level: number = 0): React.ReactNode => {
        const hasChildren = row.children && row.children.length > 0;
        const isExpanded = expandedRows.has(row.id);
        const indent = level * 24;

        return (
            <React.Fragment key={row.id}>
                <tr
                    className={`
            border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer
            ${level === 0 ? 'bg-gray-800/30' : ''}
            ${level === 1 ? 'bg-gray-800/20' : ''}
            ${level >= 2 ? 'bg-gray-800/10' : ''}
          `}
                    onClick={() => {
                        if (hasChildren) {
                            toggleRow(row.id);
                        }
                        onRowClick?.(row);
                    }}
                >
                    {columns.map((col, colIndex) => (
                        <td
                            key={col.key}
                            className={`
                px-4 py-3 text-sm
                ${col.align === 'center' ? 'text-center' : ''}
                ${col.align === 'right' ? 'text-right' : ''}
              `}
                            style={colIndex === 0 ? { paddingLeft: `${16 + indent}px` } : undefined}
                        >
                            {colIndex === 0 && (
                                <span className="inline-flex items-center gap-2">
                                    {hasChildren && (
                                        <span className="inline-flex w-4 h-4 items-center justify-center">
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            )}
                                        </span>
                                    )}
                                    {!hasChildren && level > 0 && <span className="w-4" />}
                                    {col.render ? col.render(row.data[col.key], row.data, level) : row.data[col.key]}
                                </span>
                            )}
                            {colIndex !== 0 && (
                                col.render ? col.render(row.data[col.key], row.data, level) : row.data[col.key]
                            )}
                        </td>
                    ))}
                </tr>

                {hasChildren && isExpanded && row.children!.map(child => renderRow(child, level + 1))}
            </React.Fragment>
        );
    };

    // Variance indicator
    const VarianceIndicator = ({ value, baseline }: { value: number; baseline: number }) => {
        const diff = value - baseline;
        const pct = baseline !== 0 ? ((diff / baseline) * 100).toFixed(1) : '0';

        if (diff > 0) {
            return (
                <span className="inline-flex items-center gap-1 text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    +{pct}%
                </span>
            );
        } else if (diff < 0) {
            return (
                <span className="inline-flex items-center gap-1 text-red-400">
                    <TrendingDown className="w-3 h-3" />
                    {pct}%
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 text-gray-400">
                <Minus className="w-3 h-3" />
                0%
            </span>
        );
    };

    return (
        <div className={`drill-down-report bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart2 className="w-5 h-5 text-blue-400" />
                    <h3 className="font-medium">{title}</h3>
                    <span className="text-sm text-gray-500">
                        {sortedData.length} {sortedData.length === 1 ? 'item' : 'items'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={expandAll}
                        className="px-2 py-1 text-xs hover:bg-gray-700 rounded transition-colors"
                    >
                        Expand All
                    </button>
                    <button
                        onClick={collapseAll}
                        className="px-2 py-1 text-xs hover:bg-gray-700 rounded transition-colors"
                    >
                        Collapse All
                    </button>
                    <button
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className={`p-1.5 rounded transition-colors ${filters.length > 0 ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700'}`}
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                    {onExport && (
                        <div className="relative group">
                            <button className="p-1.5 hover:bg-gray-700 rounded transition-colors">
                                <Download className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10">
                                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1">
                                    <button
                                        onClick={() => onExport('csv')}
                                        className="block w-full px-4 py-1.5 text-sm text-left hover:bg-gray-700"
                                    >
                                        Export CSV
                                    </button>
                                    <button
                                        onClick={() => onExport('json')}
                                        className="block w-full px-4 py-1.5 text-sm text-left hover:bg-gray-700"
                                    >
                                        Export JSON
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter panel */}
            {showFilterPanel && (
                <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-800/30">
                    <div className="flex flex-wrap gap-2">
                        {filters.map((filter, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1.5"
                            >
                                <select
                                    value={filter.column}
                                    onChange={(e) => updateFilter(idx, { column: e.target.value })}
                                    className="bg-transparent border-none text-sm focus:outline-none"
                                >
                                    {columns.filter(c => c.filterable !== false).map(col => (
                                        <option key={col.key} value={col.key}>{col.label}</option>
                                    ))}
                                </select>

                                <select
                                    value={filter.operator}
                                    onChange={(e) => updateFilter(idx, { operator: e.target.value as FilterState['operator'] })}
                                    className="bg-transparent border-none text-sm focus:outline-none"
                                >
                                    <option value="contains">contains</option>
                                    <option value="equals">equals</option>
                                    <option value="gt">&gt;</option>
                                    <option value="lt">&lt;</option>
                                    <option value="gte">≥</option>
                                    <option value="lte">≤</option>
                                </select>

                                <input
                                    type="text"
                                    value={filter.value}
                                    onChange={(e) => updateFilter(idx, { value: e.target.value })}
                                    placeholder="value..."
                                    className="bg-gray-600 border-none rounded px-2 py-0.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />

                                <button
                                    onClick={() => removeFilter(idx)}
                                    className="p-0.5 hover:bg-gray-600 rounded"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={() => addFilter(columns[0].key)}
                            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                        >
                            + Add Filter
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-700/50 bg-gray-800/50">
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`
                    px-4 py-3 text-sm font-medium text-gray-400
                    ${col.align === 'center' ? 'text-center' : ''}
                    ${col.align === 'right' ? 'text-right' : 'text-left'}
                    ${col.sortable !== false ? 'cursor-pointer hover:text-white' : ''}
                  `}
                                    style={{ width: col.width }}
                                    onClick={() => col.sortable !== false && handleSort(col.key)}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {col.label}
                                        {sortConfig?.key === col.key && (
                                            <span className="text-blue-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map(row => renderRow(row))}
                    </tbody>
                    {showAggregations && aggregations && (
                        <tfoot>
                            <tr className="border-t border-gray-600 bg-gray-800/50 font-medium">
                                {columns.map((col, idx) => (
                                    <td
                                        key={col.key}
                                        className={`
                      px-4 py-3 text-sm
                      ${col.align === 'center' ? 'text-center' : ''}
                      ${col.align === 'right' ? 'text-right' : ''}
                    `}
                                    >
                                        {idx === 0 && 'Total'}
                                        {col.aggregation && aggregations[col.key] !== undefined && (
                                            <span className="text-blue-400">
                                                {typeof aggregations[col.key] === 'number'
                                                    ? aggregations[col.key].toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                    : aggregations[col.key]
                                                }
                                            </span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Empty state */}
            {sortedData.length === 0 && (
                <div className="px-4 py-12 text-center text-gray-500">
                    <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No data matching your filters</p>
                </div>
            )}
        </div>
    );
}

// Cell renderers for common use cases
export const CellRenderers = {
    currency: (value: number) => (
        <span className="font-mono">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    ),

    percentage: (value: number) => (
        <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
            {value >= 0 ? '+' : ''}{value.toFixed(1)}%
        </span>
    ),

    hours: (value: number) => (
        <span className="font-mono">{value.toFixed(1)}h</span>
    ),

    status: (value: string) => {
        const colors: Record<string, string> = {
            'completed': 'bg-green-500/20 text-green-400',
            'in_progress': 'bg-blue-500/20 text-blue-400',
            'pending': 'bg-yellow-500/20 text-yellow-400',
            'overdue': 'bg-red-500/20 text-red-400'
        };

        return (
            <span className={`px-2 py-0.5 rounded text-xs ${colors[value] || 'bg-gray-500/20 text-gray-400'}`}>
                {value.replace('_', ' ')}
            </span>
        );
    },

    progress: (value: number) => (
        <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${value >= 100 ? 'bg-green-500' : value >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}
                    style={{ width: `${Math.min(100, value)}%` }}
                />
            </div>
            <span className="text-xs text-gray-400">{value}%</span>
        </div>
    )
};
