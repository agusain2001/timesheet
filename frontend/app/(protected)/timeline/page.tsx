"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Types ===============

interface GanttTask {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    progress: number;
    status: "not_started" | "in_progress" | "completed" | "blocked";
    priority: "low" | "medium" | "high" | "critical";
    assignee?: {
        id: string;
        name: string;
        avatar?: string;
    };
    dependencies: string[];
    project?: string;
    isMilestone?: boolean;
}

interface GanttProject {
    id: string;
    name: string;
    color: string;
    tasks: GanttTask[];
}

// =============== Icons ===============

const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const ZoomInIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
);

const ZoomOutIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
);

const FilterIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const DiamondIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
    </svg>
);

// =============== Mock Data ===============

const generateMockData = (): GanttProject[] => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    return [
        {
            id: "proj-1",
            name: "Website Redesign",
            color: "#3b82f6",
            tasks: [
                { id: "t1", name: "UI/UX Research", startDate: formatDate(startOfMonth), endDate: formatDate(addDays(startOfMonth, 5)), progress: 100, status: "completed", priority: "high", dependencies: [], assignee: { id: "u1", name: "Alice" } },
                { id: "t2", name: "Wireframing", startDate: formatDate(addDays(startOfMonth, 6)), endDate: formatDate(addDays(startOfMonth, 12)), progress: 100, status: "completed", priority: "high", dependencies: ["t1"], assignee: { id: "u2", name: "Bob" } },
                { id: "t3", name: "Visual Design", startDate: formatDate(addDays(startOfMonth, 13)), endDate: formatDate(addDays(startOfMonth, 22)), progress: 65, status: "in_progress", priority: "high", dependencies: ["t2"], assignee: { id: "u1", name: "Alice" } },
                { id: "t4", name: "Frontend Development", startDate: formatDate(addDays(startOfMonth, 18)), endDate: formatDate(addDays(startOfMonth, 35)), progress: 30, status: "in_progress", priority: "critical", dependencies: ["t2"], assignee: { id: "u3", name: "Charlie" } },
                { id: "m1", name: "Design Review", startDate: formatDate(addDays(startOfMonth, 23)), endDate: formatDate(addDays(startOfMonth, 23)), progress: 0, status: "not_started", priority: "high", dependencies: ["t3"], isMilestone: true },
                { id: "t5", name: "Testing & QA", startDate: formatDate(addDays(startOfMonth, 36)), endDate: formatDate(addDays(startOfMonth, 42)), progress: 0, status: "not_started", priority: "medium", dependencies: ["t4"], assignee: { id: "u4", name: "Diana" } },
            ],
        },
        {
            id: "proj-2",
            name: "Mobile App v2",
            color: "#8b5cf6",
            tasks: [
                { id: "t6", name: "Requirements Analysis", startDate: formatDate(addDays(startOfMonth, 2)), endDate: formatDate(addDays(startOfMonth, 8)), progress: 100, status: "completed", priority: "high", dependencies: [], assignee: { id: "u5", name: "Eve" } },
                { id: "t7", name: "API Design", startDate: formatDate(addDays(startOfMonth, 9)), endDate: formatDate(addDays(startOfMonth, 16)), progress: 80, status: "in_progress", priority: "high", dependencies: ["t6"], assignee: { id: "u3", name: "Charlie" } },
                { id: "t8", name: "Backend Development", startDate: formatDate(addDays(startOfMonth, 14)), endDate: formatDate(addDays(startOfMonth, 30)), progress: 45, status: "in_progress", priority: "critical", dependencies: ["t7"], assignee: { id: "u3", name: "Charlie" } },
                { id: "t9", name: "Mobile UI Implementation", startDate: formatDate(addDays(startOfMonth, 17)), endDate: formatDate(addDays(startOfMonth, 38)), progress: 20, status: "in_progress", priority: "high", dependencies: ["t7"], assignee: { id: "u6", name: "Frank" } },
                { id: "m2", name: "Beta Release", startDate: formatDate(addDays(startOfMonth, 40)), endDate: formatDate(addDays(startOfMonth, 40)), progress: 0, status: "not_started", priority: "critical", dependencies: ["t8", "t9"], isMilestone: true },
            ],
        },
    ];
};

// =============== Helper Functions ===============

const getDateRange = (projects: GanttProject[], padding: number = 7): { start: Date; end: Date } => {
    let minDate = new Date();
    let maxDate = new Date();

    projects.forEach(project => {
        project.tasks.forEach(task => {
            const startDate = new Date(task.startDate);
            const endDate = new Date(task.endDate);
            if (startDate < minDate) minDate = startDate;
            if (endDate > maxDate) maxDate = endDate;
        });
    });

    // Add padding
    minDate.setDate(minDate.getDate() - padding);
    maxDate.setDate(maxDate.getDate() + padding);

    return { start: minDate, end: maxDate };
};

