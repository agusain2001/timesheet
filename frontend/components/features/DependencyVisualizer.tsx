'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Link2, Link2Off, ArrowRight } from 'lucide-react';

// Task type for Gantt
export interface GanttTask {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    progress: number;
    color?: string;
    dependencies?: string[]; // IDs of tasks this depends on
}

// Dependency type
interface Dependency {
    from: string;
    to: string;
    type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
}

interface DependencyVisualizerProps {
    tasks: GanttTask[];
    dependencies: Dependency[];
    timelineStartDate: Date;
    dayWidth: number;
    rowHeight: number;
    onDependencyCreate?: (from: string, to: string) => void;
    onDependencyDelete?: (from: string, to: string) => void;
    showConflicts?: boolean;
}

// Calculate task position on timeline
function getTaskPosition(task: GanttTask, timelineStart: Date, dayWidth: number): { left: number; width: number } {
    const startDiff = Math.floor((task.startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
        left: startDiff * dayWidth,
        width: duration * dayWidth
    };
}

// Check for circular dependency
function hasCircularDependency(
    dependencies: Dependency[],
    from: string,
    to: string,
    visited: Set<string> = new Set()
): boolean {
    if (from === to) return true;
    if (visited.has(from)) return false;

    visited.add(from);

    // Find all dependencies where 'from' is the target
    const upstreamDeps = dependencies.filter(d => d.to === from);

    for (const dep of upstreamDeps) {
        if (hasCircularDependency(dependencies, dep.from, to, visited)) {
            return true;
        }
    }

    return false;
}

// Detect scheduling conflicts
function detectConflicts(tasks: GanttTask[], dependencies: Dependency[]): Map<string, string[]> {
    const conflicts = new Map<string, string[]>();

    for (const dep of dependencies) {
        const fromTask = tasks.find(t => t.id === dep.from);
        const toTask = tasks.find(t => t.id === dep.to);

        if (!fromTask || !toTask) continue;

        let hasConflict = false;
        let conflictMessage = '';

        switch (dep.type) {
            case 'finish-to-start':
                if (toTask.startDate < fromTask.endDate) {
                    hasConflict = true;
                    conflictMessage = `"${toTask.name}" starts before "${fromTask.name}" finishes`;
                }
                break;
            case 'start-to-start':
                if (toTask.startDate < fromTask.startDate) {
                    hasConflict = true;
                    conflictMessage = `"${toTask.name}" starts before "${fromTask.name}" starts`;
                }
                break;
            case 'finish-to-finish':
                if (toTask.endDate < fromTask.endDate) {
                    hasConflict = true;
                    conflictMessage = `"${toTask.name}" finishes before "${fromTask.name}" finishes`;
                }
                break;
            case 'start-to-finish':
                if (toTask.endDate < fromTask.startDate) {
                    hasConflict = true;
                    conflictMessage = `"${toTask.name}" finishes before "${fromTask.name}" starts`;
                }
                break;
        }

        if (hasConflict) {
            const existing = conflicts.get(dep.to) || [];
            existing.push(conflictMessage);
            conflicts.set(dep.to, existing);
        }
    }

    return conflicts;
}

export function DependencyVisualizer({
    tasks,
    dependencies,
    timelineStartDate,
    dayWidth,
    rowHeight,
    onDependencyCreate,
    onDependencyDelete,
    showConflicts = true
}: DependencyVisualizerProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragState, setDragState] = useState<{
        fromId: string;
        fromX: number;
        fromY: number;
        currentX: number;
        currentY: number;
    } | null>(null);
    const [hoveredDep, setHoveredDep] = useState<string | null>(null);

    // Calculate positions for all tasks
    const taskPositions = useMemo(() => {
        const positions = new Map<string, { left: number; width: number; top: number }>();

        tasks.forEach((task, index) => {
            const pos = getTaskPosition(task, timelineStartDate, dayWidth);
            positions.set(task.id, {
                ...pos,
                top: index * rowHeight + rowHeight / 2
            });
        });

        return positions;
    }, [tasks, timelineStartDate, dayWidth, rowHeight]);

    // Detect conflicts
    const conflicts = useMemo(() => {
        return showConflicts ? detectConflicts(tasks, dependencies) : new Map();
    }, [tasks, dependencies, showConflicts]);

    // Generate SVG path for dependency arrow
    const getDependencyPath = (from: string, to: string, type: string): string => {
        const fromPos = taskPositions.get(from);
        const toPos = taskPositions.get(to);

        if (!fromPos || !toPos) return '';

        let startX: number, startY: number, endX: number, endY: number;

        switch (type) {
            case 'finish-to-start':
                startX = fromPos.left + fromPos.width;
                startY = fromPos.top;
                endX = toPos.left;
                endY = toPos.top;
                break;
            case 'start-to-start':
                startX = fromPos.left;
                startY = fromPos.top;
                endX = toPos.left;
                endY = toPos.top;
                break;
            case 'finish-to-finish':
                startX = fromPos.left + fromPos.width;
                startY = fromPos.top;
                endX = toPos.left + toPos.width;
                endY = toPos.top;
                break;
            case 'start-to-finish':
                startX = fromPos.left;
                startY = fromPos.top;
                endX = toPos.left + toPos.width;
                endY = toPos.top;
                break;
            default:
                startX = fromPos.left + fromPos.width;
                startY = fromPos.top;
                endX = toPos.left;
                endY = toPos.top;
        }

        // Create curved path
        const midX = (startX + endX) / 2;
        const controlOffset = Math.min(50, Math.abs(endX - startX) / 3);

        if (startY === endY) {
            // Same row - simple horizontal line with arrow
            return `M ${startX} ${startY} L ${endX - 8} ${endY}`;
        } else {
            // Different rows - curved path
            return `M ${startX} ${startY} 
              C ${startX + controlOffset} ${startY}, 
                ${endX - controlOffset} ${endY}, 
                ${endX - 8} ${endY}`;
        }
    };

    // Handle drag start for creating new dependency
    const handleDragStart = (taskId: string, e: React.MouseEvent) => {
        if (!onDependencyCreate) return;

        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;

        const pos = taskPositions.get(taskId);
        if (!pos) return;

        setDragState({
            fromId: taskId,
            fromX: pos.left + pos.width,
            fromY: pos.top,
            currentX: e.clientX - rect.left,
            currentY: e.clientY - rect.top
        });
    };

    // Handle mouse move during drag
    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;

            setDragState(prev => prev ? {
                ...prev,
                currentX: e.clientX - rect.left,
                currentY: e.clientY - rect.top
            } : null);
        };

        const handleMouseUp = (e: MouseEvent) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;

            // Find task at drop position
            const dropY = e.clientY - rect.top;
            const taskIndex = Math.floor(dropY / rowHeight);
            const targetTask = tasks[taskIndex];

            if (targetTask && targetTask.id !== dragState.fromId) {
                // Check for circular dependency
                if (!hasCircularDependency(dependencies, targetTask.id, dragState.fromId)) {
                    onDependencyCreate?.(dragState.fromId, targetTask.id);
                } else {
                    console.warn('Circular dependency detected');
                }
            }

            setDragState(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, tasks, rowHeight, dependencies, onDependencyCreate]);

    // Calculate SVG dimensions
    const svgWidth = Math.max(...Array.from(taskPositions.values()).map(p => p.left + p.width)) + 100;
    const svgHeight = tasks.length * rowHeight;

    return (
        <div className="dependency-visualizer relative">
            <svg
                ref={svgRef}
                width={svgWidth}
                height={svgHeight}
                className="absolute inset-0 pointer-events-none"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    {/* Arrow marker */}
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill="#60a5fa"
                        />
                    </marker>
                    <marker
                        id="arrowhead-conflict"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill="#f87171"
                        />
                    </marker>
                    <marker
                        id="arrowhead-hover"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill="#a78bfa"
                        />
                    </marker>
                </defs>

                {/* Dependency arrows */}
                {dependencies.map((dep, idx) => {
                    const path = getDependencyPath(dep.from, dep.to, dep.type);
                    const hasConflict = conflicts.has(dep.to);
                    const isHovered = hoveredDep === `${dep.from}-${dep.to}`;
                    const depKey = `${dep.from}-${dep.to}`;

                    return (
                        <g key={depKey}>
                            {/* Invisible wider path for easier hover */}
                            <path
                                d={path}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={16}
                                className="pointer-events-auto cursor-pointer"
                                onMouseEnter={() => setHoveredDep(depKey)}
                                onMouseLeave={() => setHoveredDep(null)}
                                onClick={() => onDependencyDelete?.(dep.from, dep.to)}
                            />
                            {/* Visible path */}
                            <path
                                d={path}
                                fill="none"
                                stroke={hasConflict ? '#f87171' : isHovered ? '#a78bfa' : '#60a5fa'}
                                strokeWidth={isHovered ? 3 : 2}
                                strokeDasharray={hasConflict ? '5,5' : 'none'}
                                markerEnd={`url(#arrowhead${hasConflict ? '-conflict' : isHovered ? '-hover' : ''})`}
                                className="transition-all duration-200"
                            />
                        </g>
                    );
                })}

                {/* Drag preview line */}
                {dragState && (
                    <line
                        x1={dragState.fromX}
                        y1={dragState.fromY}
                        x2={dragState.currentX}
                        y2={dragState.currentY}
                        stroke="#a78bfa"
                        strokeWidth={2}
                        strokeDasharray="5,5"
                    />
                )}
            </svg>

            {/* Dependency connection points */}
            {onDependencyCreate && tasks.map((task) => {
                const pos = taskPositions.get(task.id);
                if (!pos) return null;

                return (
                    <div
                        key={`conn-${task.id}`}
                        className="absolute w-3 h-3 bg-blue-500 rounded-full cursor-crosshair hover:bg-purple-500 transition-colors pointer-events-auto z-10 opacity-0 hover:opacity-100"
                        style={{
                            left: pos.left + pos.width - 6,
                            top: pos.top - 6
                        }}
                        onMouseDown={(e) => handleDragStart(task.id, e)}
                    />
                );
            })}

            {/* Conflict indicators */}
            {showConflicts && Array.from(conflicts.entries()).map(([taskId, messages]) => {
                const pos = taskPositions.get(taskId);
                if (!pos) return null;

                return (
                    <div
                        key={`conflict-${taskId}`}
                        className="absolute group"
                        style={{
                            left: pos.left - 24,
                            top: pos.top - 12
                        }}
                    >
                        <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                        <div className="absolute left-full ml-2 top-0 hidden group-hover:block z-50">
                            <div className="bg-red-900/90 border border-red-500/50 rounded-lg p-3 text-sm min-w-[200px]">
                                <div className="font-medium text-red-300 mb-1">Scheduling Conflict</div>
                                {messages.map((msg: string, idx: number) => (
                                    <div key={idx} className="text-red-200">{msg}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Dependency management panel
interface DependencyPanelProps {
    tasks: GanttTask[];
    dependencies: Dependency[];
    onAdd: (from: string, to: string, type: Dependency['type']) => void;
    onRemove: (from: string, to: string) => void;
}

export function DependencyPanel({ tasks, dependencies, onAdd, onRemove }: DependencyPanelProps) {
    const [fromTask, setFromTask] = useState('');
    const [toTask, setToTask] = useState('');
    const [depType, setDepType] = useState<Dependency['type']>('finish-to-start');

    const handleAdd = () => {
        if (fromTask && toTask && fromTask !== toTask) {
            // Check for existing dependency
            const exists = dependencies.some(d => d.from === fromTask && d.to === toTask);
            if (!exists) {
                onAdd(fromTask, toTask, depType);
                setFromTask('');
                setToTask('');
            }
        }
    };

    return (
        <div className="dependency-panel bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-400" />
                Task Dependencies
            </h3>

            {/* Add new dependency */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                <select
                    value={fromTask}
                    onChange={(e) => setFromTask(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm"
                >
                    <option value="">From task...</option>
                    {tasks.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

                <select
                    value={depType}
                    onChange={(e) => setDepType(e.target.value as Dependency['type'])}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm"
                >
                    <option value="finish-to-start">Finish → Start</option>
                    <option value="start-to-start">Start → Start</option>
                    <option value="finish-to-finish">Finish → Finish</option>
                    <option value="start-to-finish">Start → Finish</option>
                </select>

                <select
                    value={toTask}
                    onChange={(e) => setToTask(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm"
                >
                    <option value="">To task...</option>
                    {tasks.filter(t => t.id !== fromTask).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

                <button
                    onClick={handleAdd}
                    disabled={!fromTask || !toTask}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg px-3 py-1.5 text-sm transition-colors"
                >
                    <Link2 className="w-4 h-4" />
                    Add
                </button>
            </div>

            {/* Existing dependencies */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {dependencies.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                        No dependencies defined
                    </div>
                ) : (
                    dependencies.map(dep => {
                        const fromName = tasks.find(t => t.id === dep.from)?.name || 'Unknown';
                        const toName = tasks.find(t => t.id === dep.to)?.name || 'Unknown';

                        return (
                            <div
                                key={`${dep.from}-${dep.to}`}
                                className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2"
                            >
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="truncate max-w-[120px]">{fromName}</span>
                                    <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                    <span className="truncate max-w-[120px]">{toName}</span>
                                    <span className="text-xs text-gray-500">({dep.type})</span>
                                </div>
                                <button
                                    onClick={() => onRemove(dep.from, dep.to)}
                                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                    title="Remove dependency"
                                >
                                    <Link2Off className="w-4 h-4 text-red-400" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