const getDaysBetween = (start: Date, end: Date): number => {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
};

const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

// =============== Components ===============

interface TimelineHeaderProps {
    startDate: Date;
    days: number;
    dayWidth: number;
    scrollLeft: number;
}

function TimelineHeader({ startDate, days, dayWidth, scrollLeft }: TimelineHeaderProps) {
    const months: { name: string; days: number; startDay: number }[] = [];
    let currentMonth = -1;

    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const month = date.getMonth();

        if (month !== currentMonth) {
            months.push({
                name: formatMonthYear(date),
                days: 1,
                startDay: i,
            });
            currentMonth = month;
        } else {
            months[months.length - 1].days++;
        }
    }

    return (
        <div className="sticky top-0 z-20 bg-background border-b border-foreground/10">
            {/* Month row */}
            <div className="flex h-8 border-b border-foreground/10">
                {months.map((month, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-center text-sm font-medium text-foreground/70 border-r border-foreground/10"
                        style={{ width: month.days * dayWidth }}
                    >
                        {month.name}
                    </div>
                ))}
            </div>

            {/* Days row */}
            <div className="flex h-8">
                {Array.from({ length: days }, (_, i) => {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + i);
                    const weekend = isWeekend(date);
                    const today = isToday(date);

                    return (
                        <div
                            key={i}
                            className={`flex items-center justify-center text-xs border-r border-foreground/5 ${today ? "bg-blue-500/20 text-blue-400 font-bold" :
                                    weekend ? "bg-foreground/5 text-foreground/40" : "text-foreground/50"
                                }`}
                            style={{ width: dayWidth }}
                        >
                            {date.getDate()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface GanttBarProps {
    task: GanttTask;
    startDate: Date;
    dayWidth: number;
    projectColor: string;
    onTaskClick: (task: GanttTask) => void;
}

function GanttBar({ task, startDate, dayWidth, projectColor, onTaskClick }: GanttBarProps) {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const offsetDays = getDaysBetween(startDate, taskStart);
    const durationDays = getDaysBetween(taskStart, taskEnd) + 1;

    const left = offsetDays * dayWidth;
    const width = durationDays * dayWidth - 4;

    const statusColors = {
        not_started: "bg-gray-500",
        in_progress: "bg-blue-500",
        completed: "bg-emerald-500",
        blocked: "bg-red-500",
    };

    if (task.isMilestone) {
        return (
            <div
                className="absolute top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
                style={{ left: left + dayWidth / 2 - 8 }}
                onClick={() => onTaskClick(task)}
            >
                <div className="text-purple-500">
                    <DiamondIcon />
                </div>
            </div>
        );
    }

    return (
        <div
            className="absolute top-1/2 -translate-y-1/2 h-8 rounded cursor-pointer group hover:shadow-lg transition-shadow"
            style={{
                left,
                width: Math.max(width, 20),
                backgroundColor: `${projectColor}30`,
                border: `2px solid ${projectColor}`,
            }}
            onClick={() => onTaskClick(task)}
        >
            {/* Progress fill */}
            <div
                className="absolute inset-0 rounded-sm opacity-60"
                style={{
                    width: `${task.progress}%`,
                    backgroundColor: projectColor,
                }}
            />

            {/* Task name */}
            {width > 60 && (
                <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-foreground truncate">
                    {task.name}
                </span>
            )}

            {/* Assignee avatar */}
            {task.assignee && width > 100 && (
                <div
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-foreground/20 flex items-center justify-center text-[10px] font-bold"
                    title={task.assignee.name}
                >
                    {task.assignee.name[0]}
                </div>
            )}

            {/* Tooltip on hover */}
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-30">
                <div className="bg-background border border-foreground/20 rounded-lg shadow-xl p-3 min-w-48">
                    <p className="font-medium text-foreground text-sm">{task.name}</p>
                    <p className="text-xs text-foreground/50 mt-1">
                        {task.startDate} → {task.endDate}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[task.status]} text-white`}>
                            {task.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-foreground/60">{task.progress}%</span>
                    </div>
                    {task.assignee && (
                        <p className="text-xs text-foreground/50 mt-1">👤 {task.assignee.name}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

interface DependencyLineProps {
    fromTask: GanttTask;
    toTask: GanttTask;
    startDate: Date;
    dayWidth: number;
    rowHeight: number;
    taskRowMap: Map<string, number>;
}

function DependencyLine({ fromTask, toTask, startDate, dayWidth, rowHeight, taskRowMap }: DependencyLineProps) {
    const fromEnd = new Date(fromTask.endDate);
    const toStart = new Date(toTask.startDate);

    const fromX = getDaysBetween(startDate, fromEnd) * dayWidth + dayWidth;
    const toX = getDaysBetween(startDate, toStart) * dayWidth;

    const fromRow = taskRowMap.get(fromTask.id) || 0;
    const toRow = taskRowMap.get(toTask.id) || 0;

    const fromY = fromRow * rowHeight + rowHeight / 2;
    const toY = toRow * rowHeight + rowHeight / 2;

    // Simple path: horizontal then vertical then horizontal
    const midX = (fromX + toX) / 2;

    const pathD = `M ${fromX} ${fromY} 
                   L ${midX} ${fromY} 
                   L ${midX} ${toY} 
                   L ${toX - 4} ${toY}`;

    return (
        <g>
            <path
                d={pathD}
                fill="none"
                stroke="#6b7280"
                strokeWidth="1.5"
                strokeDasharray="4,2"
                markerEnd="url(#arrowhead)"
            />
        </g>
    );
}

interface TaskRowProps {
    project: GanttProject;
    task: GanttTask;
    isFirst: boolean;
    isCollapsed: boolean;
    onToggle: () => void;
}

function TaskRow({ project, task, isFirst, isCollapsed, onToggle }: TaskRowProps) {
    return (
        <div className="flex items-center h-10 border-b border-foreground/5 hover:bg-foreground/[0.02]">
            {/* Project indicator */}
            {isFirst ? (
                <button
                    onClick={onToggle}
                    className="w-6 h-6 flex items-center justify-center text-foreground/50 hover:text-foreground"
                >
                    <svg
                        className={`w-4 h-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            ) : (
                <div className="w-6" />
            )}

            {/* Color indicator */}
            <div
                className="w-1 h-6 rounded-full mr-2"
                style={{ backgroundColor: project.color }}
            />

            {/* Task/Project name */}
            <div className="flex-1 truncate">
                {isFirst ? (
                    <span className="font-medium text-foreground text-sm">{project.name}</span>
                ) : (
                    <span className="text-sm text-foreground/70 pl-2">{task.name}</span>
                )}
            </div>

            {/* Status indicator */}
            {!isFirst && (
                <div className={`w-2 h-2 rounded-full mr-2 ${task.status === "completed" ? "bg-emerald-500" :
                        task.status === "in_progress" ? "bg-blue-500" :
                            task.status === "blocked" ? "bg-red-500" : "bg-gray-400"
                    }`} />
            )}
        </div>
    );
}

// =============== Main Component ===============

export default function TimelinePage() {
    const [projects, setProjects] = useState<GanttProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [dayWidth, setDayWidth] = useState(32);
    const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
    const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
    const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setProjects(generateMockData());
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Calculate timeline dimensions
    const dateRange = projects.length > 0 ? getDateRange(projects) : { start: new Date(), end: new Date() };
    const totalDays = getDaysBetween(dateRange.start, dateRange.end);
    const rowHeight = 40;

    // Build task row map for dependency lines
    const taskRowMap = new Map<string, number>();
    let rowIndex = 0;
    projects.forEach(project => {
        if (!collapsedProjects.has(project.id)) {
            project.tasks.forEach(task => {
                taskRowMap.set(task.id, rowIndex);
                rowIndex++;
            });
        } else {
            rowIndex++; // Just the project header
        }
    });

    const toggleProject = (projectId: string) => {
        setCollapsedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollLeft(e.currentTarget.scrollLeft);
    };

    const zoomIn = () => setDayWidth(prev => Math.min(prev + 8, 64));
    const zoomOut = () => setDayWidth(prev => Math.max(prev - 8, 16));

    const scrollToToday = () => {
        const today = new Date();
        const daysFromStart = getDaysBetween(dateRange.start, today);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = daysFromStart * dayWidth - 200;
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Timeline</h1>
                        <p className="text-foreground/60 mt-1">Gantt chart view with task dependencies</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View mode */}
                        <div className="flex items-center bg-foreground/5 rounded-lg p-1">
                            {(["day", "week", "month"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === mode
                                            ? "bg-blue-600 text-white"
                                            : "text-foreground/70 hover:text-foreground"
                                        }`}
                                >
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Zoom controls */}
                        <div className="flex items-center gap-1 bg-foreground/5 rounded-lg p-1">
                            <button
                                onClick={zoomOut}
                                className="p-1.5 text-foreground/60 hover:text-foreground rounded transition-colors"
                                title="Zoom out"
                            >
                                <ZoomOutIcon />
                            </button>
                            <button
                                onClick={zoomIn}
                                className="p-1.5 text-foreground/60 hover:text-foreground rounded transition-colors"
                                title="Zoom in"
                            >
                                <ZoomInIcon />
                            </button>
                        </div>

                        {/* Today button */}
                        <button
                            onClick={scrollToToday}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Gantt Chart */}
                <div className="flex-1 bg-background border border-foreground/10 rounded-xl overflow-hidden flex">
                    {/* Task list sidebar */}
                    <div className="w-64 flex-shrink-0 border-r border-foreground/10 overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-background border-b border-foreground/10">
                            <div className="h-8 flex items-center px-3 text-sm font-medium text-foreground/50 border-b border-foreground/10">
                                Projects & Tasks
                            </div>
                            <div className="h-8" /> {/* Spacer for days row */}
                        </div>

                        {/* Task rows */}
                        {projects.map(project => (
                            <div key={project.id}>
                                {/* Project header */}
                                <TaskRow
                                    project={project}
                                    task={project.tasks[0]}
                                    isFirst={true}
                                    isCollapsed={collapsedProjects.has(project.id)}
                                    onToggle={() => toggleProject(project.id)}
                                />

                                {/* Task rows */}
                                {!collapsedProjects.has(project.id) &&
                                    project.tasks.map(task => (
                                        <TaskRow
                                            key={task.id}
                                            project={project}
                                            task={task}
                                            isFirst={false}
                                            isCollapsed={false}
                                            onToggle={() => { }}
                                        />
                                    ))
                                }
                            </div>
                        ))}
                    </div>

                    {/* Timeline area */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-auto"
                        onScroll={handleScroll}
                    >
                        <div style={{ width: totalDays * dayWidth }}>
                            {/* Timeline header */}
                            <TimelineHeader
                                startDate={dateRange.start}
                                days={totalDays}
                                dayWidth={dayWidth}
                                scrollLeft={scrollLeft}
                            />

                            {/* Gantt bars area */}
                            <div className="relative">
                                {/* Grid lines */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {Array.from({ length: totalDays }, (_, i) => {
                                        const date = new Date(dateRange.start);
                                        date.setDate(date.getDate() + i);
                                        const today = isToday(date);
                                        const weekend = isWeekend(date);

                                        return (
                                            <div
                                                key={i}
                                                className={`absolute top-0 bottom-0 border-r ${today ? "border-blue-500/50 bg-blue-500/5" :
                                                        weekend ? "bg-foreground/[0.02]" : ""
                                                    } border-foreground/5`}
                                                style={{ left: i * dayWidth, width: dayWidth }}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Dependency lines SVG */}
                                <svg
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ width: totalDays * dayWidth, height: rowIndex * rowHeight }}
                                >
                                    <defs>
                                        <marker
                                            id="arrowhead"
                                            markerWidth="6"
                                            markerHeight="6"
                                            refX="5"
                                            refY="3"
                                            orient="auto"
                                        >
                                            <path d="M0,0 L6,3 L0,6 Z" fill="#6b7280" />
                                        </marker>
                                    </defs>

                                    {projects.map(project =>
                                        !collapsedProjects.has(project.id) &&
                                        project.tasks.map(task =>
                                            task.dependencies.map(depId => {
                                                const depTask = project.tasks.find(t => t.id === depId);
                                                if (!depTask) return null;
                                                return (
                                                    <DependencyLine
                                                        key={`${depId}-${task.id}`}
                                                        fromTask={depTask}
                                                        toTask={task}
                                                        startDate={dateRange.start}
                                                        dayWidth={dayWidth}
                                                        rowHeight={rowHeight}
                                                        taskRowMap={taskRowMap}
                                                    />
                                                );
                                            })
                                        )
                                    )}
                                </svg>

                                {/* Task bars */}
                                {projects.map(project => (
                                    <div key={project.id}>
                                        {!collapsedProjects.has(project.id) ? (
                                            project.tasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    className="relative h-10 border-b border-foreground/5"
                                                >
                                                    <GanttBar
                                                        task={task}
                                                        startDate={dateRange.start}
                                                        dayWidth={dayWidth}
                                                        projectColor={project.color}
                                                        onTaskClick={setSelectedTask}
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-10 border-b border-foreground/5" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-3 rounded bg-emerald-500/50 border-2 border-emerald-500" />
                        <span className="text-foreground/60">Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-3 rounded bg-blue-500/50 border-2 border-blue-500" />
                        <span className="text-foreground/60">In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-3 rounded bg-gray-500/50 border-2 border-gray-500" />
                        <span className="text-foreground/60">Not Started</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-purple-500"><DiamondIcon /></div>
                        <span className="text-foreground/60">Milestone</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-6 h-3">
                            <line x1="0" y1="6" x2="24" y2="6" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4,2" />
                        </svg>
                        <span className="text-foreground/60">Dependency</span>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
